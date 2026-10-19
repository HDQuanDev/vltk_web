import {
  maps,
  npcs,
  resourceNodes,
  recipes,
  type quests,
} from "@kiem-hiep/game-content";
import type {
  GameSnapshot,
  GameCommand,
  QuestProgress,
} from "@kiem-hiep/game-protocol";
export function questNavigation(
  s: GameSnapshot,
  q: (typeof quests)[number],
  progress?: QuestProgress,
): GameCommand | null {
  let destinationMap = "",
    point: { x: number; y: number } | undefined,
    npcId = "";
  if (!progress || progress.status === "ready") {
    const npc = npcs.find((n) => n.id === q.npc);
    if (!npc) return null;
    destinationMap = npc.mapId;
    npcId = npc.id;
  } else if (q.objectiveKind === "explore") {
    const map = maps.find(
      (m) => m.id === q.target || m.areas?.some((a) => a.id === q.target),
    );
    if (!map) return null;
    destinationMap = map.id;
    point = map.areas?.find((a) => a.id === q.target) ?? map.spawn;
  } else if (q.objectiveKind === "kill") {
    const map =
      maps.find(
        (m) =>
          m.id === s.mapId &&
          (!q.mapId || q.mapId === m.id) &&
          m.spawns.some((p) => p.monsterId === q.target),
      ) ??
      maps.find(
        (m) =>
          (!q.mapId || q.mapId === m.id) &&
          m.spawns.some((p) => p.monsterId === q.target),
      );
    if (!map) return null;
    destinationMap = map.id;
    point = map.spawns.find((p) => p.monsterId === q.target);
  } else if (q.objectiveKind === "collect") {
    const node =
      resourceNodes.find((n) => n.itemId === q.target && n.mapId === s.mapId) ??
      resourceNodes.find((n) => n.itemId === q.target);
    if (!node) return null;
    destinationMap = node.mapId;
    point = node;
  } else if (q.objectiveKind === "craft") {
    const recipe = recipes.find((r) => r.id === q.target),
      npc = npcs.find((n) => n.id === recipe?.station);
    if (!npc) return null;
    destinationMap = npc.mapId;
    npcId = npc.id;
  } else return null;
  if (destinationMap === s.mapId)
    return npcId
      ? { type: "interact", targetId: npcId }
      : point
        ? { type: "move", destination: { x: point.x, y: point.y } }
        : null;
  const queue = [{ id: s.mapId, first: "" }],
    seen = new Set([s.mapId]);
  while (queue.length) {
    const cur = queue.shift()!;
    for (const portal of maps.find((m) => m.id === cur.id)!.portals) {
      if (seen.has(portal.to)) continue;
      const first = cur.first || portal.id;
      if (portal.to === destinationMap)
        return { type: "interact", targetId: `portal:${first}` };
      seen.add(portal.to);
      queue.push({ id: portal.to, first });
    }
  }
  return null;
}
