import {
  getMap,
  monsters,
  npcs,
  type MapDefinition,
  type SpawnZoneDefinition,
} from "../../../game-content/src/index";
import type {
  CombatEntity,
  GameSnapshot,
  Vec2,
} from "../../../game-protocol/src/index";
import { distance, isWalkable } from "./navigation";
import type { SeededRandom } from "../engine/random";
export function zoneBounds(zone: SpawnZoneDefinition) {
  const a = zone.area;
  if (a.kind === "circle")
    return {
      minX: a.x - a.radius,
      minY: a.y - a.radius,
      maxX: a.x + a.radius,
      maxY: a.y + a.radius,
    };
  return {
    minX: Math.min(...a.points.map((p) => p.x)),
    minY: Math.min(...a.points.map((p) => p.y)),
    maxX: Math.max(...a.points.map((p) => p.x)),
    maxY: Math.max(...a.points.map((p) => p.y)),
  };
}
export function insideSpawnZone(zone: SpawnZoneDefinition, p: Vec2) {
  const a = zone.area;
  if (a.kind === "circle") return distance(p, a) <= a.radius;
  let inside = false;
  for (let i = 0, j = a.points.length - 1; i < a.points.length; j = i++) {
    const v = a.points[i],
      w = a.points[j];
    if (
      v.y > p.y !== w.y > p.y &&
      p.x < ((w.x - v.x) * (p.y - v.y)) / (w.y - v.y) + v.x
    )
      inside = !inside;
  }
  return inside;
}
export function validSpawnPosition(
  map: MapDefinition,
  zone: SpawnZoneDefinition,
  point: Vec2,
  occupants: CombatEntity[],
  ignoreId?: string,
) {
  return (
    insideSpawnZone(zone, point) &&
    isWalkable(map, point) &&
    !map.portals.some((p) => distance(p, point) < 4) &&
    !npcs.some((n) => n.mapId === map.id && distance(n, point) < 3) &&
    !(map.areas ?? []).some(
      (a) => a.kind === "safe" && distance(a, point) <= a.radius,
    ) &&
    // Footprints are checked in collision data; avoid visual trunks/roof entrances too.
    !map.props.some((p) => p.type === "house" && distance(p, point) < 4) &&
    !occupants.some(
      (e) =>
        e.id !== ignoreId &&
        e.mapId === map.id &&
        e.hp > 0 &&
        distance(e, point) < (e.kind === "player" ? 7 : 1.5),
    )
  );
}
export const zoneRespawnDelay = (
  z: SpawnZoneDefinition,
  random: SeededRandom,
) =>
  z.respawnTicks[0] +
  Math.floor(random.next() * (z.respawnTicks[1] - z.respawnTicks[0] + 1));
function weighted<T extends { weight: number }>(
  entries: T[],
  random: SeededRandom,
): T {
  let roll = random.next() * entries.reduce((sum, e) => sum + e.weight, 0);
  return (
    entries.find((e) => (roll -= e.weight) < 0) ?? entries[entries.length - 1]
  );
}
export function updateSpawnRegions(
  state: GameSnapshot,
  players: CombatEntity[],
  random: SeededRandom,
  spawn: (
    definitionId: string,
    mapId: string,
    x: number,
    y: number,
    id: string,
  ) => CombatEntity,
  revive: (entity: CombatEntity) => void,
) {
  let spawned = 0,
    deferred = 0,
    checks = 0;
  const occupants = Object.values(state.entities);
  for (const mapId of [...new Set(players.map((p) => p.mapId))].sort()) {
    const map = getMap(mapId);
    let mapCount = occupants.filter(
      (e) => e.kind === "monster" && e.mapId === mapId && e.hp > 0,
    ).length;
    for (const zone of map.spawnZones ?? []) {
      const bounds = zoneBounds(zone),
        center = {
          x: (bounds.minX + bounds.maxX) / 2,
          y: (bounds.minY + bounds.maxY) / 2,
        };
      if (
        !players.some(
          (p) =>
            p.mapId === mapId && distance(p, center) <= zone.activationRadius,
        )
      )
        continue;
      const key = `${mapId}:${zone.id}`,
        record = (state.spawnRegions[key] ??= { nextCheckAt: 0, serial: 0 });
      if (record.nextCheckAt > state.tick) continue;
      record.nextCheckAt = state.tick + 20;
      checks++;
      const area =
        zone.area.kind === "circle"
          ? Math.PI * zone.area.radius ** 2
          : (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
      const target = Math.min(
        zone.maxPopulation,
        Math.max(zone.minPopulation, Math.floor(area * zone.density)),
      );
      for (let slot = 0; slot < target; slot++) {
        const id = `zone:${mapId}:${zone.id}:${slot}`,
          existing = state.entities[id];
        if (existing && (existing.hp > 0 || existing.respawnAt > state.tick))
          continue;
        if (spawned >= 4 || mapCount >= (map.maxMonsters ?? 128)) {
          deferred++;
          continue;
        }
        let point: Vec2 | undefined;
        for (let attempt = 0; attempt < 24; attempt++) {
          const candidate = {
            x: Math.round(
              bounds.minX + random.next() * (bounds.maxX - bounds.minX),
            ),
            y: Math.round(
              bounds.minY + random.next() * (bounds.maxY - bounds.minY),
            ),
          };
          if (validSpawnPosition(map, zone, candidate, occupants, id)) {
            point = candidate;
            break;
          }
        }
        if (!point) {
          deferred++;
          continue;
        }
        if (existing) {
          existing.spawn = { ...point };
          revive(existing);
        } else {
          const definition = weighted(zone.pool, random).monsterId;
          const entity = spawn(definition, mapId, point.x, point.y, id);
          const base = monsters.find((d) => d.id === definition)!;
          entity.level = weighted(zone.levels, random).level;
          entity.elite = random.next() < zone.eliteChance;
          const scale =
            (1 + Math.max(0, entity.level - base.level) * 0.12) *
            (entity.elite ? 1.6 : 1);
          entity.maxHp = entity.hp = Math.round(base.hp * scale);
          entity.attack = Math.round(base.attack * scale);
          entity.defense = Math.round(base.defense * scale);
          entity.spawnZoneId = zone.id;
          entity.spawnSlot = slot;
          if (entity.elite) entity.name += " · Tinh anh";
          occupants.push(entity);
        }
        spawned++;
        mapCount++;
        record.serial++;
      }
    }
  }
  return { spawned, deferred, checks };
}
