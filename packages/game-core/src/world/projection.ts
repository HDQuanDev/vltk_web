import { resourceNodes } from "../../../game-content/src/index";
import type {
  CharacterProgress,
  CombatEntity,
  GameSnapshot,
  GroundLoot,
  ItemInstance,
  Projectile,
  Telegraph,
  WorldTotals,
} from "../../../game-protocol/src/index";

/**
 * View projection tách dữ liệu authority khỏi những gì client cần vẽ.
 *
 * Authority giữ toàn bộ entity/loot của mọi bản đồ đã thăm (dormant). View chỉ
 * gửi entity, loot, projectile và telegraph thuộc bản đồ đang có người chơi, nên
 * chi phí publish không còn tăng theo số bản đồ đã thăm. Đây là bước chuẩn bị cho
 * interest/delta của RemoteGameSession, không phải gameplay rule: mọi kết quả
 * vẫn do simulation quyết định.
 */
export interface ViewScope {
  viewerId: string;
  maps: string[];
}

interface EntityScan {
  entities: CombatEntity[];
  totals: WorldTotals;
  maps: string[];
}

/**
 * Một vòng quét duy nhất vừa tính tổng toàn world vừa xác định bản đồ cần gửi.
 * `state.entities` chứa cả entity dormant, nên số vòng quét quyết định trực tiếp
 * chi phí publish.
 */
function scanEntities(state: GameSnapshot, viewerId: string): EntityScan {
  const entities = Object.values(state.entities);
  const maps = new Set<string>();
  maps.add(state.entities[viewerId]?.mapId ?? state.mapId);
  let monsters = 0;
  for (const entity of entities) {
    if (entity.kind === "monster") monsters++;
    else maps.add(entity.mapId);
  }
  return {
    entities,
    maps: [...maps].sort(),
    totals: {
      entities: entities.length,
      monsters,
      groundLoot: Object.keys(state.groundLoot).length,
      deferredLoot: Object.keys(state.deferredLoot).length,
      maps: state.visitedMaps.length,
    },
  };
}

/** Bản đồ được publish: bản đồ của viewer và bản đồ có player khác. */
export function viewScope(state: GameSnapshot, viewerId: string): ViewScope {
  return { viewerId, maps: scanEntities(state, viewerId).maps };
}

export function worldTotals(state: GameSnapshot): WorldTotals {
  return scanEntities(state, state.playerId).totals;
}

const cloneItem = (item: ItemInstance): ItemInstance => ({
  ...item,
  gems: item.gems ? [...item.gems] : item.gems,
});

const cloneItems = (items: ItemInstance[]) => items.map(cloneItem);

const cloneEquipment = (equipment: Record<string, ItemInstance>) => {
  const copy: Record<string, ItemInstance> = {};
  for (const [slot, item] of Object.entries(equipment))
    copy[slot] = cloneItem(item);
  return copy;
};

const cloneEntity = (e: CombatEntity): CombatEntity => ({
  ...e,
  path: e.path.map((point) => ({ ...point })),
  spawn: { ...e.spawn },
  statuses: e.statuses.map((status) => ({ ...status })),
  casting: e.casting ? { ...e.casting, point: { ...e.casting.point } } : null,
  threat: { ...e.threat },
  cooldowns: { ...e.cooldowns },
  farmAnchor: e.farmAnchor ? { ...e.farmAnchor } : null,
  movementInput: e.movementInput ? { ...e.movementInput } : null,
});

const cloneLoot = (loot: GroundLoot): GroundLoot => ({
  ...loot,
  item: loot.item ? cloneItem(loot.item) : null,
});

const cloneProjectile = (p: Projectile): Projectile => ({
  ...p,
  effects: p.effects.map((effect) => ({ ...effect })),
  hitIds: [...p.hitIds],
});

const cloneTelegraph = (z: Telegraph): Telegraph => ({
  ...z,
  position: { ...z.position },
  direction: { ...z.direction },
  effects: z.effects.map((effect) => ({ ...effect })),
});

const cloneProgress = (p: CharacterProgress): CharacterProgress => ({
  ...p,
  attributes: { ...p.attributes },
  skillLevels: { ...p.skillLevels },
  inventory: cloneItems(p.inventory),
  equipment: cloneEquipment(p.equipment),
  warehouse: cloneItems(p.warehouse),
  quests: p.quests.map((quest) => ({ ...quest })),
  questTalks: { ...(p.questTalks ?? {}) },
  settings: { ...p.settings },
  hotbar: [...p.hotbar],
  professionXp: { ...p.professionXp },
  autoCombat: { ...p.autoCombat },
});

let resourceMaps: { size: number; lookup: Map<string, string> } | null = null;

/**
 * `state.resources` được đánh khoá theo node id, không theo bản đồ. Lookup chỉ
 * dựng lại khi danh sách node đổi kích thước (content tĩnh khi game chạy).
 */
function resourceMapId(nodeId: string) {
  if (!resourceMaps || resourceMaps.size !== resourceNodes.length)
    resourceMaps = {
      size: resourceNodes.length,
      lookup: new Map(resourceNodes.map((node) => [node.id, node.mapId])),
    };
  return resourceMaps.lookup.get(nodeId);
}

/** Snapshot cho client: chỉ dữ liệu thuộc `viewScope`, kèm tổng số toàn world. */
export function projectView(
  state: GameSnapshot,
  viewerId: string,
): GameSnapshot {
  const scan = scanEntities(state, viewerId);
  const included = new Set(scan.maps);
  const view: GameSnapshot = {
    ...state,
    attributes: { ...state.attributes },
    skillLevels: { ...state.skillLevels },
    inventory: cloneItems(state.inventory),
    warehouse: cloneItems(state.warehouse),
    quests: state.quests.map((quest) => ({ ...quest })),
    questTalks: { ...(state.questTalks ?? {}) },
    settings: { ...state.settings },
    hotbar: [...state.hotbar],
    professionXp: { ...state.professionXp },
    autoCombat: { ...state.autoCombat },
    actors: {},
    entities: {},
    groundLoot: {},
    deferredLoot: {},
    projectiles: [],
    telegraphs: [],
    resources: {},
    spawnRegions: {},
    worldTotals: scan.totals,
  };
  for (const entity of scan.entities) {
    if (!included.has(entity.mapId)) continue;
    view.entities[entity.id] = cloneEntity(entity);
    if (entity.kind === "player" && entity.id !== viewerId) {
      const progress = state.actors[entity.id];
      if (progress) view.actors[entity.id] = cloneProgress(progress);
    }
  }
  for (const loot of Object.values(state.groundLoot))
    if (included.has(loot.mapId)) view.groundLoot[loot.id] = cloneLoot(loot);
  for (const loot of Object.values(state.deferredLoot))
    if (included.has(loot.mapId)) view.deferredLoot[loot.id] = cloneLoot(loot);
  view.projectiles = state.projectiles
    .filter((p) => included.has(p.mapId))
    .map(cloneProjectile);
  view.telegraphs = state.telegraphs
    .filter((z) => included.has(z.mapId))
    .map(cloneTelegraph);
  for (const [nodeId, resource] of Object.entries(state.resources)) {
    const mapId = resourceMapId(nodeId);
    if (mapId && included.has(mapId)) view.resources[nodeId] = { ...resource };
  }
  for (const [key, region] of Object.entries(state.spawnRegions))
    if (included.has(key.slice(0, key.indexOf(":"))))
      view.spawnRegions[key] = { ...region };
  return view;
}
