import Dexie, { type Table } from "dexie";
import { z } from "zod";
import {
  INVENTORY_CAPACITY,
  WAREHOUSE_CAPACITY,
  MAX_CHARACTER_LEVEL,
  LOCAL_CHARACTER_SLOTS,
  characterNameKey,
  characterNameError,
  normalizeCharacterName,
  createLocalCharacterId,
  type GameSnapshot,
  type CharacterProgress,
} from "../../game-protocol/src/index";
import {
  CONTENT_VERSION,
  maps,
  monsters,
  items,
  skills,
  quests,
  classDefinitions,
  getSect,
  statusApplicationSchema,
  enhancementRules,
  isEquipment,
} from "../../game-content/src/index";
import { migrateSave, requiresMigration } from "./migrations/upgrade";
export { migrateLegacy } from "./migrations/upgrade";
const number = z.number().finite(),
  nonnegative = number.nonnegative(),
  integer = nonnegative.int();
const vec = z.object({ x: number, y: number });
const item = z.object({
  id: z.string().min(1),
  definitionId: z.string(),
  quantity: z.number().int().min(1).max(99),
  enhancement: z
    .number()
    .int()
    .min(0)
    .max(enhancementRules.maxLevel)
    .optional(),
  affixes: z
    .array(
      z.object({
        id: z.string(),
        stat: z.enum(["attack", "defense", "maxHp", "maxMp"]),
        value: number,
      }),
    )
    .max(3)
    .optional(),
  locked: z.boolean().optional(),
  gems: z.array(z.string()).max(2).optional(),
});
const enhanceRecord = z.object({
  tick: integer,
  definitionId: z.string(),
  from: z.number().int().min(0).max(enhancementRules.maxLevel),
  to: z.number().int().min(0).max(enhancementRules.maxLevel),
  success: z.boolean(),
  protected: z.boolean(),
});
const direction = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
]);
const element = z.enum(["metal", "wood", "water", "fire", "earth"]);
const entity = vec.extend({
  id: z.string(),
  kind: z.enum(["player", "monster"]),
  definitionId: z.string(),
  name: z.string(),
  mapId: z.string(),
  level: z.number().int().min(1).max(MAX_CHARACTER_LEVEL),
  hp: nonnegative,
  mp: nonnegative,
  maxHp: number.positive(),
  maxMp: nonnegative,
  attack: nonnegative,
  defense: nonnegative,
  element,
  path: z.array(vec).max(4096),
  spawn: vec,
  state: z.enum([
    "idle",
    "walk",
    "attack",
    "cast",
    "hit",
    "dead",
    "revive",
    "interact",
  ]),
  stateUntil: integer,
  stateStartedAt: integer,
  direction,
  targetId: z.string().nullable(),
  cooldowns: z.record(z.string(), nonnegative),
  respawnAt: integer,
  nextAttack: integer,
  phase: integer,
  facing: number,
  autoAttack: z.boolean(),
  /** Đuổi đánh một mục tiêu do click (khác tự chiến). Bản lưu cũ có thể thiếu. */
  autoChase: z.boolean().optional(),
  statuses: z
    .array(
      statusApplicationSchema.extend({
        id: z.string(),
        sourceId: z.string(),
        expiresAt: integer,
        nextTick: integer,
        stacks: z.number().int().min(1).max(5),
        attack: nonnegative,
        element,
      }),
    )
    .max(64),
  casting: z
    .object({
      skillId: z.string(),
      targetId: z.string().nullable(),
      point: vec,
      resolveAt: integer,
      level: z.number().int().min(1).max(10),
    })
    .nullable(),
  // Đòn thường chờ tới mốc trúng đòn (Mục 1); bản lưu cũ không có field này.
  strike: z
    .object({
      targetId: z.string(),
      startedAt: integer,
      resolveAt: integer,
      cycleTicks: integer,
    })
    .nullable()
    .optional(),
  brain: z.enum([
    "idle",
    "patrol",
    "chase",
    "attack",
    "return",
    "retreat",
    "telegraph",
    "dead",
  ]),
  threat: z.record(z.string(), nonnegative),
  attackRange: number.positive(),
  attackInterval: number.positive(),
  movementSpeed: number.positive(),
  nextSkillTick: integer,
  farmAnchor: vec.nullable().optional(),
  movementInput: vec.nullable().optional(),
  spawnZoneId: z.string().optional(),
  spawnSlot: integer.optional(),
  elite: z.boolean().optional(),
  /** Tự chiến tạm dừng ngầm khi mở hội thoại/shop. Bản lưu cũ có thể thiếu. */
  autoCombatPaused: z.boolean().optional(),
});
export const characterSchema = z.object({
  playedTicks: integer.default(0),
  characterId: z.string().min(1).max(120),
  nextId: integer,
  name: z.string().trim().min(2).max(18),
  classId: z.string(),
  appearance: z.enum(["male", "female"]),
  level: z.number().int().min(1).max(MAX_CHARACTER_LEVEL),
  experience: nonnegative,
  attributes: z.object({
    strength: z.number().int().min(0).max(10000),
    dexterity: z.number().int().min(0).max(10000),
    vitality: z.number().int().min(0).max(10000),
    energy: z.number().int().min(0).max(10000),
  }),
  attributePoints: integer,
  skillPoints: integer,
  skillLevels: z.record(z.string(), z.number().int().min(0).max(10)),
  inventory: z.array(item).max(INVENTORY_CAPACITY),
  warehouse: z.array(item).max(WAREHOUSE_CAPACITY),
  equipment: z.record(z.string(), item),
  quests: z.array(
    z.object({
      id: z.string(),
      status: z.enum(["active", "ready", "claimed"]),
      progress: integer,
      completions: integer.optional(),
      lastClaimTick: integer.optional(),
    }),
  ),
  /**
   * NPC đã nói chuyện (lưu tick). Bản lưu cũ không có trường này nên để
   * optional; khi nạp bản lưu cũ sẽ tự điền giá trị mặc định rỗng.
   */
  questTalks: z.record(z.string(), integer).optional(),
  gold: integer,
  settings: z.object({
    sound: z.boolean(),
    music: z.boolean(),
    effects: z.enum(["high", "low"]),
    /** 0 = không giới hạn khung hình. Bản lưu cũ chỉ có 30/60 nên vẫn hợp lệ. */
    fps: z.union([z.literal(0), z.literal(30), z.literal(60)]),
  }),
  pendingInteraction: z.string().nullable(),
  branchId: z.string(),
  hotbar: z.array(z.string()).length(4),
  professionXp: z.record(z.string(), integer),
  autoCombat: z.object({
    pickup: z.boolean().default(false),
    lootRarity: z
      .enum(["all", "uncommon", "rare", "epic", "legendary", "mythic"])
      .default("all"),
    stopWhenFull: z.boolean().default(true),
    rotation: z.boolean(),
    potions: z.boolean(),
    hpThreshold: number.min(0).max(1),
    mpThreshold: number.min(0).max(1),
    stopHp: number.min(0).max(1),
    range: number.min(2).max(12),
    /** Bản lưu cũ thiếu 2 cờ này: mặc định bật để hành vi tự chiến đầy đủ. */
    skills: z.boolean().optional(),
    autoPickup: z.boolean().optional(),
  }),
  /**
   * Bộ đếm + thành tựu. Bản lưu cũ thiếu trường này; thế giới sẽ tự suy ra
   * giá trị khởi tạo từ trạng thái hiện tại chứ không xóa dữ liệu nào.
   */
  achievements: z
    .object({
      counters: z.object({
        kills: integer.default(0),
        wolfKills: integer.default(0),
        peakGold: integer.default(0),
        enhancementSuccess: integer.default(0),
      }),
      claimed: z.array(z.string()).default([]),
    })
    .optional(),
  /** Mốc thời gian thật (ms) tinh anh được phép xuất hiện lại. */
  eliteSpawns: z.record(z.string(), integer).optional(),
  /** Cờ bỏ qua mục tiêu của tự chiến (id quái → tick hết hạn). */
  autoCombatSkip: z.record(z.string(), integer).optional(),
  /** Mốc thời gian thật (ms) được phép dịch chuyển nhanh lần kế tiếp. */
  travelReadyAt: integer.optional(),
  /** Save cũ không có trường này; giữ optional để round-trip save/load không đổi shape. */
  enhanceLog: z.array(enhanceRecord).max(20).optional(),
});
export const snapshotSchema = characterSchema.extend({
  schemaVersion: z.literal(2),
  contentVersion: z.literal(CONTENT_VERSION),
  playerId: z.string(),
  tick: integer,
  rngState: integer,
  mapId: z.string(),
  entities: z.record(z.string(), entity),
  groundLoot: z
    .record(
      z.string(),
      vec.extend({
        id: z.string().min(1),
        mapId: z.string(),
        ownerId: z.string(),
        item: item.nullable(),
        gold: integer,
        createdAt: integer,
        expiresAt: integer,
      }),
    )
    .default({}),
  deferredLoot: z
    .record(
      z.string(),
      vec.extend({
        id: z.string().min(1),
        mapId: z.string(),
        ownerId: z.string(),
        item: item.nullable(),
        gold: integer,
        createdAt: integer,
        expiresAt: integer,
      }),
    )
    .default({}),
  lootMetrics: z
    .object({ expired: integer, rejected: integer, commonReplaced: integer })
    .default({ expired: 0, rejected: 0, commonReplaced: 0 }),
  actors: z.record(z.string(), characterSchema),
  visitedMaps: z.array(z.string()),
  paused: z.boolean(),
  worldClock: z.object({
    timeTicks: integer,
    weather: z.enum(["clear", "rain", "mist"]),
    nextWeatherAt: integer,
  }),
  nextWorldId: integer,
  resources: z.record(
    z.string(),
    z.object({ availableAt: integer, harvests: integer }),
  ),
  spawnRegions: z
    .record(z.string(), z.object({ nextCheckAt: integer, serial: integer }))
    .default({}),
  projectiles: z
    .array(
      vec.extend({
        id: z.string(),
        mapId: z.string(),
        sourceId: z.string(),
        skillId: z.string(),
        dx: number,
        dy: number,
        speed: number.positive(),
        remaining: nonnegative,
        radius: number.positive(),
        power: number.positive(),
        element,
        effects: z.array(statusApplicationSchema),
        pierce: z.number().int().min(-1).max(8),
        hitIds: z.array(z.string()),
        lifeSteal: number.min(0).max(1),
      }),
    )
    .max(128),
  telegraphs: z
    .array(
      z.object({
        id: z.string(),
        mapId: z.string(),
        sourceId: z.string(),
        skillId: z.string(),
        position: vec,
        radius: number.positive(),
        resolveAt: integer,
        power: number.positive(),
        element,
        effects: z.array(statusApplicationSchema),
        shape: z.enum(["circle", "cone"]),
        direction: vec,
      }),
    )
    .max(128),
});
export function validateSave(input: unknown): GameSnapshot {
  const migrated = requiresMigration(input) ? migrateSave(input) : input,
    result = snapshotSchema.safeParse(migrated);
  if (!result.success)
    throw new Error(
      `Bản lưu sai cấu trúc hoặc phiên bản không hỗ trợ tại ${result.error.issues[0]?.path.join(".") || "dữ liệu gốc"}.`,
    );
  const s = result.data,
    p = s.entities[s.playerId];
  if (
    !p ||
    p.kind !== "player" ||
    p.name !== s.name ||
    p.level !== s.level ||
    p.mapId !== s.mapId ||
    !maps.some((m) => m.id === s.mapId) ||
    Object.hasOwn(s.actors, s.playerId)
  )
    throw new Error("Dữ liệu nhân vật hoặc bản đồ không hợp lệ.");
  for (const [id, e] of Object.entries(s.entities)) {
    const m = maps.find((m) => m.id === e.mapId);
    if (
      e.id !== id ||
      !(e.kind === "player" ? classDefinitions : monsters).some(
        (d) => d.id === e.definitionId,
      ) ||
      !m ||
      e.x < 0 ||
      e.y < 0 ||
      e.x >= m.width ||
      e.y >= m.height ||
      e.hp > e.maxHp ||
      e.mp > e.maxMp ||
      (e.casting && !skills.some((d) => d.id === e.casting!.skillId))
    )
      throw new Error(
        "Vị trí, chỉ số hoặc kỹ năng đang thi triển không hợp lệ.",
      );
  }
  for (const [key] of Object.entries(s.spawnRegions)) {
    if (!maps.some((m) => m.spawnZones?.some((z) => `${m.id}:${z.id}` === key)))
      throw new Error("Vùng spawn không tồn tại.");
  }
  for (const e of Object.values(s.entities)) {
    if (!e.spawnZoneId) {
      if (e.spawnSlot !== undefined || e.elite !== undefined)
        throw new Error("Thiếu vùng spawn của entity.");
      continue;
    }
    const zone = maps
      .find((m) => m.id === e.mapId)
      ?.spawnZones?.find((z) => z.id === e.spawnZoneId);
    if (
      !zone ||
      e.kind !== "monster" ||
      e.spawnSlot === undefined ||
      e.spawnSlot >= zone.maxPopulation ||
      e.id !== `zone:${e.mapId}:${zone.id}:${e.spawnSlot}` ||
      !zone.pool.some((p) => p.monsterId === e.definitionId) ||
      !zone.levels.some((l) => l.level === e.level)
    )
      throw new Error("Tham chiếu thành viên vùng spawn không hợp lệ.");
  }
  const ids = new Set<string>(),
    characterIds = new Set<string>();
  function validateCharacter(c: CharacterProgress) {
    if (
      !classDefinitions.some((d) => d.id === c.classId) ||
      !getSect(c.classId).branches.some((b) => b.id === c.branchId) ||
      characterIds.has(c.characterId)
    )
      throw new Error(
        "Môn phái, nhánh hoặc quyền sở hữu nhân vật không hợp lệ.",
      );
    characterIds.add(c.characterId);
    for (const i of [
      ...c.inventory,
      ...c.warehouse,
      ...Object.values(c.equipment),
    ]) {
      const d = items.find((d) => d.id === i.definitionId);
      if (
        !d ||
        i.quantity > d.stack ||
        ids.has(i.id) ||
        ((i.enhancement || i.gems?.length) && !isEquipment(d.kind)) ||
        (i.gems?.length ?? 0) > ((i.enhancement ?? 0) >= 3 ? 2 : 1) ||
        (i.gems ?? []).some(
          (id) => items.find((d) => d.id === id)?.kind !== "gem",
        )
      )
        throw new Error("Vật phẩm hoặc ID instance không hợp lệ.");
      ids.add(i.id);
    }
    for (const [slot, i] of Object.entries(c.equipment))
      if (items.find((d) => d.id === i.definitionId)?.kind !== slot)
        throw new Error("Ô trang bị không hợp lệ.");
    for (const [id, level] of Object.entries(c.skillLevels)) {
      const d = skills.find((d) => d.id === id);
      if (!d || level > d.maxLevel || (d.classId && d.classId !== c.classId))
        throw new Error("Kỹ năng không tồn tại hoặc quá cấp.");
    }
    if (
      c.hotbar.some(
        (id) =>
          !skills.some(
            (d) =>
              d.id === id &&
              d.kind !== "passive" &&
              (!d.classId || d.classId === c.classId) &&
              (!d.branchId || d.branchId === c.branchId),
          ),
      )
    )
      throw new Error("Thanh kỹ năng không hợp lệ.");
    const questIds = new Set<string>();
    for (const q of c.quests) {
      const d = quests.find((d) => d.id === q.id);
      if (!d || q.progress > d.count || questIds.has(q.id))
        throw new Error("Nhiệm vụ không hợp lệ.");
      questIds.add(q.id);
    }
  }
  if (
    s.entities[s.playerId].definitionId !== s.classId ||
    s.visitedMaps.some((id) => !maps.some((m) => m.id === id)) ||
    s.projectiles.some(
      (p) =>
        !skills.some((d) => d.id === p.skillId) ||
        !maps.some((m) => m.id === p.mapId),
    ) ||
    s.telegraphs.some((t) => !maps.some((m) => m.id === t.mapId))
  )
    throw new Error("Tham chiếu nội dung trong thế giới không hợp lệ.");
  validateCharacter(s);
  for (const [id, c] of Object.entries(s.actors)) {
    const e = s.entities[id];
    if (
      !e ||
      e.kind !== "player" ||
      e.name !== c.name ||
      e.level !== c.level ||
      e.definitionId !== c.classId
    )
      throw new Error("Actor không sở hữu dữ liệu RPG phù hợp.");
    validateCharacter(c);
  }
  for (const e of Object.values(s.entities))
    if (e.kind === "player" && e.id !== s.playerId && !s.actors[e.id])
      throw new Error("Thiếu dữ liệu RPG của actor.");
  if (Object.keys(s.groundLoot).length > 512)
    throw new Error("Quá nhiều vật phẩm dưới đất.");
  if (Object.keys(s.deferredLoot).length > 2048)
    throw new Error("Kho loot vùng vượt giới hạn.");
  for (const id of Object.keys(s.deferredLoot))
    if (s.groundLoot[id]) throw new Error("ID loot trùng giữa vùng và kho.");
  for (const [id, loot] of Object.entries({
    ...s.groundLoot,
    ...s.deferredLoot,
  })) {
    const map = maps.find((m) => m.id === loot.mapId);
    const definition =
      loot.item && items.find((i) => i.id === loot.item!.definitionId);
    if (
      id !== loot.id ||
      !map ||
      s.entities[loot.ownerId]?.kind !== "player" ||
      loot.x < 0 ||
      loot.y < 0 ||
      loot.x >= map.width ||
      loot.y >= map.height ||
      loot.createdAt > s.tick ||
      loot.expiresAt <= loot.createdAt ||
      (loot.item
        ? !definition ||
          loot.gold !== 0 ||
          loot.item.quantity > definition.stack ||
          ids.has(loot.item.id)
        : loot.gold <= 0)
    )
      throw new Error("Vật phẩm dưới đất hoặc quyền sở hữu không hợp lệ.");
    if (loot.item) ids.add(loot.item.id);
  }
  return s;
}
export interface SaveRecord {
  saveId: string;
  characterId: string;
  snapshot: GameSnapshot;
  savedAt: number;
}
/** Số bản dự phòng xoay vòng giữ lại cho mỗi nhân vật (C1). */
export const BACKUP_SLOTS = 3;
/** Khoảng cách tối thiểu giữa hai lần ghi dự phòng (5 phút). */
export const BACKUP_INTERVAL_MS = 5 * 60 * 1000;
export interface SaveSlotIssue {
  characterId: string;
  name: string;
  error: string;
  hasBackup: boolean;
}
export interface ArchiveRecord {
  archiveId: string;
  characterId: string;
  createdAt: number;
  reason: string;
  snapshot: unknown;
}
class GameDatabase extends Dexie {
  saves!: Table<SaveRecord, string>;
  backups!: Table<SaveRecord, string>;
  archives!: Table<ArchiveRecord, string>;
  constructor() {
    super("kiem-hiep-web");
    this.version(1).stores({
      saves: "saveId,characterId,savedAt",
      backups: "saveId,characterId,savedAt",
    });
    this.version(2).stores({
      saves: "saveId,characterId,savedAt",
      backups: "saveId,characterId,savedAt",
      archives: "archiveId,characterId,createdAt",
    });
  }
}
export class SaveRepository {
  private db = new GameDatabase();
  constructor(private characterSlots = LOCAL_CHARACTER_SLOTS) {}
  async create(snapshot: GameSnapshot) {
    const name = normalizeCharacterName(snapshot.name);
    const error = characterNameError(name);
    if (error) throw new Error(error);
    const copy = structuredClone(snapshot);
    copy.name = name;
    copy.entities[copy.playerId].name = name;
    const valid = validateSave(copy);
    await this.db.transaction("rw", this.db.saves, async () => {
      const records = await this.db.saves.toArray();
      if (records.length >= this.characterSlots)
        throw new Error(
          `Đã đủ ${this.characterSlots} nhân vật. Hãy xóa một nhân vật trước.`,
        );
      if (
        records.some(
          (r) =>
            characterNameKey(
              typeof r.snapshot?.name === "string" ? r.snapshot.name : "",
            ) === characterNameKey(valid.name),
        )
      )
        throw new Error("Tên nhân vật này đã được sử dụng.");
      await this.db.saves.add({
        saveId: `save:${valid.characterId}`,
        characterId: valid.characterId,
        snapshot: valid,
        savedAt: Date.now(),
      });
    });
    return valid;
  }
  async listRaw() {
    return this.db.saves.orderBy("savedAt").reverse().toArray();
  }
  async list() {
    const raw = await this.listRaw();
    const result: SaveRecord[] = [];
    for (const record of raw) {
      const snapshot = await this.readRecord(record);
      result.push({ ...record, snapshot });
    }
    return result;
  }
  async listSlots() {
    const records: SaveRecord[] = [],
      issues: SaveSlotIssue[] = [];
    for (const record of await this.listRaw()) {
      try {
        records.push({ ...record, snapshot: await this.readRecord(record) });
      } catch (error) {
        let hasBackup = false;
        try {
          hasBackup = !!(await this.recover(record.characterId));
        } catch {
          /* Keep both originals for manual recovery. */
        }
        issues.push({
          characterId: record.characterId,
          name:
            typeof record.snapshot?.name === "string"
              ? record.snapshot.name
              : record.characterId,
          error: error instanceof Error ? error.message : String(error),
          hasBackup,
        });
      }
    }
    return { records, issues };
  }
  /**
   * Ghi bản dự phòng xoay vòng (C1).
   *
   * Giữ tối đa `BACKUP_SLOTS` bản gần nhất trong cùng kho lưu trữ, chỉ ghi khi
   * dữ liệu khác bản dự phòng mới nhất VÀ cách lần ghi trước >= 5 phút, để
   * không ghi liên tục theo chu kỳ tự lưu 15 giây.
   */
  private async writeRotatingBackup(previous: SaveRecord) {
    const existing = await this.db.backups.toArray(),
      mine = existing
        .filter((r) => r.characterId === previous.characterId)
        .sort((a, b) => b.savedAt - a.savedAt),
      latest = mine[0];
    if (latest) {
      if (Date.now() - latest.savedAt < BACKUP_INTERVAL_MS) return;
      if (JSON.stringify(latest.snapshot) === JSON.stringify(previous.snapshot))
        return;
    }
    await this.db.backups.put({
      ...previous,
      // Khóa riêng theo mốc thời gian để giữ nhiều bản; `recover` đọc bản mới nhất.
      saveId: `backup:${previous.characterId}:${previous.savedAt}`,
      savedAt: previous.savedAt,
    });
    // Xoá các bản cũ vượt quá số ô dự phòng.
    for (const record of mine.slice(BACKUP_SLOTS - 1))
      await this.db.backups.delete(record.saveId);
  }
  private async readRecord(record: SaveRecord) {
    const snapshot = validateSave(record.snapshot);
    if (requiresMigration(record.snapshot))
      await this.db.transaction(
        "rw",
        this.db.saves,
        this.db.archives,
        async () => {
          await this.db.archives.put({
            archiveId: `migration:${record.saveId}:${record.savedAt}`,
            characterId: record.characterId,
            createdAt: Date.now(),
            reason: `Migration schema/content → v2/${CONTENT_VERSION}, giữ nguyên bản nguồn`,
            snapshot: record.snapshot,
          });
          await this.db.saves.put({ ...record, snapshot });
        },
      );
    return snapshot;
  }
  async save(snapshot: GameSnapshot) {
    const valid = validateSave(snapshot),
      saveId = `save:${valid.characterId}`;
    try {
      await this.db.transaction(
        "rw",
        this.db.saves,
        this.db.backups,
        this.db.archives,
        async () => {
          const previous = await this.db.saves.get(saveId);
          const records = await this.db.saves.toArray();
          if (!previous && records.length >= this.characterSlots)
            throw new Error(
              `Đã đủ ${this.characterSlots} nhân vật. Hãy xóa một nhân vật trước.`,
            );
          if (
            records.some(
              (r) =>
                r.characterId !== valid.characterId &&
                characterNameKey(
                  typeof r.snapshot?.name === "string" ? r.snapshot.name : "",
                ) === characterNameKey(valid.name),
            )
          )
            throw new Error("Tên nhân vật này đã được sử dụng.");
          if (previous) {
            try {
              validateSave(previous.snapshot);
              await this.writeRotatingBackup(previous);
            } catch {
              await this.db.archives.put({
                archiveId: `corrupt:${valid.characterId}:${previous.savedAt}`,
                characterId: valid.characterId,
                createdAt: Date.now(),
                reason: "Giữ primary lỗi, không ghi đè backup tốt",
                snapshot: previous.snapshot,
              });
            }
          }
          await this.db.saves.put({
            saveId,
            characterId: valid.characterId,
            snapshot: valid,
            savedAt: Date.now(),
          });
        },
      );
    } catch (e) {
      if (e instanceof Error && e.name === "QuotaExceededError")
        throw new Error(
          "Bộ nhớ trình duyệt đã đầy. Hãy xuất bản lưu và giải phóng dung lượng; dữ liệu cũ vẫn được giữ.",
        );
      throw e;
    }
  }
  async load(characterId: string) {
    const record = await this.db.saves.get(`save:${characterId}`);
    return record ? this.readRecord(record) : null;
  }
  async recover(characterId: string) {
    // Bản dự phòng mới nhất còn đọc được; khóa có thể là bản cũ một ô hoặc
    // khóa xoay vòng `backup:<characterId>:<savedAt>`.
    const records = (await this.db.backups.toArray())
      .filter((r) => r.characterId === characterId)
      .sort((a, b) => b.savedAt - a.savedAt);
    for (const record of records) {
      try {
        return validateSave(record.snapshot);
      } catch {
        /* thử bản dự phòng kế tiếp */
      }
    }
    return null;
  }
  /** Mốc thời gian bản dự phòng mới nhất còn đọc được (dùng cho thông báo). */
  async backupSavedAt(characterId: string) {
    const records = (await this.db.backups.toArray())
      .filter((r) => r.characterId === characterId)
      .sort((a, b) => b.savedAt - a.savedAt);
    return records[0]?.savedAt ?? null;
  }
  async archives(characterId: string) {
    return this.db.archives.where("characterId").equals(characterId).toArray();
  }
  async delete(characterId: string) {
    await this.db.transaction(
      "rw",
      this.db.saves,
      this.db.backups,
      this.db.archives,
      async () => {
        const previous = await this.db.saves.get(`save:${characterId}`);
        if (previous) {
          await this.db.archives.put({
            archiveId: `deleted:${characterId}:${createLocalCharacterId()}`,
            characterId,
            createdAt: Date.now(),
            reason: "Bản lưu trước khi xóa nhân vật",
            snapshot: previous.snapshot,
          });
        }
        // Lưu trữ TẤT CẢ bản dự phòng xoay vòng trước khi xóa nhân vật.
        const backups = (await this.db.backups.toArray()).filter(
          (r) => r.characterId === characterId,
        );
        for (const backup of backups) {
          await this.db.archives.put({
            archiveId: `deleted-backup:${characterId}:${createLocalCharacterId()}`,
            characterId,
            createdAt: Date.now(),
            reason: "Bản dự phòng trước khi xóa nhân vật",
            snapshot: backup.snapshot,
          });
          await this.db.backups.delete(backup.saveId);
        }
        await this.db.saves.delete(`save:${characterId}`);
      },
    );
  }
  async import(input: unknown) {
    const snapshot = validateSave(input);
    if (requiresMigration(input))
      await this.db.archives.put({
        archiveId: `import:${snapshot.characterId}:${createLocalCharacterId()}`,
        characterId: snapshot.characterId,
        createdAt: Date.now(),
        reason: "Bản nguồn import trước migration",
        snapshot: input,
      });
    await this.save(snapshot);
    return snapshot;
  }
  export(snapshot: GameSnapshot) {
    return JSON.stringify(validateSave(snapshot), null, 2);
  }
}
