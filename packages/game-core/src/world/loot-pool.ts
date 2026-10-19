import {
  getItem,
  rarityPriority,
} from "../../../game-content/src/index";
import type {
  GameSnapshot,
  GroundLoot,
  CombatEntity,
} from "../../../game-protocol/src/index";
import { distance } from "./navigation";
import { regionKey } from "./regions";
export const LOOT_POOL_LIMITS = { active: 512, region: 64, deferred: 2048 };
export { rarityPriority };
export const lootPriority = (l: GroundLoot) =>
  l.item ? rarityPriority[getItem(l.item.definitionId).rarity] : 0;
export type LootAdmission =
  "active" | "deferred" | "replaced-common" | "rejected";
/** Capacity affects representation, never inventory. Rare drops displace common entries first. */
export function admitGroundLoot(
  s: GameSnapshot,
  loot: GroundLoot,
): LootAdmission {
  const active = Object.values(s.groundLoot),
    region = regionKey(loot.mapId, loot);
  const inRegion = active.filter((l) => regionKey(l.mapId, l) === region);
  // Make a rare beam visible immediately even if a region is filled with common drops.
  if (
    lootPriority(loot) >= 3 &&
    (active.length >= LOOT_POOL_LIMITS.active ||
      inRegion.length >= LOOT_POOL_LIMITS.region)
  ) {
    const victim = (
      inRegion.length >= LOOT_POOL_LIMITS.region ? inRegion : active
    )
      .filter((l) => lootPriority(l) < 3)
      .sort(
        (a, b) =>
          lootPriority(a) - lootPriority(b) || a.createdAt - b.createdAt,
      )[0];
    if (
      victim &&
      Object.keys(s.deferredLoot).length < LOOT_POOL_LIMITS.deferred
    ) {
      delete s.groundLoot[victim.id];
      s.deferredLoot[victim.id] = victim;
      s.groundLoot[loot.id] = loot;
      return "active";
    }
    if (victim) {
      delete s.groundLoot[victim.id];
      s.groundLoot[loot.id] = loot;
      s.lootMetrics.commonReplaced++;
      return "replaced-common";
    }
  }
  if (
    active.length < LOOT_POOL_LIMITS.active &&
    active.filter((l) => regionKey(l.mapId, l) === region).length <
      LOOT_POOL_LIMITS.region
  ) {
    s.groundLoot[loot.id] = loot;
    return "active";
  }
  if (Object.keys(s.deferredLoot).length < LOOT_POOL_LIMITS.deferred) {
    s.deferredLoot[loot.id] = loot;
    return "deferred";
  }
  const candidate = Object.values(s.deferredLoot)
    .filter((l) => lootPriority(l) < 3 && lootPriority(l) < lootPriority(loot))
    .sort(
      (a, b) => lootPriority(a) - lootPriority(b) || a.createdAt - b.createdAt,
    )[0];
  if (candidate) {
    delete s.deferredLoot[candidate.id];
    s.deferredLoot[loot.id] = loot;
    s.lootMetrics.commonReplaced++;
    return "replaced-common";
  }
  s.lootMetrics.rejected++;
  return "rejected";
}
export function updateLootPools(s: GameSnapshot, players: CombatEntity[]) {
  for (const pool of [s.groundLoot, s.deferredLoot])
    for (const [id, loot] of Object.entries(pool))
      if (loot.expiresAt <= s.tick) {
        delete pool[id];
        s.lootMetrics.expired++;
      }
  if (s.tick % 20 !== 0) return;
  // A dormant region keeps the exact instances and expiry in serialized reserve storage.
  for (const [id, loot] of Object.entries(s.groundLoot))
    if (
      !players.some((p) => p.mapId === loot.mapId && distance(p, loot) <= 48) &&
      Object.keys(s.deferredLoot).length < LOOT_POOL_LIMITS.deferred
    ) {
      s.deferredLoot[id] = loot;
      delete s.groundLoot[id];
    }
  const counts = new Map<string, number>();
  for (const loot of Object.values(s.groundLoot)) {
    const key = regionKey(loot.mapId, loot);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let size = Object.keys(s.groundLoot).length,
    promoted = 0;
  const nearby = Object.values(s.deferredLoot).filter((l) =>
    players.some(
      (p) => p.id === l.ownerId && p.mapId === l.mapId && distance(p, l) <= 48,
    ),
  );
  nearby.sort(
    (a, b) => lootPriority(b) - lootPriority(a) || a.createdAt - b.createdAt,
  );
  for (const loot of nearby) {
    if (size >= LOOT_POOL_LIMITS.active || promoted >= 16) break;
    const key = regionKey(loot.mapId, loot);
    if ((counts.get(key) ?? 0) >= LOOT_POOL_LIMITS.region) continue;
    delete s.deferredLoot[loot.id];
    s.groundLoot[loot.id] = loot;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    size++;
    promoted++;
  }
}
