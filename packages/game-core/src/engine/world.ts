import {
  CONTENT_VERSION,
  getMap,
  getItem,
  skills,
  monsters,
  npcs,
  quests,
  questTargetLabel,
  elites,
  achievements,
  items,
  getSect,
  startingLoadout,
  getClassSkills,
  resourceNodes,
  isEquipment,
  maps,
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
  AchievementCounters,
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
import { CombatRuntime, MOVE_WHILE_ATTACK_SPEED } from "../combat/runtime";
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
/** Nhịp ra quyết định của tự chiến (ms), không phụ thuộc frame render. */
export const AUTO_COMBAT_TICK_MS = 250;
/** Số tick mô phỏng tương ứng một nhịp quyết định tự chiến. */
const AUTO_COMBAT_TICKS = Math.max(
  1,
  Math.round((AUTO_COMBAT_TICK_MS / 1000) * TICK_RATE),
);
/** Bán kính quét mục tiêu của tự chiến (ô). */
export const AUTO_COMBAT_RANGE = 12;
/** Bán kính nhặt đồ của tự chiến (ô). */
export const AUTO_COMBAT_PICKUP_RANGE = 3;
/** Phí dịch chuyển nhanh giữa khu vực đã khám phá (bạc). */
export const TRAVEL_GOLD = 30;
/** Thời gian bỏ qua một mục tiêu không tiếp cận được (tick = 10 giây). */
const AUTO_COMBAT_SKIP_TICKS = 10 * TICK_RATE;
/** Điểm hồi sinh tại Tân Thủ Thôn, dùng chung cho chết và Hồi Thành Phong. */
const RESPAWN_POINT = { x: 14, y: 14 };
/**
 * Băm ổn định id mục tiêu thành số, để lưu "đang đánh ai" trong
 * `cooldowns` (Record<string, number>) mà không phải đổi schema.
 */
function hashEntityId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  // `cooldowns` lưu số không âm trong schema bản lưu; `| 0` có thể ra số âm.
  return Math.abs(hash) || 1;
}
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
    // Hành trang khởi đầu: chỉ đồ tiêu hao + 180 bạc. Đạo Bào Thanh Vân
    // ("robe") là phần thưởng của nhiệm vụ NV01 "Bình yên thôn nhỏ", KHÔNG
    // phát sẵn trong túi (trước đây phát sẵn nên nhận thưởng xong bị trùng 2
    // chiếc). Trang bị mặc sẵn lúc tạo nhân vật chỉ có kiếm ("sword").
    inventory: [
      { id: characterId + ":hp", definitionId: "hp", quantity: 8 },
      { id: characterId + ":mp", definitionId: "mp", quantity: 5 },
    ],
    equipment: {
      weapon: {
        id: characterId + ":sword",
        definitionId: "sword",
        quantity: 1,
      },
    },
    quests: [],
    questTalks: {},
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
      hpThreshold: 0.4,
      mpThreshold: 0.25,
      stopHp: 0.1,
      range: 12,
      skills: true,
      autoPickup: true,
    },
    enhanceLog: [],
    // Bộ đếm thành tựu bắt đầu từ 0 ở nhân vật mới; bản lưu cũ được suy ra
    // trong GameWorld constructor (xem `initAchievements`).
    achievements: {
      counters: {
        kills: 0,
        wolfKills: 0,
        peakGold: 0,
        enhancementSuccess: 0,
      },
      claimed: [],
    },
    eliteSpawns: {},
    autoCombatSkip: {},
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
  "questTalks",
  "gold",
  "settings",
  "pendingInteraction",
  "branchId",
  "hotbar",
  "professionXp",
  "autoCombat",
  "enhanceLog",
  "achievements",
  "eliteSpawns",
  "autoCombatSkip",
  "travelReadyAt",
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
  /** Nhân vật đã báo "túi đầy" trong phiên tự chiến hiện tại (Lỗi 2). */
  private autoPickupFullNotified = new Set<string>();
  private lastSequence = new Map<string, number>();
  private eventId = 0;
  private allowPause: boolean;
  /**
   * Mốc "bật tính năng tinh anh" của phiên đang chạy (ms thời gian thật).
   * Cố tình KHÔNG ghi vào state khi khởi tạo: snapshot phải xác định theo seed
   * để replay/kiểm thử so khớp được. Chỉ mốc sau khi hạ tinh anh mới được lưu
   * vào `eliteSpawns` trong bản lưu, nên thời gian chờ vẫn trôi khi thoát game.
   */
  private eliteClockAt = Date.now();
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
    this.initProgressDefaults();
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
  /**
   * Điền mặc định an toàn cho các trường mới khi nạp bản lưu cũ.
   *
   * - `achievements`: bộ đếm bắt đầu từ 0, riêng "bạc cao nhất từng sở hữu"
   *   khởi tạo bằng số bạc đang có (đúng yêu cầu đặc tả). Các thành tựu suy ra
   *   từ trạng thái (cấp, khu vực, nhiệm vụ) đọc trực tiếp snapshot nên không
   *   cần khởi tạo.
   * - `eliteSpawns`: KHÔNG ghi mốc thời gian thật vào state khi khởi tạo, vì
   *   mốc đó sẽ làm hai lần chạy cùng seed cho ra snapshot khác nhau (phá tính
   *   xác định của replay). Mốc "lần đầu bật tính năng" giữ trong bộ nhớ của
   *   world (`eliteClockAt`); chỉ mốc sau khi hạ tinh anh mới được lưu vào bản
   *   lưu, đúng yêu cầu "chờ 30 phút vẫn trôi khi thoát game".
   * - `autoCombat.skills/autoPickup`: bản lưu cũ thiếu thì mặc định bật.
   */
  private applyProgressDefaults(p: CharacterProgress) {
    p.achievements ??= {
      counters: { kills: 0, wolfKills: 0, peakGold: 0, enhancementSuccess: 0 },
      claimed: [],
    };
    const c = p.achievements.counters;
    c.kills = Math.max(0, c.kills ?? 0);
    c.wolfKills = Math.max(0, c.wolfKills ?? 0);
    c.enhancementSuccess = Math.max(0, c.enhancementSuccess ?? 0);
    c.peakGold = Math.max(c.peakGold ?? 0, p.gold);
    p.eliteSpawns ??= {};
    p.autoCombatSkip ??= {};
    p.autoCombat.skills ??= true;
    p.autoCombat.autoPickup ??= true;
  }
  private initProgressDefaults() {
    for (const p of [this.state, ...Object.values(this.state.actors)])
      this.applyProgressDefaults(p);
  }
  /** Giá trị hiện tại của một nguồn thành tựu (bộ đếm hoặc trạng thái). */
  achievementValue(
    p: CharacterProgress,
    source: (typeof achievements)[number]["source"],
  ) {
    switch (source) {
      case "kills":
        return p.achievements?.counters.kills ?? 0;
      case "wolfKills":
        return p.achievements?.counters.wolfKills ?? 0;
      case "peakGold":
        return p.achievements?.counters.peakGold ?? 0;
      case "enhancementSuccess":
        return p.achievements?.counters.enhancementSuccess ?? 0;
      case "level":
        return p.level;
      case "gold":
        return p.gold;
      case "maps":
        // Dùng chung cờ đã-khám-phá với dịch chuyển nhanh, không đếm trùng.
        return this.state.visitedMaps.length;
      case "quests":
        return p.quests.filter((q) => q.status === "claimed").length;
    }
  }
  /** Id thành tựu vừa đạt nhưng chưa nhận thưởng. */
  private achievementsReached(p: CharacterProgress) {
    const claimed = new Set(p.achievements?.claimed ?? []);
    return achievements.filter(
      (a) =>
        !claimed.has(a.id) && this.achievementValue(p, a.source) >= a.threshold,
    );
  }
  /** Tập id thành tựu đã đạt tại thời điểm gọi (dùng để phát hiện "vừa đạt"). */
  private reachedIds(p: CharacterProgress) {
    return new Set(this.achievementsReached(p).map((a) => a.id));
  }
  /**
   * Áp một thay đổi lên bộ đếm thành tựu rồi phát thông báo cho các thành tựu
   * vừa đạt. Mọi đường (giết quái, lên cấp, nhiệm vụ, cường hóa, bạc, khu vực)
   * đều đi qua đây để chỉ phát một lần và đúng thời điểm.
   */
  private updateAchievements(
    actor: CombatEntity,
    mutate?: (p: CharacterProgress, counters: AchievementCounters) => void,
  ) {
    const p = this.progress(actor);
    if (!p) return;
    p.achievements ??= {
      counters: { kills: 0, wolfKills: 0, peakGold: 0, enhancementSuccess: 0 },
      claimed: [],
    };
    const counters = p.achievements.counters,
      before = this.reachedIds(p);
    mutate?.(p, counters);
    // "Bạc cao nhất từng sở hữu" cập nhật sau mọi thay đổi số bạc.
    if (p.gold > counters.peakGold) counters.peakGold = p.gold;
    for (const a of this.achievementsReached(p))
      if (!before.has(a.id))
        this.emit("message", `Đạt thành tựu: ${a.name}`, {
          entityId: actor.id,
        });
  }
  private trackAchievement(
    actor: CombatEntity,
    counter: keyof AchievementCounters,
    amount = 1,
  ) {
    if (amount <= 0) return;
    this.updateAchievements(actor, (_p, counters) => {
      counters[counter] = Math.max(0, (counters[counter] ?? 0) + amount);
    });
  }
  /** Cập nhật "bạc cao nhất từng sở hữu" + kiểm tra thành tựu liên quan. */
  private trackPeakGold(actor: CombatEntity) {
    this.updateAchievements(actor);
  }
  /**
   * Đọc kết quả cường hóa từ `enhanceLog` (nguồn dữ liệu sẵn có của Công
   * xưởng) để đếm thành tựu; không sửa logic cường hóa.
   */
  private trackEnhanceResult(actor: CombatEntity, p: CharacterProgress) {
    const last = p.enhanceLog?.[p.enhanceLog.length - 1];
    if (last?.success) this.trackAchievement(actor, "enhancementSuccess");
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
    // Nhân vật vào sau cũng phải có default giống nhân vật nạp từ bản lưu.
    this.applyProgressDefaults(this.state.actors[source.id]);
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
    if (c.type === "claimAchievement") {
      const def = achievements.find((a) => a.id === c.achievementId);
      if (!def) return;
      s.achievements ??= {
        counters: {
          kills: 0,
          wolfKills: 0,
          peakGold: 0,
          enhancementSuccess: 0,
        },
        claimed: [],
      };
      // Chỉ nhận 1 lần; đã nhận hoặc chưa đạt ngưỡng thì bỏ qua.
      if (s.achievements.claimed.includes(def.id)) return;
      if (this.achievementValue(s, def.source) < def.threshold) return;
      s.achievements.claimed.push(def.id);
      s.gold += def.reward;
      this.trackPeakGold(p);
      this.emit("loot", `Thành tựu ${def.name}: +${def.reward} bạc.`, {
        entityId: p.id,
      });
      return;
    }
    if (c.type === "travel") {
      const destination = getMap(c.mapId);
      if (c.mapId === p.mapId) {
        this.error("Bạn đang ở khu vực này.");
        return;
      }
      if (!this.state.visitedMaps.includes(c.mapId)) {
        this.error("Khu vực này chưa được khám phá.");
        return;
      }
      // Không dịch chuyển khi có quái đang tấn công nhân vật.
      const engaged = Object.values(this.state.entities).some(
        (e) =>
          e.kind === "monster" &&
          e.mapId === p.mapId &&
          e.hp > 0 &&
          (e.targetId === p.id || (e.threat[p.id] ?? 0) > 0),
      );
      if (engaged) {
        this.error("Đang giao chiến, không thể dịch chuyển. Hãy đi cổng.");
        return;
      }
      if (s.gold < TRAVEL_GOLD) {
        this.error(`Cần ${TRAVEL_GOLD} bạc để dịch chuyển.`);
        return;
      }
      // Hồi chiêu 10 giây tính theo thời gian thật, hiển thị đếm ngược trên UI.
      const now = Date.now();
      if ((s.travelReadyAt ?? 0) > now) {
        this.error(
          `Vừa dịch chuyển, chờ ${Math.ceil(((s.travelReadyAt ?? 0) - now) / 1000)} giây.`,
        );
        return;
      }
      // Điểm đến dùng lại đúng điểm vào của cổng truyền tống dẫn tới map đó.
      const portal = [...maps].flatMap((m) =>
        m.portals.filter((x) => x.to === c.mapId),
      )[0];
      const point = portal?.destination ?? destination.spawn;
      s.gold -= TRAVEL_GOLD;
      s.travelReadyAt = now + 10_000;
      this.trackPeakGold(p);
      this.changeMap(p, c.mapId, { ...point });
      this.emit("message", `Dịch chuyển tới ${destination.name}.`, {
        entityId: p.id,
      });
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
      // Bấm phím di chuyển = tắt tự chiến ngay (A1.6).
      if (p.autoAttack && length > 0.01) {
        p.autoAttack = false;
        p.farmAnchor = null;
        this.emit("message", "Đã tắt tự chiến.");
      }
      p.autoChase = false;
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
      // Đi tay = tắt tự chiến ngay (A1.6).
      if (p.autoAttack) {
        p.autoAttack = false;
        p.farmAnchor = null;
        this.emit("message", "Đã tắt tự chiến.");
      }
      p.autoAttack = false;
      p.autoChase = false;
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
      // Đuổi đánh bằng click chuột cũng dừng theo (tách khỏi `autoAttack`).
      p.autoChase = false;
      p.targetId = null;
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
      // Click quái = đuổi đánh đúng mục tiêu đó, KHÔNG bật tự chiến.
      p.autoChase = true;
      return;
    }
    if (c.type === "autoCombatPaused") {
      p.autoCombatPaused = c.paused;
      return;
    }
    if (c.type === "autoAttack") {
      p.movementInput = null;
      p.autoAttack = c.enabled;
      p.autoChase = false;
      p.farmAnchor = c.enabled ? { x: p.x, y: p.y } : null;
      // Bật lại thì xóa danh sách bỏ qua của chính nhân vật này.
      if (c.enabled) s.autoCombatSkip = {};
      if (c.enabled) this.autoPickupFullNotified.delete(p.id);
      if (!c.enabled) {
        p.targetId = null;
        p.path = [];
      }
      this.emit("message", c.enabled ? "Tự chiến: Bật." : "Tự chiến: Tắt.");
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
      // Cường hóa thành công ghi vào bộ đếm thành tựu "Thợ Rèn Tập Sự".
      if (c.type === "enhance") this.trackEnhanceResult(p, s);
      this.trackPeakGold(p);
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
        // Ghi nhận NPC đã nói chuyện để bước hội thoại của nhiệm vụ hoàn tất
        // và khung theo dõi chuyển sang bước kế tiếp.
        s.questTalks ??= {};
        s.questTalks[npc.id] = this.state.tick;
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
      // Thành tựu "Nhiệm Vụ Đầu Tiên" + mốc bạc cao nhất sau thưởng.
      this.updateAchievements(p);
      return;
    }
    if (c.type === "useItem") {
      const instance = s.inventory.find((i) => i.id === c.instanceId);
      if (!instance) return;
      const d = getItem(instance.definitionId);
      // Vật phẩm dịch chuyển (Hồi Thành Phù): dùng chung thao tác useItem.
      if (d.teleport) {
        if (d.teleport === p.mapId) {
          this.error("Bạn đang ở Tân Thủ Thôn.");
          return;
        }
        // Toạ độ điểm hồi sinh dùng chung với cơ chế hồi sinh sau khi chết.
        const respawnPoint = RESPAWN_POINT;
        instance.quantity--;
        if (!instance.quantity)
          s.inventory = s.inventory.filter((i) => i.id !== instance.id);
        this.changeMap(p, d.teleport, { ...respawnPoint });
        this.emit("message", "Đã trở về Tân Thủ Thôn.", {
          entityId: p.id,
        });
        return;
      }
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
  /**
   * Cập nhật tiến độ cho MỌI nhiệm vụ đang hoạt động có mục tiêu khớp.
   *
   * - So khớp luôn dùng id ổn định trong code (`definitionId` của quái, id item,
   *   id map/area, id NPC), không dùng chuỗi tên hiển thị tiếng Việt.
   * - Nhiều nhiệm vụ cùng yêu cầu một loại quái đều được tăng.
   * - Mỗi lần tăng phát một sự kiện `quest` để UI hiện thông báo nổi.
   */
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
      const before = q.progress;
      q.progress = Math.min(d.count, q.progress + amount);
      if (q.progress === before) continue;
      // Thông báo tiến độ dạng "Sơn tặc 2/5" dùng tên mục tiêu tiếng Việt.
      this.emit("quest", `${questTargetLabel(d)} ${q.progress}/${d.count}`, {
        entityId: actor.id,
        value: q.progress,
      });
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
  /**
   * Kỹ năng đang dùng được: đã mở khóa, đã gán vào thanh kỹ năng, đủ nội lực và
   * hết hồi chiêu thật. Tự chiến không bỏ qua bất kỳ điều kiện nào (A1.3).
   */
  private autoCombatSkills(e: CombatEntity, p: CharacterProgress) {
    const tick = this.state.tick;
    return p.hotbar
      .map((id) => skills.find((d) => d.id === id))
      .filter((d): d is (typeof skills)[number] => !!d)
      .filter(
        (d) =>
          (p.skillLevels[d.id] ?? 0) > 0 &&
          (e.cooldowns[d.id] ?? 0) <= tick &&
          e.mp >= d.manaCost,
      );
  }
  /**
   * Buff tự thân (A1.3): tung lại khi hiệu ứng chưa có trên nhân vật hoặc đã
   * hết. Nhận diện buff bằng `kind === "buff"` của dữ liệu kỹ năng; kỹ năng
   * buff có hiệu ứng trạng thái thì kiểm tra `statuses`, buff dạng "guard" thì
   * kiểm tra đúng mốc `guardUntil` mà runtime đang dùng.
   */
  private autoCombatBuff(e: CombatEntity, p: CharacterProgress) {
    const tick = this.state.tick;
    for (const d of this.autoCombatSkills(e, p)) {
      if (d.kind !== "buff") continue;
      const active =
        d.id === "guard"
          ? (e.cooldowns.guardUntil ?? 0) > tick
          : d.effects.length > 0 &&
            d.effects.every((fx) =>
              e.statuses.some(
                (st) => st.kind === fx.kind && st.expiresAt > tick,
              ),
            );
      if (active) continue;
      if (this.combat.useSkill(e, d.id, undefined, true)) return true;
    }
    return false;
  }
  /**
   * Đuổi đánh một mục tiêu do người chơi click (khác tự chiến).
   * Tái dùng đúng hàm tìm đường và hàm đánh thường của thao tác click quái.
   */
  private chaseTick(e: CombatEntity) {
    const s = this.state,
      target = e.targetId ? s.entities[e.targetId] : undefined;
    if (!this.hostile(e, target)) {
      e.autoChase = false;
      e.targetId = null;
      e.path = [];
      return;
    }
    if (!this.combat.canAct(e)) return;
    if (distance(e, target) > e.attackRange) {
      if (s.tick % 5 === 0) e.path = findPath(getMap(e.mapId), e, target, 350);
    } else {
      e.path = [];
      this.combat.basic(e, target);
    }
  }
  /**
   * Một nhịp quyết định của tự chiến (A1).
   *
   * Chạy theo tick mô phỏng đã quy đổi từ `AUTO_COMBAT_TICK_MS` (250ms), không
   * phụ thuộc frame render. Thứ tự: uống thuốc → buff → chọn/đánh mục tiêu →
   * nhặt đồ. Trả `true` khi lượt cập nhật của actor nên dừng (chết, tạm dừng).
   */
  /**
   * Bước nhặt chủ động của tự chiến (Lỗi 2): khi không còn mục tiêu sống, đi
   * tới món đồ gần nhất CỦA MÌNH trong bán kính quét 12 ô rồi nhặt, sau đó
   * quay lại vòng quét quái. Túi đầy thì không đi và chỉ báo một lần.
   */
  private autoPickupStep(e: CombatEntity, p: CharacterProgress) {
    const s = this.state,
      config = p.autoCombat;
    if (config.autoPickup === false || config.pickup === false) return false;
    const floor =
      config.lootRarity === "all" ? 1 : rarityPriority[config.lootRarity];
    const loot = Object.values(s.groundLoot)
      .filter(
        (l) =>
          l.ownerId === e.id &&
          l.mapId === e.mapId &&
          l.expiresAt > s.tick &&
          distance(e, l) <= AUTO_COMBAT_RANGE &&
          (!l.item ||
            rarityPriority[getItem(l.item.definitionId).rarity] >= floor),
      )
      .sort((a, b) => distance(e, a) - distance(e, b))[0];
    if (!loot) return false;
    if (
      loot.item &&
      !canAddItem(p, loot.item.definitionId, loot.item.quantity)
    ) {
      if (!this.autoPickupFullNotified.has(e.id)) {
        this.autoPickupFullNotified.add(e.id);
        this.error("Hành trang đầy. Vật phẩm vẫn ở trên đất.");
      }
      // Giữ nguyên hành vi cũ: túi đầy + bật "dừng khi túi đầy" thì tắt tự chiến.
      if (p.autoCombat.stopWhenFull) {
        e.autoAttack = false;
        e.path = [];
        p.pendingInteraction = null;
      }
      return false;
    }
    this.pickup(e, loot.id, true);
    return true;
  }
  private autoCombatTick(e: CombatEntity, p: CharacterProgress) {
    const s = this.state,
      config = p.autoCombat;
    // a. Chết / đang mở hội thoại hoặc shop → không làm gì, không tự tắt.
    if (e.hp <= 0 || e.autoCombatPaused || s.paused) return false;
    if (s.tick % AUTO_COMBAT_TICKS !== 0) return false;

    // 4. Uống thuốc trước: chọn viên yếu nhất mà vẫn đủ dùng.
    if (config.potions && (e.cooldowns.potion ?? 0) <= s.tick) {
      const wanted: "hp" | "mp" | null =
        e.hp / e.maxHp < config.hpThreshold
          ? "hp"
          : e.mp / e.maxMp < config.mpThreshold
            ? "mp"
            : null;
      if (wanted) {
        const potion = p.inventory
          .filter((i) => {
            const d = getItem(i.definitionId);
            return (
              d.restore === wanted && p.level >= (d.requiredLevel ?? d.level)
            );
          })
          // Yếu nhất (giá thấp nhất) trước: đủ dùng thì không phí đan quý.
          .sort((a, b) => {
            const da = getItem(a.definitionId),
              db = getItem(b.definitionId);
            return da.price - db.price || da.level - db.level;
          })[0];
        // Không có thuốc phù hợp thì bỏ qua, không báo lỗi.
        if (potion) this.command(e, { type: "useItem", instanceId: potion.id });
      }
    }

    // 3. Buff tự thân trước khi chọn mục tiêu (A1.2.b / A1.3).
    if (config.skills !== false && this.autoCombatBuff(e, p)) return false;

    // 5. Nhặt đồ trong bán kính 3 ô trước khi chọn mục tiêu tiếp theo.
    if (config.autoPickup !== false) {
      const floor =
        config.lootRarity === "all" ? 1 : rarityPriority[config.lootRarity];
      const loot = Object.values(s.groundLoot)
        .filter(
          (l) =>
            l.ownerId === e.id &&
            l.mapId === e.mapId &&
            distance(e, l) <= AUTO_COMBAT_PICKUP_RANGE &&
            (!l.item ||
              rarityPriority[getItem(l.item.definitionId).rarity] >= floor),
        )
        .sort((a, b) => distance(e, a) - distance(e, b))[0];
      if (loot) {
        this.pickup(e, loot.id, true);
        return false;
      }
    }

    if (p.pendingInteraction?.startsWith("pickup:")) return false;

    // c. Chọn mục tiêu: quái còn sống gần nhất trong bán kính quét; ưu tiên
    // quái đang tấn công nhân vật. Bỏ qua danh sách đã bị skip 10 giây.
    const skip = (p.autoCombatSkip ??= {});
    for (const [id, until] of Object.entries(skip))
      if (until <= s.tick) delete skip[id];
    const candidates = Object.values(s.entities).filter(
      (t) =>
        this.hostile(e, t) &&
        t.mapId === e.mapId &&
        distance(e, t) <= AUTO_COMBAT_RANGE &&
        !(skip[t.id] > s.tick),
    );
    const attacking = (t: CombatEntity) =>
      t.targetId === e.id || (t.threat[e.id] ?? 0) > 0;
    const target =
      candidates.find(attacking) ??
      candidates.sort((a, b) => distance(e, a) - distance(e, b))[0];
    if (!target) {
      e.targetId = null;
      // Lỗi 2: hết mục tiêu → chủ động đi nhặt đồ rơi trong bán kính quét.
      if (!this.autoPickupStep(e, p)) e.path = [];
      return false;
    }
    e.targetId = target.id;

    // 5 giây không gây được sát thương lên mục tiêu đã chọn → bỏ qua 10 giây.
    const engageHash = hashEntityId(target.id);
    if (e.cooldowns.autoEngageHash !== engageHash) {
      e.cooldowns.autoEngageHash = engageHash;
      e.cooldowns.autoEngageAt = s.tick;
      e.cooldowns.autoEngageHp = target.hp;
    } else if (
      target.hp >= (e.cooldowns.autoEngageHp ?? target.hp) &&
      s.tick - (e.cooldowns.autoEngageAt ?? s.tick) > 5 * TICK_RATE
    ) {
      // 5 giây không mất máu → coi như không tiếp cận được.
      skip[target.id] = s.tick + AUTO_COMBAT_SKIP_TICKS;
      e.targetId = null;
      e.cooldowns.autoEngageHash = 0;
      e.path = [];
      return false;
    } else if (target.hp < (e.cooldowns.autoEngageHp ?? target.hp)) {
      e.cooldowns.autoEngageAt = s.tick;
      e.cooldowns.autoEngageHp = target.hp;
    }
    if (!this.combat.canAct(e)) return false;

    // 3 (tiếp). AOE chỉ tung khi có ≥3 quái quanh mục tiêu, rồi tới kỹ năng
    // đơn mục tiêu ưu tiên nội lực cao nhất; không đủ điều kiện thì đánh thường.
    if (config.skills !== false) {
      const usable = this.autoCombatSkills(e, p);
      const aoe = usable.filter((d) => d.kind === "aoe");
      for (const d of aoe) {
        const hit = Object.values(s.entities).filter(
          (t) =>
            this.hostile(e, t) &&
            t.mapId === e.mapId &&
            distance(t, target) <= d.areaRadius &&
            distance(e, t) <= d.range,
        ).length;
        if (hit >= 3 && this.combat.useSkill(e, d.id, target.id, true))
          return false;
      }
      const single = usable
        .filter((d) =>
          ["melee", "line", "projectile", "cone", "dash"].includes(d.kind),
        )
        .sort((a, b) => b.manaCost - a.manaCost);
      for (const d of single)
        if (this.combat.useSkill(e, d.id, target.id, true)) return false;
    }

    // d. Di chuyển/đánh bằng đúng hàm mà click chuột đang dùng.
    if (distance(e, target) > e.attackRange) {
      e.path = findPath(getMap(e.mapId), e, target, 350);
      if (!e.path.length) {
        // Không tới được: 3 lần thất bại liên tiếp → bỏ qua 10 giây.
        e.cooldowns.pathFailures = (e.cooldowns.pathFailures ?? 0) + 1;
        if ((e.cooldowns.pathFailures ?? 0) >= 3) {
          e.cooldowns.pathFailures = 0;
          skip[target.id] = s.tick + AUTO_COMBAT_SKIP_TICKS;
          e.targetId = null;
        }
      } else e.cooldowns.pathFailures = 0;
    } else {
      e.cooldowns.pathFailures = 0;
      this.combat.basic(e, target);
    }
    return false;
  }
  /**
   * Sinh tinh anh theo chu kỳ thời gian thật (B2).
   *
   * Mốc thời gian lưu theo nhân vật trong `eliteSpawns` nên thời gian chờ vẫn
   * trôi khi thoát game. Chỉ tồn tại 1 con mỗi loại tại một thời điểm.
   */
  private spawnElites() {
    const s = this.state,
      player = this.player,
      now = Date.now();
    for (const elite of elites) {
      const id = `elite:${elite.id}`,
        existing = s.entities[id];
      if (existing && existing.hp > 0) continue;
      // Mốc lưu trong bản lưu (sau khi hạ) hoặc mốc bật tính năng của phiên
      // đang chạy; cả hai đều là thời gian thật nên chờ vẫn trôi khi thoát game.
      const readyAt =
        s.eliteSpawns?.[elite.id] ?? this.eliteClockAt + elite.cycleMs;
      if (readyAt > now) continue;
      const base = monsters.find((m) => m.id === elite.monsterId);
      if (!base) continue;
      const entity = spawnMonster(
        s,
        elite.monsterId,
        elite.mapId,
        elite.point.x,
        elite.point.y,
        id,
      );
      entity.name = elite.name;
      entity.elite = true;
      entity.respawnAt = 0;
      entity.hp = entity.maxHp = Math.round(base.hp * elite.multipliers.hp);
      entity.attack = Math.round(base.attack * elite.multipliers.attack);
      // Giữ `definitionId` = quái gốc để nhiệm vụ "Lang vương" vẫn tính.
      if (player.mapId === elite.mapId)
        this.emit(
          "message",
          `${elite.name} đã xuất hiện tại ${getMap(elite.mapId).name}!`,
          {
            entityId: entity.id,
          },
        );
    }
  }
  /** Thưởng khi hạ tinh anh: 150–300 bạc, chắc chắn 1 Huyền Thiết, 30% trang bị. */
  private rewardElite(
    t: CombatEntity,
    killer: CombatEntity,
    elite: (typeof elites)[number],
  ) {
    const s = this.state,
      owner = this.progress(killer);
    if (!owner) return;
    const gold = 150 + Math.floor(this.random.next() * 151);
    s.eliteSpawns ??= {};
    s.eliteSpawns[elite.id] = Date.now() + elite.cycleMs;
    // Bạc và Huyền Thiết rơi tại chỗ theo đúng cơ chế rớt đồ sẵn có.
    const base = monsters.find((m) => m.id === elite.monsterId);
    const drops: { itemId: string; chance: number }[] = [
      { itemId: "ore", chance: 1 },
      ...(base?.loot ?? []).filter(
        (l) => getItem(l.itemId).kind !== "material",
      ),
    ];
    const loot = rollLoot(drops, () => this.random.next());
    const items = new Set(loot.map((l) => l.itemId));
    items.add("ore");
    if (this.random.next() >= 0.3) {
      // 70% trường hợp: chỉ bạc + Huyền Thiết, không thêm trang bị.
      for (const l of [...items])
        if (getItem(l).kind !== "material") items.delete(l);
    }
    const lines = [
      { item: null as string | null, gold },
      ...[...items].map((item) => ({ item, gold: 0 })),
    ];
    for (const [i, line] of lines.entries()) {
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
        id = `loot:${s.nextWorldId++}`;
      } while (s.groundLoot[id] || s.deferredLoot[id]);
      admitGroundLoot(s, {
        ...point,
        id,
        mapId: t.mapId,
        ownerId: killer.id,
        item: line.item
          ? {
              id: `${owner.characterId}:item:${owner.nextId++}`,
              definitionId: line.item,
              quantity: 1,
            }
          : null,
        gold: line.gold,
        createdAt: s.tick,
        expiresAt: s.tick + 12000,
      });
    }
    this.emit(
      "message",
      `Hạ ${elite.name}! Chiến lợi phẩm rơi tại chỗ.`,
      // targetId giữ id tinh anh để UI nhận ra thông báo hệ thống nổi bật (B2).
      { entityId: killer.id, targetId: t.id },
    );
  }
  private die(t: CombatEntity, killer: CombatEntity) {
    setAnimation(t, "dead", this.state.tick);
    t.brain = "dead";
    t.path = [];
    t.autoAttack = false;
    t.targetId = null;
    t.casting = null;
    t.statuses = [];
    t.strike = null;
    this.emit("death", `${t.name} đã gục ngã.`, {
      entityId: t.id,
      targetId: killer.id,
    });
    if (t.kind === "player") {
      t.respawnAt = this.state.tick + 100;
      return;
    }
    const d = monsters.find((m) => m.id === t.definitionId)!;
    // Tinh anh do dữ liệu `elites` quản lý: không hồi sinh theo nhịp spawn
    // thường, chu kỳ 30 phút do `spawnElites` quyết định từ `eliteSpawns`.
    const elite = t.id.startsWith("elite:")
      ? elites.find((e) => `elite:${e.id}` === t.id)
      : undefined;
    t.respawnAt = elite
      ? 0
      : t.id.includes(":summon:")
        ? 0
        : this.state.tick + d.respawn;
    const spawnZone = getMap(t.mapId).spawnZones?.find(
      (z) => z.id === t.spawnZoneId,
    );
    if (spawnZone)
      t.respawnAt = this.state.tick + zoneRespawnDelay(spawnZone, this.random);
    if (!t.respawnAt) t.stateUntil = this.state.tick + 80;
    const owner = this.progress(killer);
    if (!owner) return;
    // Tinh anh: đặt lại chu kỳ 30 phút và thưởng riêng theo đặc tả B2.
    if (elite) this.rewardElite(t, killer, elite);
    const experience = Math.round(
      d.exp *
        (1 + Math.max(0, t.level - d.level) * 0.12) *
        (elite ? elite.multipliers.exp : t.elite ? 1.6 : 1),
    );
    // Bộ đếm thành tựu: chỉ đếm khi chính nhân vật ra đòn kết liễu.
    if (killer.kind === "player") {
      this.trackAchievement(killer, "kills");
      // Lang vương tính cả Lang Vương Tinh Anh vì dùng chung id gốc.
      if (t.definitionId === "wolf") this.trackAchievement(killer, "wolfKills");
    }
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
      // Nhặt tay: dừng cả tự chiến lẫn đuổi đánh để không giành đường đi.
      if (!automatic) {
        actor.autoAttack = false;
        actor.autoChase = false;
      }
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
    this.autoPickupFullNotified.delete(actor.id);
    this.trackPeakGold(actor);
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
    // Thành tựu "Sơ Nhập Giang Hồ"/"Tiểu Hiệp Thành Danh" đọc cấp hiện tại.
    this.updateAchievements(actor);
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
    // Giữ nguyên bật/tắt tự chiến khi đổi bản đồ (đặc tả A1.6): chỉ quét lại
    // mục tiêu ở map mới, không tự tắt.
    actor.autoChase = false;
    if (actor.autoAttack) {
      actor.farmAnchor = { x: destination.x, y: destination.y };
      // Cờ bỏ qua mục tiêu là theo map cũ, sang map mới phải xóa.
      progress.autoCombatSkip = {};
    }
    actor.casting = null;
    progress.pendingInteraction = null;
    populateMap(this.state, mapId);
    this.entityIndex.rebuild(this.state.entities);
    this.advanceObjective(actor, "explore", mapId);
    // Thành tựu "Hành Giả" đếm khu vực đã khám phá (dùng chung `visitedMaps`).
    this.updateAchievements(actor);
    this.emit("map", `Đã đến ${getMap(mapId).name}.`, {
      entityId: actor.id,
      targetId: mapId,
    });
    // Vào khu vực đang có tinh anh sống: nhắc lại sự xuất hiện một lần (B2.3).
    if (actor.id === this.state.playerId)
      for (const elite of elites)
        if (elite.mapId === mapId) {
          const entity = this.state.entities[`elite:${elite.id}`];
          if (entity && entity.hp > 0)
            this.emit(
              "message",
              `${elite.name} đang hoành hành tại ${getMap(mapId).name}!`,
              { entityId: entity.id },
            );
        }
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
    if (s.tick % 20 === 0) {
      for (const actor of Object.values(s.entities))
        if (actor.kind === "player" && actor.hp > 0)
          for (const area of getMap(actor.mapId).areas ?? [])
            if (distance(actor, area) <= area.radius)
              this.advanceObjective(actor, "explore", area.id);
      this.spawnElites();
    }
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
        // Tinh anh chết cũng dọn xác như summon: mốc hồi sinh do chu kỳ 30
        // phút trong `eliteSpawns` quyết định, không giữ xác lại.
        else if (
          (e.id.includes(":summon:") || e.id.startsWith("elite:")) &&
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
      if (progress && e.autoAttack) {
        if (this.autoCombatTick(e, progress)) continue;
      } else if (e.autoChase) this.chaseTick(e);
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
            (1 + Math.min(0.6, statusValue(e, "haste"))) *
            // Mục 5: trong chu kỳ đòn thường vẫn đi được, chậm hơn 0.55 lần.
            (e.strike ? MOVE_WHILE_ATTACK_SPEED : 1)) /
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
            (1 + Math.min(0.6, statusValue(e, "haste"))) *
            (e.strike ? MOVE_WHILE_ATTACK_SPEED : 1),
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
      // Mục 5.2: đang vừa đi vừa ra đòn và mục tiêu còn trong tầm → mặt hướng
      // mục tiêu; ngoài tầm thì giữ hướng di chuyển.
      const strikeTarget = e.strike ? s.entities[e.strike.targetId] : null;
      if (
        strikeTarget &&
        strikeTarget.hp > 0 &&
        strikeTarget.mapId === e.mapId &&
        distance(e, strikeTarget) <= e.attackRange
      )
        e.direction = directionFromDelta({
          x: strikeTarget.x - e.x,
          y: strikeTarget.y - e.y,
        });
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
      // Lỗi 3: đi ngang qua đồ rơi của mình thì tự nhặt — dùng đúng bán kính
      // 1.8 ô mà đường bấm-vào-icon đang dùng, không thêm bán kính mới.
      if (
        progress &&
        e.hp > 0 &&
        !e.autoAttack &&
        !e.autoCombatPaused &&
        !progress.pendingInteraction &&
        s.tick % 2 === 0
      ) {
        const near = Object.values(s.groundLoot).find(
          (l) =>
            l.ownerId === e.id &&
            l.mapId === e.mapId &&
            l.expiresAt > s.tick &&
            distance(e, l) <= 1.8,
        );
        if (near) this.pickup(e, near.id, true);
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
