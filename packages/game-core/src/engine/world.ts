import {
  CONTENT_VERSION,
  getMap,
  getItem,
  skills,
  monsters,
  npcs,
  quests,
  items,
  getSect,
  startingLoadout,
  getClassSkills,
  resourceNodes,
  isEquipment,
} from "../../../game-content/src/index";
import type {
  CombatEntity,
  GameSnapshot,
  GameEvent,
  GameCommand,
  CommandEnvelope,
  Vec2,
  Attributes,
  CharacterProgress,
} from "../../../game-protocol/src/index";
import { SeededRandom } from "./random";
import {
  findPath,
  distance,
  isWalkable,
  hasLineOfSight,
} from "../world/navigation";
import { deriveStats, experienceForLevel } from "../combat/formulas";
import { addItem, canAddItem, INVENTORY_CAPACITY } from "../inventory/items";
import { CombatRuntime } from "../combat/runtime";
import {
  characterBonuses,
  directionFromDelta,
  isDisabled,
  setAnimation,
  statusValue,
  respecCost,
} from "../combat/stats";
import { EconomyTransactions } from "../economy/transactions";
import { updateMonster } from "../ai/brain";
import { rollAffixes, rollLoot } from "../inventory/loot";
import { commandEnvelopeSchema } from "../../../game-protocol/src/index";
import {
  admitGroundLoot,
  rarityPriority,
  updateLootPools,
} from "../world/loot-pool";
import { EntitySpatialIndex, simulationTier } from "../world/regions";
import { updateSpawnRegions, zoneRespawnDelay } from "../world/spawns";
import { projectView } from "../world/projection";
export const TICK_RATE = 20;
const BASE_ATTRIBUTES = { strength: 8, dexterity: 7, vitality: 9, energy: 8 };
export function createGame(
  name = "Vô Danh",
  classId = "wudang",
  characterId = "wanderer",
  seed = 71227,
  appearance: "male" | "female" = "male",
): GameSnapshot {
  const sect = getSect(classId),
    hotbar = startingLoadout(classId),
    stats = deriveStats(
      1,
      BASE_ATTRIBUTES,
      { attack: 8, defense: 0 },
      sect.preferredStat,
    );
  const p: CombatEntity = {
    id: `player:${characterId}`,
    kind: "player",
    definitionId: classId,
    name,
    mapId: "village",
    level: 1,
    x: 14,
    y: 14,
    spawn: { x: 14, y: 14 },
    ...stats,
    hp: stats.maxHp,
    mp: stats.maxMp,
    element: sect.element,
    path: [],
    state: "idle",
    stateStartedAt: 0,
    stateUntil: 0,
    direction: 1,
    statuses: [],
    casting: null,
    brain: "idle",
    threat: {},
    attackRange: ["tangmen", "wudu", "kunlun"].includes(classId) ? 5 : 1.65,
    attackInterval: 18,
    movementSpeed: 3.4,
    nextSkillTick: 0,
    targetId: null,
    cooldowns: {},
    respawnAt: 0,
    nextAttack: 0,
    phase: 0,
    facing: 1,
    autoAttack: false,
  };
  const skillLevels: Record<string, number> = { slash: 1 };
  for (const id of hotbar) {
    const d = skills.find((d) => d.id === id)!;
    skillLevels[id] = d.requiredLevel <= 1 ? 1 : 0;
  }
  const s: GameSnapshot = {
    schemaVersion: 2,
    playedTicks: 0,
    contentVersion: CONTENT_VERSION,
    characterId,
    playerId: p.id,
    tick: 0,
    rngState: seed,
    nextId: 10,
    mapId: "village",
    entities: { [p.id]: p },
    groundLoot: {},
    deferredLoot: {},
    lootMetrics: { expired: 0, rejected: 0, commonReplaced: 0 },
    name,
    classId,
    appearance,
    level: 1,
    experience: 0,
    attributes: { ...BASE_ATTRIBUTES },
    attributePoints: 0,
    skillPoints: 0,
    skillLevels,
    inventory: [
      { id: characterId + ":hp", definitionId: "hp", quantity: 8 },
      { id: characterId + ":mp", definitionId: "mp", quantity: 5 },
      { id: characterId + ":robe", definitionId: "robe", quantity: 1 },
    ],
    equipment: {
      weapon: {
        id: characterId + ":sword",
        definitionId: "sword",
        quantity: 1,
      },
    },
    quests: [],
    gold: 180,
    settings: { sound: true, music: false, effects: "high", fps: 60 },
    pendingInteraction: null,
    branchId: sect.branches[0].id,
    hotbar,
    warehouse: [],
    professionXp: {},
    autoCombat: {
      pickup: false,
      lootRarity: "all",
      stopWhenFull: true,
      rotation: false,
      potions: false,
      hpThreshold: 0.35,
      mpThreshold: 0.2,
      stopHp: 0.1,
      range: 9,
    },
    enhanceLog: [],
    actors: {},
    visitedMaps: [],
    projectiles: [],
    telegraphs: [],
    nextWorldId: 1,
    paused: false,
    worldClock: { timeTicks: 0, weather: "clear", nextWeatherAt: 2400 },
    resources: {},
    spawnRegions: {},
  };
  populateMap(s);
  return s;
}
export function spawnMonster(
  s: GameSnapshot,
  definitionId: string,
  mapId: string,
  x: number,
  y: number,
  id = `${mapId}:${definitionId}:${s.nextWorldId++}`,
): CombatEntity {
  const d = monsters.find((m) => m.id === definitionId);
  if (!d) throw new Error(`Quái không tồn tại: ${definitionId}`);
  const entity: CombatEntity = {
    id,
    kind: "monster",
    definitionId: d.id,
    name: d.name,
    mapId,
    level: d.level,
    x,
    y,
    spawn: { x, y },
    hp: d.hp,
    mp: 20 + d.level * 6,
    maxHp: d.hp,
    maxMp: 20 + d.level * 6,
    attack: d.attack,
    defense: d.defense,
    element: d.element,
    path: [],
    state: "idle",
    stateStartedAt: s.tick,
    stateUntil: 0,
    direction: 3,
    statuses: [],
    casting: null,
    brain: "idle",
    threat: {},
    attackRange: d.range,
    attackInterval: d.brain === "boss" ? 32 : 40,
    movementSpeed: d.speed,
    nextSkillTick: s.tick + 80,
    targetId: null,
    cooldowns: {},
    respawnAt: 0,
    nextAttack: 0,
    phase: 0,
    facing: -1,
    autoAttack: false,
  };
  s.entities[id] = entity;
  return entity;
}
function populateMap(s: GameSnapshot, mapId = s.mapId) {
  if (!s.visitedMaps.includes(mapId)) s.visitedMaps.push(mapId);
  getMap(mapId).spawns.forEach((spawn, i) => {
    const id = `${mapId}:${spawn.monsterId}:${i}`;
    if (!s.entities[id])
      spawnMonster(s, spawn.monsterId, mapId, spawn.x, spawn.y, id);
  });
}
const progressKeys = [
  "playedTicks",
  "characterId",
  "nextId",
  "name",
  "classId",
  "appearance",
  "level",
  "experience",
  "attributes",
  "attributePoints",
  "skillPoints",
  "skillLevels",
  "inventory",
  "equipment",
  "warehouse",
  "quests",
  "gold",
  "settings",
  "pendingInteraction",
  "branchId",
  "hotbar",
  "professionXp",
  "autoCombat",
  "enhanceLog",
] as const;
function extractProgress(s: GameSnapshot) {
  const result = {} as CharacterProgress;
  for (const key of progressKeys)
    if (s[key] !== undefined)
      Object.assign(result, { [key]: structuredClone(s[key]) });
  return result;
}
export class GameWorld {
  public state: GameSnapshot;
  private random: SeededRandom;
  private events: GameEvent[] = [];
  private lastSequence = new Map<string, number>();
  private eventId = 0;
  private allowPause: boolean;
  private combat: CombatRuntime;
  private economy: EconomyTransactions;
  private entityIndex = new EntitySpatialIndex();
  public diagnostics = {
    active: 0,
    nearby: 0,
    inactive: 0,
    aiUpdated: 0,
    spawned: 0,
    deferred: 0,
    checks: 0,
  };
  constructor(state: GameSnapshot, options: { allowPause?: boolean } = {}) {
    this.allowPause = options.allowPause ?? true;
    this.state = structuredClone(state);
    this.state.groundLoot ??= {};
    this.state.deferredLoot ??= {};
    this.state.lootMetrics ??= { expired: 0, rejected: 0, commonReplaced: 0 };
    this.state.spawnRegions ??= {};
    for (const mapId of [...this.state.visitedMaps])
      populateMap(this.state, mapId);
    if (!this.allowPause) this.state.paused = false;
    this.random = new SeededRandom(state.rngState);
    this.entityIndex.rebuild(this.state.entities);
    this.combat = new CombatRuntime({
      state: this.state,
      random: this.random,
      progress: (e) => this.progress(e),
      emit: (type, text, data) => this.emit(type, text, data),
      die: (target, killer) => this.die(target, killer),
    });
    this.economy = new EconomyTransactions({
      state: this.state,
      nearNpc: (actor, id) => this.nearNpc(actor, id),
      random: () => this.random.next(),
      emit: (type, text, data) => this.emit(type, text, data),
      objective: (actor, kind, target, amount) =>
        this.advanceObjective(actor, kind, target, amount),
    });
  }
  progress(actor: CombatEntity): CharacterProgress | null {
    return actor.kind === "player"
      ? actor.id === this.state.playerId
        ? this.state
        : (this.state.actors[actor.id] ?? null)
      : null;
  }
  addPlayer(snapshot: GameSnapshot) {
    const source = snapshot.entities[snapshot.playerId];
    if (
      this.state.entities[source.id] ||
      snapshot.characterId === this.state.characterId ||
      Object.values(this.state.actors).some(
        (p) => p.characterId === snapshot.characterId,
      )
    )
      throw new Error("Nhân vật đã có trong world.");
    this.state.entities[source.id] = structuredClone(source);
    this.state.actors[source.id] = extractProgress(snapshot);
    populateMap(this.state, source.mapId);
    this.entityIndex.rebuild(this.state.entities);
    return source.id;
  }
  get player() {
    return this.state.entities[this.state.playerId];
  }
  /** Snapshot authority đầy đủ (lưu/kiểm thử). Không dùng cho vòng publish 20Hz. */
  snapshot(): GameSnapshot {
    return structuredClone(this.state);
  }
  /**
   * Snapshot cho client: chỉ bản đồ đang có người chơi, kèm `worldTotals`.
   * Dormant data vẫn nằm trong authority và không bị thay đổi bởi view.
   */
  viewSnapshot(viewerId = this.state.playerId): GameSnapshot {
    return projectView(this.state, viewerId);
  }
  drainEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }
  private emit(
    type: GameEvent["type"],
    text: string,
    data: Partial<GameEvent> = {},
  ) {
    this.events.push({
      id: ++this.eventId,
      tick: this.state.tick,
      type,
      text,
      ...data,
    });
  }
  private error(text: string) {
    this.emit("error", text);
  }
  dispatch(envelope: CommandEnvelope) {
    const parsed = commandEnvelopeSchema.safeParse(envelope);
    if (!parsed.success) {
      this.error("Lệnh không hợp lệ hoặc phiên bản giao thức không hỗ trợ.");
      return;
    }
    envelope = parsed.data;
    if (
      envelope.protocolVersion !== 1 ||
      envelope.sequence <= (this.lastSequence.get(envelope.actorId) ?? 0)
    )
      return;
    const actor = this.state.entities[envelope.actorId];
    if (!actor || actor.kind !== "player") return;
    this.lastSequence.set(actor.id, envelope.sequence);
    this.command(actor, envelope.command);
    this.state.rngState = this.random.state;
  }
  private command(p: CombatEntity, c: GameCommand) {
    const s = this.progress(p);
    if (!s) return;
    if (c.type === "pause") {
      if (p.id === this.state.playerId && this.allowPause)
        this.state.paused = c.paused;
      return;
    }
    if (c.type === "selectTarget") {
      const target = c.targetId ? this.state.entities[c.targetId] : null;
      if (!target || this.hostile(p, target)) p.targetId = target?.id ?? null;
      return;
    }
    if (c.type === "configureAuto") {
      const next = { ...s.autoCombat, ...c.settings };
      if (
        [next.hpThreshold, next.mpThreshold, next.stopHp].some(
          (v) => !Number.isFinite(v) || v < 0 || v > 1,
        ) ||
        next.range < 2 ||
        next.range > 12
      )
        return;
      s.autoCombat = next;
      return;
    }
    if (c.type === "settings") {
      s.settings = { ...s.settings, ...c.settings };
      return;
    }
    if (c.type === "respawn") {
      if (p.hp > 0) return;
      this.respawn(p);
      return;
    }
    if (p.hp <= 0) {
      this.error("Bạn đã trọng thương. Hãy hồi sinh tại thôn.");
      return;
    }
    if (c.type === "steer") {
      if (isDisabled(p)) return;
      const length = Math.hypot(c.direction.x, c.direction.y);
      p.movementInput =
        length > 0.01
          ? {
              x: c.direction.x / Math.max(1, length),
              y: c.direction.y / Math.max(1, length),
            }
          : null;
      p.cooldowns.steerExpiresAt = this.state.tick + 6;
      p.path = [];
      p.autoAttack = false;
      s.pendingInteraction = null;
      return;
    }
    if (c.type === "move") {
      p.movementInput = null;
      if (
        !Number.isFinite(c.destination.x) ||
        !Number.isFinite(c.destination.y)
      )
        return;
      if (isDisabled(p)) {
        this.error("Đang bị khống chế, không thể di chuyển.");
        return;
      }
      this.combat.interrupt(p);
      const path = findPath(getMap(p.mapId), p, c.destination);
      p.autoAttack = false;
      p.targetId = null;
      s.pendingInteraction = null;
      if (path.length) {
        p.path = path;
        setAnimation(p, "walk", this.state.tick);
      } else {
        p.path = [];
        if (distance(p, c.destination) > 1)
          this.error("Không thể đi đến vị trí này.");
      }
      return;
    }
    if (c.type === "stop") {
      p.movementInput = null;
      p.path = [];
      this.combat.interrupt(p);
      p.autoAttack = false;
      s.pendingInteraction = null;
      return;
    }
    if (c.type === "pickup") {
      this.pickup(p, c.lootId);
      return;
    }
    if (c.type === "attack") {
      p.movementInput = null;
      const target = this.state.entities[c.targetId];
      if (!this.hostile(p, target)) return;
      p.targetId = c.targetId;
      p.autoAttack = true;
      return;
    }
    if (c.type === "autoAttack") {
      p.movementInput = null;
      p.autoAttack = c.enabled;
      p.farmAnchor = c.enabled ? { x: p.x, y: p.y } : null;
      if (!c.enabled) {
        p.targetId = null;
        p.path = [];
      }
      this.emit(
        "message",
        c.enabled ? "Tự động chiến đấu đã bật." : "Tự động chiến đấu đã tắt.",
      );
      return;
    }
    if (c.type === "skill") {
      this.useSkill(p, c.skillId, c.targetId);
      return;
    }
    if (c.type === "branch") {
      const branch = getSect(s.classId).branches.find(
        (b) => b.id === c.branchId,
      );
      if (!branch) return;
      s.branchId = branch.id;
      s.hotbar = startingLoadout(s.classId, branch.id);
      for (const id of s.hotbar) {
        const d = skills.find((d) => d.id === id)!;
        if (d.requiredLevel === 1)
          s.skillLevels[id] = Math.max(1, s.skillLevels[id] ?? 0);
      }
      this.combat.interrupt(p);
      this.recalculate(p);
      this.emit("message", `Đã chuyển sang ${branch.name}.`, {
        entityId: p.id,
      });
      return;
    }
    if (c.type === "bindSkill") {
      const d = getClassSkills(s.classId, s.branchId).find(
        (d) => d.id === c.skillId,
      );
      if (
        !d ||
        d.kind === "passive" ||
        !s.skillLevels[d.id] ||
        c.slot < 0 ||
        c.slot >= 4 ||
        !Number.isInteger(c.slot)
      )
        return;
      const previous = s.hotbar.indexOf(d.id);
      if (previous >= 0) s.hotbar[previous] = s.hotbar[c.slot];
      s.hotbar[c.slot] = d.id;
      return;
    }
    if (c.type === "resetStats") {
      const cost = respecCost(s.level);
      if (s.gold < cost) {
        this.error(`Cần ${cost} bạc để tẩy tiềm năng.`);
        return;
      }
      s.gold -= cost;
      s.attributes = { ...BASE_ATTRIBUTES };
      s.attributePoints = (s.level - 1) * 5;
      this.recalculate(p);
      return;
    }
    if (c.type === "gather") {
      const node = resourceNodes.find(
        (n) => n.id === c.nodeId && n.mapId === p.mapId,
      );
      if (node && distance(p, node) > 2) {
        p.autoAttack = false;
        p.path = findPath(getMap(p.mapId), p, node);
        if (p.path.length) s.pendingInteraction = `resource:${node.id}`;
        else this.error("Không tìm được đường tới tài nguyên.");
        return;
      }
    }
    if (this.economy.execute(p, s, c)) {
      this.recalculate(p);
      return;
    }
    if (c.type === "interact") {
      const portal = getMap(p.mapId).portals.find(
        (i) => `portal:${i.id}` === c.targetId,
      );
      const npc = npcs.find((i) => i.id === c.targetId && i.mapId === p.mapId);
      const target = portal ?? npc;
      if (!target) {
        const distantNpc = npcs.find((i) => i.id === c.targetId);
        if (distantNpc)
          this.error(
            `${distantNpc.name} đang ở ${getMap(distantNpc.mapId).name}. Mở bản đồ để tìm cổng trở về.`,
          );
        return;
      }
      p.autoAttack = false;
      p.targetId = null;
      if (distance(p, target) > 2) {
        let destination = { x: target.x, y: target.y };
        if (!isWalkable(getMap(p.mapId), destination))
          destination = { x: target.x + 1, y: target.y + 1 };
        p.path = findPath(getMap(p.mapId), p, destination);
        if (!p.path.length) {
          this.error("Không tìm được đường tới nơi.");
          return;
        }
        s.pendingInteraction = c.targetId;
        this.emit("message", `Đang đi tới ${target.name}…`);
      } else if (portal) {
        this.changeMap(p, portal.to, portal.destination);
      } else if (npc) {
        s.pendingInteraction = null;
        setAnimation(p, "interact", this.state.tick, 15);
        this.advanceObjective(p, "talk", npc.id);
        this.emit("dialogue", npc.dialogue, { entityId: npc.id });
      }
      return;
    }
    if (c.type === "acceptQuest") {
      const q = quests.find((q) => q.id === c.questId);
      if (
        !q ||
        s.quests.some(
          (a) =>
            a.id === q.id &&
            !(
              q.repeatTicks > 0 &&
              a.status === "claimed" &&
              this.state.tick - (a.lastClaimTick ?? 0) >= q.repeatTicks
            ),
        ) ||
        (q.requires &&
          !s.quests.some((a) => a.id === q.requires && a.status === "claimed"))
      )
        return;
      if (!this.nearNpc(p, q.npc)) {
        this.error("Hãy đến gặp Lão trưởng thôn.");
        return;
      }
      const existing = s.quests.find((a) => a.id === q.id);
      if (existing) {
        existing.status = "active";
        existing.progress = 0;
      } else
        s.quests.push({
          id: q.id,
          status: "active",
          progress: 0,
          completions: 0,
        });
      this.emit("message", `Đã nhận nhiệm vụ: ${q.name}`);
      return;
    }
    if (c.type === "claimQuest") {
      const q = quests.find((q) => q.id === c.questId),
        progress = s.quests.find((q) => q.id === c.questId);
      if (!q || progress?.status !== "ready") return;
      if (!this.nearNpc(p, q.npc)) {
        this.error("Hãy trở về gặp Lão trưởng thôn để nhận thưởng.");
        return;
      }
      if (!canAddItem(s, q.rewardItem)) {
        this.error("Hành trang đã đầy.");
        return;
      }
      progress.status = "claimed";
      progress.completions = (progress.completions ?? 0) + 1;
      progress.lastClaimTick = this.state.tick;
      s.gold += q.gold;
      addItem(s, q.rewardItem);
      this.gainExperience(p, q.exp);
      this.emit(
        "loot",
        `Hoàn thành ${q.name}: +${q.gold} bạc, +${q.exp} kinh nghiệm và ${getItem(q.rewardItem).name}.`,
      );
      return;
    }
    if (c.type === "useItem") {
      const instance = s.inventory.find((i) => i.id === c.instanceId);
      if (!instance) return;
      const d = getItem(instance.definitionId);
      if (!d.restore) return;
      if ((p.cooldowns.potion ?? 0) > this.state.tick) {
        this.error("Đan dược đang hồi chiêu.");
        return;
      }
      const field = d.restore,
        max = d.restore === "hp" ? p.maxHp : p.maxMp;
      if (p[field] >= max) {
        this.error(d.restore === "hp" ? "Sinh lực đã đầy." : "Nội lực đã đầy.");
        return;
      }
      p[field] = Math.min(max, p[field] + Math.round(max * 0.55));
      p.cooldowns.potion = this.state.tick + 60;
      instance.quantity--;
      if (!instance.quantity)
        s.inventory = s.inventory.filter((i) => i.id !== instance.id);
      this.emit("heal", `Đã dùng ${d.name}.`, { entityId: p.id });
      return;
    }
    if (c.type === "equip") {
      const instance = s.inventory.find((i) => i.id === c.instanceId);
      if (!instance) return;
      const d = getItem(instance.definitionId);
      if (!isEquipment(d.kind)) return;
      const requirement = d.requiredLevel ?? d.level;
      if (s.level < requirement) {
        this.error(`Cần đạt cấp ${requirement}.`);
        return;
      }
      const old = s.equipment[d.kind];
      s.inventory = s.inventory.filter((i) => i.id !== instance.id);
      if (old) s.inventory.push(old);
      s.equipment[d.kind] = instance;
      this.advanceObjective(p, "equip", d.id);
      this.recalculate(p);
      this.emit("message", `Đã trang bị ${d.name}.`);
      return;
    }
    if (c.type === "unequip") {
      if (!s.equipment[c.slot]) return;
      if (s.inventory.length >= INVENTORY_CAPACITY) {
        this.error("Hành trang đã đầy.");
        return;
      }
      s.inventory.push(s.equipment[c.slot]);
      delete s.equipment[c.slot];
      this.recalculate(p);
      return;
    }
    if (c.type === "buy") {
      const d = items.find((i) => i.id === c.itemId);
      if (!d || d.id === "boss-sword") return;
      if (!this.nearNpc(p, d.kind === "consumable" ? "merchant" : "smith")) {
        this.error("Hãy đến gần thương nhân để mua đồ.");
        return;
      }
      if (s.gold < d.price) {
        this.error("Không đủ bạc.");
        return;
      }
      if (!canAddItem(s, d.id)) {
        this.error("Hành trang đã đầy.");
        return;
      }
      s.gold -= d.price;
      addItem(s, d.id);
      this.emit("loot", `Đã mua ${d.name}.`);
      return;
    }
    if (c.type === "sell") {
      if (!this.nearNpc(p, "merchant") && !this.nearNpc(p, "smith")) {
        this.error("Hãy đến gặp thương nhân để bán đồ.");
        return;
      }
      const i = s.inventory.find((i) => i.id === c.instanceId);
      if (!i) return;
      if (i.locked) {
        this.error("Vật phẩm đang khóa bảo vệ.");
        return;
      }
      s.gold += Math.max(1, Math.floor(getItem(i.definitionId).price / 3));
      if (--i.quantity === 0)
        s.inventory = s.inventory.filter((n) => n.id !== i.id);
      this.emit("message", "Đã bán một vật phẩm.");
      return;
    }
    if (c.type === "allocate") {
      if (s.attributePoints <= 0 || !Object.hasOwn(s.attributes, c.attribute))
        return;
      s.attributes[c.attribute]++;
      s.attributePoints--;
      this.recalculate(p);
      return;
    }
    if (c.type === "learn") {
      const d = skills.find((d) => d.id === c.skillId),
        level = s.skillLevels[c.skillId] ?? 0;
      if (
        !d ||
        !getClassSkills(s.classId).some((skill) => skill.id === d.id) ||
        s.skillPoints <= 0 ||
        s.level < d.requiredLevel ||
        level >= d.maxLevel
      )
        return;
      s.skillLevels[c.skillId] = level + 1;
      s.skillPoints--;
      this.recalculate(p);
      this.emit("message", `${d.name} đạt cấp ${level + 1}.`);
      return;
    }
  }
  /**
   * NPC phục vụ theo `service` để tiền tiêu mới cũng có thợ rèn/thương nhân/kho,
   * không phải chỉ Tân Thủ Thôn. NPC không khai báo `service` vẫn khớp theo id.
   */
  private nearNpc(actor: CombatEntity, id: string) {
    return npcs.some(
      (n) =>
        (n.id === id || n.service === id) &&
        n.mapId === actor.mapId &&
        distance(n, actor) <= 2.5,
    );
  }
  private hostile(
    a: CombatEntity,
    b: CombatEntity | undefined,
  ): b is CombatEntity {
    return this.combat.hostile(a, b);
  }
  private nearest(p: CombatEntity, range = 9) {
    return this.combat.nearest(p, range);
  }
  private useSkill(p: CombatEntity, id: string, targetId?: string) {
    return this.combat.useSkill(p, id, targetId);
  }
  private advanceObjective(
    actor: CombatEntity,
    kind: string,
    target: string,
    amount = 1,
  ) {
    const p = this.progress(actor);
    if (!p) return;
    for (const q of p.quests) {
      const d = quests.find((d) => d.id === q.id);
      if (
        !d ||
        q.status !== "active" ||
        (d.mapId && d.mapId !== actor.mapId) ||
        d.objectiveKind !== kind ||
        (d.target !== target && kind !== "level")
      )
        continue;
      q.progress = Math.min(d.count, q.progress + amount);
      if (q.progress >= d.count) {
        q.status = "ready";
        this.emit(
          "message",
          `Nhiệm vụ ${d.name} đã hoàn thành. Trở về ${npcs.find((n) => n.id === d.npc)?.name ?? "NPC"} để nhận thưởng.`,
          { entityId: actor.id },
        );
      }
    }
  }
  private die(t: CombatEntity, killer: CombatEntity) {
    setAnimation(t, "dead", this.state.tick);
    t.brain = "dead";
    t.path = [];
    t.autoAttack = false;
    t.targetId = null;
    t.casting = null;
    t.statuses = [];
    this.emit("death", `${t.name} đã gục ngã.`, {
      entityId: t.id,
      targetId: killer.id,
    });
    if (t.kind === "player") {
      t.respawnAt = this.state.tick + 100;
      return;
    }
    const d = monsters.find((m) => m.id === t.definitionId)!;
    t.respawnAt = t.id.includes(":summon:") ? 0 : this.state.tick + d.respawn;
    const spawnZone = getMap(t.mapId).spawnZones?.find(
      (z) => z.id === t.spawnZoneId,
    );
    if (spawnZone)
      t.respawnAt = this.state.tick + zoneRespawnDelay(spawnZone, this.random);
    if (!t.respawnAt) t.stateUntil = this.state.tick + 80;
    const owner = this.progress(killer);
    if (!owner) return;
    const experience = Math.round(
      d.exp * (1 + Math.max(0, t.level - d.level) * 0.12) * (t.elite ? 1.6 : 1),
    );
    this.gainExperience(killer, experience);
    this.emit(
      "loot",
      `Đánh bại ${t.name} · +${experience} kinh nghiệm · ${d.gold} bạc rơi trên đất`,
      { entityId: killer.id },
    );
    const drops = rollLoot(d.loot, () => this.random.next());
    for (let i = 0; i <= drops.length; i++) {
      const drop = drops[i - 1];
      if (!drop && !d.gold) continue;
      const angle = i * 2.4,
        radius = 0.3 + i * 0.16;
      const position = {
        x: t.x + Math.cos(angle) * radius,
        y: t.y + Math.sin(angle) * radius,
      };
      const point = isWalkable(getMap(t.mapId), position)
        ? position
        : { x: t.x, y: t.y };
      let id: string;
      do {
        id = `loot:${this.state.nextWorldId++}`;
      } while (this.state.groundLoot[id] || this.state.deferredLoot[id]);
      const affixes = drop
        ? rollAffixes(drop.itemId, () => this.random.next())
        : [];
      const admission = admitGroundLoot(this.state, {
        ...point,
        id,
        mapId: t.mapId,
        ownerId: killer.id,
        item: drop
          ? {
              id: `${owner.characterId}:item:${owner.nextId++}`,
              definitionId: drop.itemId,
              quantity: 1,
              ...(affixes.length ? { affixes } : {}),
            }
          : null,
        gold: drop ? 0 : d.gold,
        createdAt: this.state.tick,
        expiresAt: this.state.tick + 12000,
      });
      if (admission === "rejected")
        this.error(
          "Bãi quái hoặc kho loot đã đạt giới hạn (64/vùng, 512 hiển thị, 2.048 dự trữ). Không thể giữ thêm đồ rơi; hãy nhặt bớt hoặc chờ hết hạn.",
        );
      else if (admission === "replaced-common")
        this.emit(
          "message",
          "Kho loot vùng đầy: thu hồi một đồ thường cũ để giữ vật phẩm có phẩm chất cao hơn.",
          { entityId: killer.id },
        );
    }
    this.advanceObjective(killer, "kill", d.id);
  }
  private pickup(actor: CombatEntity, lootId: string, automatic = false) {
    const loot = this.state.groundLoot[lootId],
      progress = this.progress(actor);
    if (
      !loot ||
      !progress ||
      loot.ownerId !== actor.id ||
      loot.mapId !== actor.mapId ||
      loot.expiresAt <= this.state.tick
    )
      return;
    actor.movementInput = null;
    if (
      loot.item &&
      !canAddItem(progress, loot.item.definitionId, loot.item.quantity)
    ) {
      if (automatic && progress.autoCombat.stopWhenFull) {
        actor.autoAttack = false;
        actor.path = [];
        progress.pendingInteraction = null;
      }
      this.error("Hành trang đầy. Vật phẩm vẫn ở trên đất.");
      return;
    }
    if (
      distance(actor, loot) > 1.8 ||
      !hasLineOfSight(getMap(actor.mapId), actor, loot)
    ) {
      const path = findPath(getMap(actor.mapId), actor, loot);
      if (!path.length) return;
      if (!automatic) actor.autoAttack = false;
      actor.path = path;
      progress.pendingInteraction = `pickup:${loot.id}`;
      return;
    }
    if (loot.item) {
      if (getItem(loot.item.definitionId).stack === 1)
        progress.inventory.push(structuredClone(loot.item));
      else addItem(progress, loot.item.definitionId, loot.item.quantity);
      this.advanceObjective(
        actor,
        "collect",
        loot.item.definitionId,
        loot.item.quantity,
      );
    } else progress.gold += loot.gold;
    delete this.state.groundLoot[loot.id];
    actor.path = [];
    progress.pendingInteraction = null;
    this.emit(
      "loot",
      `Nhặt được ${loot.item ? getItem(loot.item.definitionId).name : `${loot.gold} bạc`}`,
      { entityId: actor.id, position: { x: loot.x, y: loot.y } },
    );
  }
  private gainExperience(actor: CombatEntity, amount: number) {
    const p = this.progress(actor);
    if (!p) return;
    p.experience += amount;
    while (p.level < 100 && p.experience >= experienceForLevel(p.level)) {
      p.experience -= experienceForLevel(p.level);
      p.level++;
      p.attributePoints += 5;
      p.skillPoints++;
      actor.level = p.level;
      this.recalculate(actor);
      actor.hp = actor.maxHp;
      actor.mp = actor.maxMp;
      this.advanceObjective(actor, "level", String(p.level));
      this.emit("level", `Đột phá! Bạn đã đạt cấp ${p.level}.`, {
        entityId: actor.id,
        value: p.level,
      });
    }
  }
  private recalculate(actor: CombatEntity) {
    const p = this.progress(actor);
    if (!p) return;
    const bonuses = characterBonuses(p);
    const stats = deriveStats(
      p.level,
      p.attributes,
      bonuses,
      getSect(p.classId).preferredStat,
    );
    stats.maxHp += bonuses.maxHp;
    stats.maxMp += bonuses.maxMp;
    Object.assign(actor, stats);
    actor.hp = Math.min(actor.hp, actor.maxHp);
    actor.mp = Math.min(actor.mp, actor.maxMp);
    actor.attackRange =
      ["tangmen", "wudu"].includes(p.classId) ||
      (p.classId === "kunlun" && p.branchId === "thunder") ||
      (p.classId === "cuiyan" && p.branchId === "ice")
        ? 5
        : 1.65;
  }
  private respawn(p: CombatEntity) {
    if (p.kind === "player") {
      this.changeMap(p, "village", { x: 14, y: 14 });
      p.hp = p.maxHp;
      p.mp = p.maxMp;
      this.emit("message", "Đã hồi sinh tại Tân Thủ Thôn.", { entityId: p.id });
    } else {
      p.hp = p.maxHp;
      p.mp = p.maxMp;
      p.x = p.spawn.x;
      p.y = p.spawn.y;
    }
    p.statuses = [];
    p.casting = null;
    p.threat = {};
    p.brain = "idle";
    p.targetId = null;
    p.respawnAt = 0;
    p.phase = 0;
    p.nextSkillTick = this.state.tick + 80;
    p.path = [];
    setAnimation(p, "revive", this.state.tick, 16);
  }
  private changeMap(actor: CombatEntity, mapId: string, destination: Vec2) {
    const progress = this.progress(actor);
    if (!progress) return;
    getMap(mapId);
    if (actor.id === this.state.playerId) this.state.mapId = mapId;
    actor.mapId = mapId;
    actor.x = destination.x;
    actor.y = destination.y;
    actor.spawn = { ...destination };
    actor.path = [];
    actor.targetId = null;
    actor.autoAttack = false;
    actor.casting = null;
    progress.pendingInteraction = null;
    populateMap(this.state, mapId);
    this.entityIndex.rebuild(this.state.entities);
    this.advanceObjective(actor, "explore", mapId);
    this.emit("map", `Đã đến ${getMap(mapId).name}.`, {
      entityId: actor.id,
      targetId: mapId,
    });
  }
  step() {
    const s = this.state;
    if (s.paused) return;
    s.tick++;
    updateLootPools(
      s,
      Object.values(s.entities).filter((e) => e.kind === "player"),
    );
    for (const actor of Object.values(s.entities)) {
      const progress = this.progress(actor);
      if (progress) progress.playedTicks = (progress.playedTicks ?? 0) + 1;
    }
    s.worldClock.timeTicks++;
    if (s.tick >= s.worldClock.nextWeatherAt) {
      s.worldClock.weather = (["clear", "rain", "mist"] as const)[
        Math.floor(this.random.next() * 3)
      ];
      s.worldClock.nextWeatherAt = s.tick + 2400;
    }
    if (s.tick % 20 === 0)
      for (const actor of Object.values(s.entities))
        if (actor.kind === "player" && actor.hp > 0)
          for (const area of getMap(actor.mapId).areas ?? [])
            if (distance(actor, area) <= area.radius)
              this.advanceObjective(actor, "explore", area.id);
    const players = Object.values(s.entities).filter(
      (e) => e.kind === "player",
    );
    const spawning = updateSpawnRegions(
      s,
      players,
      this.random,
      (id, map, x, y, entityId) => spawnMonster(s, id, map, x, y, entityId),
      (entity) => this.respawn(entity),
    );
    this.entityIndex.rebuild(s.entities);
    this.combat.update();
    this.diagnostics = {
      active: 0,
      nearby: 0,
      inactive: 0,
      aiUpdated: 0,
      ...spawning,
    };
    for (const e of Object.values(s.entities)) {
      if (
        e.hp <= 0 &&
        e.id.includes(":summon:") &&
        e.stateUntil &&
        s.tick >= e.stateUntil
      ) {
        delete s.entities[e.id];
        continue;
      }
      const tier = simulationTier(e, players, s);
      this.diagnostics[tier]++;
      if (tier === "inactive") continue;
      if (e.hp <= 0) {
        if (!e.spawnZoneId && e.respawnAt && s.tick >= e.respawnAt)
          this.respawn(e);
        else if (
          e.id.includes(":summon:") &&
          e.stateUntil &&
          s.tick >= e.stateUntil
        )
          delete s.entities[e.id];
        continue;
      }
      if (
        e.stateUntil <= s.tick &&
        ["attack", "cast", "hit", "revive", "interact"].includes(e.state) &&
        !e.casting
      )
        setAnimation(e, "idle", s.tick);
      if (isDisabled(e)) {
        e.path = [];
        continue;
      }
      if (e.kind === "monster" && (tier === "active" || s.tick % 20 === 0)) {
        this.diagnostics.aiUpdated++;
        updateMonster(e, {
          state: s,
          combat: this.combat,
          random: this.random,
          nearby: (position, radius) =>
            this.entityIndex.query(e.mapId, position, radius),
          emit: (type, text, data) => this.emit(type, text, data),
          spawn: (id, map, x, y, entityId) =>
            spawnMonster(s, id, map, x, y, entityId),
        });
      }
      const progress = this.progress(e);
      if (progress?.pendingInteraction?.startsWith("pickup:")) {
        const loot = s.groundLoot[progress.pendingInteraction.slice(7)];
        if (!loot || loot.mapId !== e.mapId || loot.ownerId !== e.id)
          progress.pendingInteraction = null;
        else if (distance(e, loot) <= 1.8)
          this.pickup(e, loot.id, e.autoAttack);
      }
      if (
        progress &&
        e.autoAttack &&
        progress.autoCombat.pickup &&
        !progress.pendingInteraction &&
        s.tick % 5 === 0
      ) {
        const floor =
          progress.autoCombat.lootRarity === "all"
            ? 1
            : rarityPriority[progress.autoCombat.lootRarity];
        const loot = Object.values(s.groundLoot)
          .filter(
            (l) =>
              l.ownerId === e.id &&
              l.mapId === e.mapId &&
              distance(e.farmAnchor ?? e, l) <= progress.autoCombat.range &&
              (!l.item ||
                rarityPriority[getItem(l.item.definitionId).rarity] >= floor),
          )
          .sort((a, b) => distance(e, a) - distance(e, b))[0];
        if (loot) this.pickup(e, loot.id, true);
      }
      if (progress && e.autoAttack) {
        const config = progress.autoCombat;
        if (config.potions && (e.cooldowns.potion ?? 0) <= s.tick) {
          const potion = progress.inventory.find(
            (i) =>
              i.definitionId ===
              (e.hp / e.maxHp < config.hpThreshold
                ? "hp"
                : e.mp / e.maxMp < config.mpThreshold
                  ? "mp"
                  : "none"),
          );
          if (potion)
            this.command(e, { type: "useItem", instanceId: potion.id });
        }
        if (e.hp / e.maxHp < config.stopHp) {
          e.autoAttack = false;
          e.path = [];
          this.emit("message", "Dừng tự chiến vì sinh lực thấp.", {
            entityId: e.id,
          });
          continue;
        }
        if (!progress.pendingInteraction?.startsWith("pickup:")) {
          let target = e.targetId ? s.entities[e.targetId] : undefined;
          if (
            !this.hostile(e, target) ||
            (target &&
              e.farmAnchor &&
              distance(e.farmAnchor, target) > config.range)
          ) {
            target = Object.values(s.entities)
              .filter(
                (t) =>
                  this.hostile(e, t) &&
                  distance(e, t) <= config.range &&
                  distance(e.farmAnchor ?? e, t) <= config.range,
              )
              .sort((a, b) => distance(e, a) - distance(e, b))[0];
            e.targetId = target?.id ?? null;
          }
          if (target && this.combat.canAct(e)) {
            if (config.rotation && (e.cooldowns.autoDecision ?? 0) <= s.tick) {
              e.cooldowns.autoDecision = s.tick + 10;
              for (const id of progress.hotbar)
                if (this.combat.useSkill(e, id, target.id, true)) break;
            }
            if (distance(e, target) > e.attackRange) {
              if (s.tick % 10 === 0) {
                e.path = findPath(getMap(e.mapId), e, target, 350);
                if (!e.path.length) {
                  e.cooldowns.pathFailures =
                    (e.cooldowns.pathFailures ?? 0) + 1;
                  if (e.cooldowns.pathFailures >= 5) {
                    e.autoAttack = false;
                    this.emit(
                      "error",
                      "Tự chiến dừng vì không tìm được đường.",
                      {
                        entityId: e.id,
                      },
                    );
                  }
                } else e.cooldowns.pathFailures = 0;
              }
            } else this.combat.basic(e, target);
          }
        }
      }
      if (e.movementInput && (e.cooldowns.steerExpiresAt ?? 0) < s.tick)
        e.movementInput = null;
      if (
        e.movementInput &&
        !e.casting &&
        !(e.state === "cast" && e.stateUntil > s.tick)
      ) {
        const input = e.movementInput;
        const step =
          (e.movementSpeed *
            (1 - Math.min(0.8, statusValue(e, "slow"))) *
            (1 + Math.min(0.6, statusValue(e, "haste")))) /
          TICK_RATE;
        const map = getMap(e.mapId);
        const next = { x: e.x + input.x * step, y: e.y + input.y * step };
        const candidates = [next, { x: next.x, y: e.y }, { x: e.x, y: next.y }];
        const point = candidates.find(
          (p, i) =>
            isWalkable(map, p) &&
            hasLineOfSight(map, e, p) &&
            (i !== 0 ||
              (isWalkable(map, candidates[1]) &&
                isWalkable(map, candidates[2]))),
        );
        if (point && distance(e, point) > 0.001) {
          e.direction = directionFromDelta({
            x: point.x - e.x,
            y: point.y - e.y,
          });
          e.x = point.x;
          e.y = point.y;
          setAnimation(e, "walk", s.tick);
        } else if (e.state === "walk") setAnimation(e, "idle", s.tick);
      } else if (
        e.path.length &&
        !e.casting &&
        !(e.state === "cast" && e.stateUntil > s.tick)
      ) {
        const next = e.path[0],
          d = distance(e, next),
          speed =
            e.movementSpeed *
            (1 - Math.min(0.8, statusValue(e, "slow"))) *
            (1 + Math.min(0.6, statusValue(e, "haste"))),
          step = speed / TICK_RATE;
        if (!isWalkable(getMap(e.mapId), next)) {
          e.path = [];
          continue;
        }
        e.facing = next.x - e.x;
        e.direction = directionFromDelta({ x: next.x - e.x, y: next.y - e.y });
        if (d <= step) {
          e.x = next.x;
          e.y = next.y;
          e.path.shift();
        } else {
          e.x += ((next.x - e.x) / d) * step;
          e.y += ((next.y - e.y) / d) * step;
        }
        setAnimation(e, "walk", s.tick);
      } else if (e.state === "walk") setAnimation(e, "idle", s.tick);
      if (progress?.pendingInteraction) {
        const id = progress.pendingInteraction;
        const resource = id.startsWith("resource:")
          ? resourceNodes.find((n) => `resource:${n.id}` === id)
          : null;
        const target =
          resource ??
          npcs.find((n) => n.id === id && n.mapId === e.mapId) ??
          getMap(e.mapId).portals.find((p) => `portal:${p.id}` === id);
        if (target && distance(e, target) <= 1.8) {
          progress.pendingInteraction = null;
          e.path = [];
          this.command(
            e,
            resource
              ? { type: "gather", nodeId: resource.id }
              : { type: "interact", targetId: id },
          );
        }
      }
      if (progress && s.tick % 20 === 0) {
        e.mp = Math.min(e.maxMp, e.mp + 3);
        if (!this.nearest(e, 4)) e.hp = Math.min(e.maxHp, e.hp + 3);
      }
    }
    s.rngState = this.random.state;
  }
}
export type { Attributes };
