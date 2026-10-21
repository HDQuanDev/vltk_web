export const PROTOCOL_VERSION = 1 as const;
export const SAVE_SCHEMA_VERSION = 2 as const;
export const MAX_CHARACTER_LEVEL = 100;
export const INVENTORY_CAPACITY = 32;
export const WAREHOUSE_CAPACITY = 64;
export type Direction8 = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type AnimationState =
  "idle" | "walk" | "attack" | "cast" | "hit" | "dead" | "revive" | "interact";
export type StatusKind =
  | "poison"
  | "burn"
  | "regen"
  | "slow"
  | "stun"
  | "freeze"
  | "silence"
  | "shield"
  | "armorBreak"
  | "haste"
  | "attackBuff"
  | "defenseBuff"
  | "vampirism"
  | "invulnerable";
export interface StatusApplication {
  kind: StatusKind;
  durationTicks: number;
  magnitude: number;
  intervalTicks?: number;
  maxStacks?: number;
}
export interface StatusEffect extends StatusApplication {
  id: string;
  sourceId: string;
  expiresAt: number;
  nextTick: number;
  stacks: number;
  attack: number;
  element: Element;
}
export interface CastState {
  skillId: string;
  targetId: string | null;
  point: Vec2;
  resolveAt: number;
  level: number;
}
export interface Projectile extends Vec2 {
  id: string;
  mapId: string;
  sourceId: string;
  skillId: string;
  dx: number;
  dy: number;
  speed: number;
  remaining: number;
  radius: number;
  power: number;
  element: Element;
  effects: StatusApplication[];
  pierce: number;
  hitIds: string[];
  lifeSteal: number;
}
export interface Telegraph {
  id: string;
  mapId: string;
  sourceId: string;
  skillId: string;
  position: Vec2;
  radius: number;
  resolveAt: number;
  power: number;
  element: Element;
  effects: StatusApplication[];
  shape: "circle" | "cone";
  direction: Vec2;
}
export interface AutoCombatSettings {
  pickup: boolean;
  lootRarity: "all" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";
  stopWhenFull: boolean;
  rotation: boolean;
  potions: boolean;
  hpThreshold: number;
  mpThreshold: number;
  stopHp: number;
  range: number;
  /** Dùng kỹ năng đã gán vào thanh kỹ năng khi tự chiến. */
  skills?: boolean;
  /** Bật/tắt tự nhặt đồ trong bán kính 3 ô khi tự chiến. */
  autoPickup?: boolean;
}
/**
 * Bộ đếm thành tựu lưu theo nhân vật.
 * Bản lưu cũ không có trường này; khởi tạo bằng giá trị suy ra từ trạng thái
 * hiện tại khi nạp lần đầu (xem `initAchievements` trong game-core).
 */
export interface AchievementCounters {
  /** Tổng số quái đã hạ. */
  kills: number;
  /** Số Lang vương đã hạ (tính cả Lang Vương Tinh Anh). */
  wolfKills: number;
  /** Mức bạc cao nhất từng sở hữu cùng lúc. */
  peakGold: number;
  /** Số lần cường hóa thành công tại Công xưởng. */
  enhancementSuccess: number;
}
export interface AchievementState {
  counters: AchievementCounters;
  /** Id thành tựu đã nhận thưởng (mỗi thành tựu chỉ nhận 1 lần). */
  claimed: string[];
}
export type EntityId = string;
export type Vec2 = { x: number; y: number };
export type Element = "metal" | "wood" | "water" | "fire" | "earth";
export type Attributes = {
  strength: number;
  dexterity: number;
  vitality: number;
  energy: number;
};
export type GameCommand =
  | { type: "move"; destination: Vec2 }
  | { type: "steer"; direction: Vec2 }
  | { type: "stop" }
  | { type: "pickup"; lootId: string }
  | { type: "attack"; targetId: EntityId }
  | { type: "skill"; skillId: string; targetId?: EntityId }
  | { type: "interact"; targetId: string }
  | { type: "acceptQuest"; questId: string }
  | { type: "claimQuest"; questId: string }
  | { type: "useItem"; instanceId: string }
  | { type: "equip"; instanceId: string }
  | { type: "unequip"; slot: string }
  | { type: "buy"; itemId: string }
  | { type: "sell"; instanceId: string }
  | { type: "allocate"; attribute: keyof Attributes }
  | { type: "learn"; skillId: string }
  | { type: "autoAttack"; enabled: boolean }
  | { type: "settings"; settings: Partial<GameSettings> }
  | { type: "respawn" }
  | { type: "selectTarget"; targetId: EntityId | null }
  | { type: "branch"; branchId: string }
  | { type: "bindSkill"; slot: number; skillId: string }
  | { type: "enhance"; instanceId: string; protect?: boolean }
  | { type: "socket"; instanceId: string; gemInstanceId: string }
  | { type: "removeGem"; instanceId: string; socket: number }
  | { type: "lockItem"; instanceId: string; locked: boolean }
  | { type: "sortInventory" }
  | { type: "deposit" | "withdraw"; instanceId: string }
  | { type: "gather"; nodeId: string }
  | { type: "craft"; recipeId: string }
  | { type: "resetStats" }
  | { type: "configureAuto"; settings: Partial<AutoCombatSettings> }
  | { type: "pause"; paused: boolean }
  /** Nhận thưởng thành tựu; mỗi thành tựu chỉ nhận được 1 lần. */
  | { type: "claimAchievement"; achievementId: string }
  /**
   * Tạm dừng ngầm tự chiến khi người chơi mở hội thoại/shop.
   * Không phải bật/tắt: `autoAttack` giữ nguyên trạng thái.
   */
  | { type: "autoCombatPaused"; paused: boolean }
  /**
   * Dịch chuyển nhanh giữa khu vực đã khám phá (Thiên hạ đồ).
   * Trừ 30 bạc, dùng điểm đến của cổng truyền tống sẵn có.
   */
  | { type: "travel"; mapId: string };
export interface CommandEnvelope {
  protocolVersion: typeof PROTOCOL_VERSION;
  sequence: number;
  actorId: EntityId;
  command: GameCommand;
}
export interface CombatEntity extends Vec2 {
  id: EntityId;
  kind: "player" | "monster";
  definitionId: string;
  name: string;
  mapId: string;
  level: number;
  hp: number;
  mp: number;
  maxHp: number;
  maxMp: number;
  attack: number;
  defense: number;
  element: Element;
  path: Vec2[];
  spawn: Vec2;
  state: AnimationState;
  direction: Direction8;
  stateStartedAt: number;
  statuses: StatusEffect[];
  casting: CastState | null;
  brain:
    | "idle"
    | "patrol"
    | "chase"
    | "attack"
    | "return"
    | "retreat"
    | "telegraph"
    | "dead";
  threat: Record<string, number>;
  attackRange: number;
  attackInterval: number;
  movementSpeed: number;
  nextSkillTick: number;
  stateUntil: number;
  targetId: EntityId | null;
  cooldowns: Record<string, number>;
  respawnAt: number;
  nextAttack: number;
  phase: number;
  facing: number;
  autoAttack: boolean;
  /**
   * Đuổi đánh đúng một mục tiêu do người chơi click (không phải tự chiến).
   * Tự chiến dùng `autoAttack`; hai cờ loại trừ nhau.
   */
  autoChase?: boolean;
  farmAnchor?: Vec2 | null;
  movementInput?: Vec2 | null;
  spawnZoneId?: string;
  spawnSlot?: number;
  elite?: boolean;
  /**
   * Tự chiến đang bị tạm dừng ngầm (đang mở hội thoại/shop). Không phải trạng
   * thái bật/tắt: bật/tắt nằm ở `autoAttack`, cờ này chỉ chặn ra quyết định.
   */
  autoCombatPaused?: boolean;
}
export interface GroundLoot extends Vec2 {
  id: string;
  mapId: string;
  ownerId: EntityId;
  item: ItemInstance | null;
  gold: number;
  createdAt: number;
  expiresAt: number;
}
export interface WorldTotals {
  entities: number;
  monsters: number;
  groundLoot: number;
  deferredLoot: number;
  maps: number;
}
export interface ItemAffix {
  id: string;
  stat: "attack" | "defense" | "maxHp" | "maxMp";
  value: number;
}
export interface ItemInstance {
  id: string;
  definitionId: string;
  quantity: number;
  enhancement?: number;
  locked?: boolean;
  gems?: string[];
  /** Phụ từ ngẫu nhiên sinh khi rơi, do authority RNG quyết định. */
  affixes?: ItemAffix[];
}
export interface QuestProgress {
  id: string;
  status: "active" | "ready" | "claimed";
  progress: number;
  completions?: number;
  lastClaimTick?: number;
}
export interface GameSettings {
  sound: boolean;
  music: boolean;
  effects: "high" | "low";
  /** 0 = không giới hạn khung hình, 30/60 = giới hạn theo FPS. */
  fps: 0 | 30 | 60;
}
export interface CharacterProgress {
  playedTicks: number;
  characterId: string;
  nextId: number;
  name: string;
  classId: string;
  appearance: "male" | "female";
  level: number;
  experience: number;
  attributes: Attributes;
  attributePoints: number;
  skillPoints: number;
  skillLevels: Record<string, number>;
  inventory: ItemInstance[];
  equipment: Record<string, ItemInstance>;
  warehouse: ItemInstance[];
  quests: QuestProgress[];
  /**
   * NPC đã hoàn thành bước hội thoại, lưu tick đã nói chuyện.
   * Bản lưu cũ không có trường này; tự điền mặc định rỗng khi nạp.
   */
  questTalks?: Record<string, number>;
  gold: number;
  settings: GameSettings;
  pendingInteraction: string | null;
  branchId: string;
  hotbar: string[];
  professionXp: Record<string, number>;
  autoCombat: AutoCombatSettings;
  /** Lịch sử cường hóa gần nhất, giới hạn 20 dòng. */
  enhanceLog?: EnhanceRecord[];
  /**
   * Bộ đếm + thành tựu đã nhận thưởng. Bản lưu cũ không có trường này;
   * `createGame` khởi tạo mới, khi nạp bản lưu cũ thì suy ra từ trạng thái.
   */
  achievements?: AchievementState;
  /**
   * Mốc thời gian thật (ms) tinh anh được phép xuất hiện lại theo từng mục
   * trong danh sách tinh anh. Bản lưu cũ thiếu trường thì khởi tạo bằng
   * "bây giờ + chu kỳ" để người chơi không bị dồn nhiều tinh anh cùng lúc.
   */
  eliteSpawns?: Record<string, number>;
  /** Cờ 10 giây bỏ qua mục tiêu của tự chiến (id quái → mốc hết hạn, tick). */
  autoCombatSkip?: Record<string, number>;
  /**
   * Mốc thời gian thật (ms) được phép dịch chuyển nhanh lần kế tiếp.
   * Bản lưu cũ thiếu trường thì coi như đã sẵn sàng.
   */
  travelReadyAt?: number;
}
export interface GameSnapshot extends CharacterProgress {
  schemaVersion: 2;
  contentVersion: string;
  playerId: string;
  tick: number;
  rngState: number;
  mapId: string;
  entities: Record<string, CombatEntity>;
  groundLoot: Record<string, GroundLoot>;
  deferredLoot: Record<string, GroundLoot>;
  lootMetrics: { expired: number; rejected: number; commonReplaced: number };
  /** Dữ liệu RPG của các actor khác; actor được chọn nằm ở root để giữ contract UI. */
  actors: Record<string, CharacterProgress>;
  visitedMaps: string[];
  projectiles: Projectile[];
  telegraphs: Telegraph[];
  nextWorldId: number;
  paused: boolean;
  worldClock: {
    timeTicks: number;
    weather: "clear" | "rain" | "mist";
    nextWeatherAt: number;
  };
  resources: Record<string, { availableAt: number; harvests: number }>;
  spawnRegions: Record<string, { nextCheckAt: number; serial: number }>;
  /**
   * Chỉ có trên view snapshot gửi cho client: tổng số toàn world để HUD báo
   * dung lượng pool trong khi payload đã được lọc theo bản đồ đang xem.
   */
  worldTotals?: WorldTotals;
}
export interface GameEvent {
  id: number;
  tick: number;
  type:
    | "message"
    | "damage"
    | "heal"
    | "death"
    | "loot"
    | "level"
    | "skill"
    | "map"
    | "quest"
    | "dialogue"
    | "error"
    | "projectile"
    | "impact"
    | "status"
    | "interrupt"
    | "telegraph"
    | "craft"
    | "resource"
    | "equipment";
  text: string;
  entityId?: string;
  targetId?: string;
  value?: number;
  skillId?: string;
  critical?: boolean;
  /**
   * Nguồn sát thương, gắn tại nơi sinh ra số (damage pipeline) để tầng hiển
   * thị phân loại màu/cỡ mà không phải đoán lại (A3).
   */
  damageSource?: "basic" | "skill" | "dot" | "dodge";
  position?: Vec2;
  radius?: number;
  resolveAt?: number;
  element?: Element;
  statusKind?: StatusKind;
  /** Kết quả của giao dịch có RNG (ví dụ cường hóa) để UI/VFX phản hồi đúng. */
  success?: boolean;
}
export interface EnhanceRecord {
  tick: number;
  definitionId: string;
  from: number;
  to: number;
  success: boolean;
  /** Có dùng Đá Hộ Mệnh cho lần đập này. */
  protected: boolean;
}
export interface SimulationDiagnostics {
  active: number;
  nearby: number;
  inactive: number;
  aiUpdated: number;
  spawned: number;
  deferred: number;
  checks: number;
  tickMs: number;
  publishMs: number;
}
export interface GameUpdate {
  snapshot: GameSnapshot;
  events: GameEvent[];
  acknowledgedSequence: number;
  diagnostics?: SimulationDiagnostics;
}
export interface GameSession {
  start(): Promise<void>;
  sendCommand(command: GameCommand): void;
  subscribe(listener: (update: GameUpdate) => void): () => void;
  getSnapshot(): GameSnapshot;
  dispose(): Promise<void>;
}

export * from "./validation";
export * from "./characters";
