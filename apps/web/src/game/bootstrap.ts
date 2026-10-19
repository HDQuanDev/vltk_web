import Phaser from "phaser";
import type { GameSession } from "@kiem-hiep/game-protocol";
import { WorldScene, type WorldCallbacks } from "./scenes/WorldScene";
export function bootGame(
  parent: HTMLElement,
  session: GameSession,
  isBlocked: () => boolean,
  callbacks: WorldCallbacks,
) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#3e573d",
    antialias: true,
    roundPixels: false,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth,
      height: parent.clientHeight,
    },
    fps: {
      target: session.getSnapshot().settings.fps,
      limit: session.getSnapshot().settings.fps,
      forceSetTimeOut: false,
    },
    scene: [new WorldScene(session, isBlocked, callbacks)],
    input: { activePointers: 3 },
    audio: { noAudio: true },
    banner: false,
  });
  let disposed = false;
  return {
    destroy(removeCanvas: boolean) {
      if (disposed) return;
      disposed = true;
      game.destroy(removeCanvas);
      if (removeCanvas) game.canvas?.remove();
    },
  };
}
