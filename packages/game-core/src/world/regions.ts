import type {
  CombatEntity,
  GameSnapshot,
  Vec2,
} from "../../../game-protocol/src/index";
import { distance } from "./navigation";
export type SimulationTier = "active" | "nearby" | "inactive";
export const SIMULATION_RADII = { active: 24, nearby: 48 };
/** Rebuilt at a tick boundary. Buckets contain IDs, never serialized renderer objects. */
export class EntitySpatialIndex {
  private buckets = new Map<string, CombatEntity[]>();
  rebuild(entities: Record<string, CombatEntity>) {
    this.buckets.clear();
    for (const e of Object.values(entities)) {
      const key = this.key(e.mapId, Math.floor(e.x / 16), Math.floor(e.y / 16));
      const bucket = this.buckets.get(key) ?? [];
      bucket.push(e);
      this.buckets.set(key, bucket);
    }
  }
  private key(map: string, x: number, y: number) {
    return `${map}:${x}:${y}`;
  }
  query(mapId: string, point: Vec2, radius: number) {
    const result: CombatEntity[] = [];
    // One extra cell covers entities that move after this tick's index rebuild.
    for (
      let y = Math.floor((point.y - radius) / 16) - 1;
      y <= Math.floor((point.y + radius) / 16) + 1;
      y++
    )
      for (
        let x = Math.floor((point.x - radius) / 16) - 1;
        x <= Math.floor((point.x + radius) / 16) + 1;
        x++
      )
        for (const e of this.buckets.get(this.key(mapId, x, y)) ?? [])
          if (e.mapId === mapId && distance(point, e) <= radius) result.push(e);
    return result;
  }
}
export function simulationTier(
  e: CombatEntity,
  players: CombatEntity[],
  state: GameSnapshot,
): SimulationTier {
  if (e.kind === "player") return "active";
  // DOT, casts and returning combat actors must finish; distance never cancels damage.
  if (
    e.statuses.length ||
    e.casting ||
    e.brain === "return" ||
    (e.targetId && state.entities[e.targetId]?.mapId === e.mapId) ||
    state.projectiles.some(
      (p) => p.sourceId === e.id || p.hitIds.includes(e.id),
    ) ||
    state.telegraphs.some((z) => z.sourceId === e.id)
  )
    return "active";
  let nearest = Infinity;
  for (const p of players)
    if (p.mapId === e.mapId) nearest = Math.min(nearest, distance(p, e));
  return nearest <= SIMULATION_RADII.active
    ? "active"
    : nearest <= SIMULATION_RADII.nearby
      ? "nearby"
      : "inactive";
}
export const regionKey = (mapId: string, point: Vec2) =>
  `${mapId}:${Math.floor(point.x / 16)}:${Math.floor(point.y / 16)}`;
