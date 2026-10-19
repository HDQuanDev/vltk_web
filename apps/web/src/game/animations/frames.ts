import type { AnimationState, Direction8 } from "@kiem-hiep/game-protocol";
import { actorVisualManifest } from "@kiem-hiep/game-content";
export function animationFrame(
  state: AnimationState,
  direction: Direction8,
  tick: number,
  startedAt: number,
) {
  const elapsed = Math.max(0, tick - startedAt),
    stateIndex = actorVisualManifest.states.indexOf(state);
  const frame =
    state === "idle"
      ? Math.floor(elapsed / 5) % 6
      : state === "walk"
        ? Math.floor(elapsed / 1.6) % 6
        : state === "cast" || state === "interact"
          ? Math.floor(elapsed / 2) % 6
          : Math.min(5, Math.floor(elapsed / (state === "dead" ? 3 : 2)));
  return Math.max(0, stateIndex) * 48 + direction * 6 + frame;
}
