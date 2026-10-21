import type { GameEvent, GameSnapshot } from "@kiem-hiep/game-protocol";
import { monsterBossMechanic } from "../animations/monster-sprites";

/**
 * Sự kiện kỹ năng của quái có cơ chế boss (`quake`/`storm`) → trả về tên cơ chế.
 * Chỉ dùng cho lớp hiển thị (rung camera + vòng đất), không đổi gameplay.
 */
export function bossMechanicEvent(
  e: GameEvent,
  s: GameSnapshot,
): "quake" | "storm" | null {
  if (e.type !== "skill" && e.type !== "impact") return null;
  const source = e.entityId ? s.entities[e.entityId] : null;
  if (!source || source.kind !== "monster") return null;
  return monsterBossMechanic(source.definitionId);
}
