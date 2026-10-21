import Phaser from "phaser";
import type { GameSession } from "@kiem-hiep/game-protocol";
import { WorldScene, type WorldCallbacks } from "./scenes/WorldScene";
import { getPreferences, setPreferences } from "./preferences";
/** Hợp đồng chung cho cả hai bộ hiển thị (Phaser 2D và Three.js 3D). */
export interface BootedRenderer {
  destroy(removeCanvas: boolean): void;
  /** Đổi giới hạn khung hình ngay khi đang chạy (0 = không giới hạn). */
  setFpsLimit?(fps: number): void;
}
/**
 * Áp giới hạn khung hình vào TimeStep đang chạy mà không khởi tạo lại game.
 * `fpsLimit`/`_limitRate` là các trường Phaser dùng lại mỗi vòng lặp.
 */
function applyFpsLimit(loop: Phaser.Core.TimeStep, fps: number) {
  const limit = fps > 0 ? fps : 0;
  // `_limitRate` là trường nội bộ Phaser dùng lại mỗi vòng lặp; khai báo kiểu
  // tối thiểu tại đây thay vì sửa thư viện.
  const internals = loop as unknown as {
    fpsLimit: number;
    hasFpsLimit: boolean;
    _limitRate: number;
  };
  internals.fpsLimit = limit;
  internals.hasFpsLimit = limit > 0;
  internals._limitRate = limit > 0 ? 1000 / limit : 0;
}
function bootPhaser(
  parent: HTMLElement,
  session: GameSession,
  isBlocked: () => boolean,
  callbacks: WorldCallbacks,
): BootedRenderer {
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
    setFpsLimit(fps: number) {
      applyFpsLimit(game.loop, fps);
    },
  };
}
export function bootGame(
  parent: HTMLElement,
  session: GameSession,
  isBlocked: () => boolean,
  callbacks: WorldCallbacks,
): BootedRenderer {
  // Nhánh 2D giữ nguyên từng dòng hành vi cũ.
  if (getPreferences().renderMode !== "3d")
    return bootPhaser(parent, session, isBlocked, callbacks);
  // Nhánh 3D: nạp lười three (bundle chính không phình), lỗi bất kỳ thì rơi
  // về Phaser 2D để người chơi không bao giờ gặp màn hình trắng.
  let disposed = false;
  let active: BootedRenderer | null = null;
  const fallbackToPhaser = (reason: string) => {
    if (disposed) return;
    disposed = true;
    // Hạ pref về "2d" TRƯỚC khi báo lỗi: lần bootGame kế tiếp sẽ vào thẳng
    // bản 2D, không lặp lại lỗi 3D (App.tsx hiện màn hình lỗi khi onError).
    setPreferences({ renderMode: "2d" });
    try {
      active = bootPhaser(parent, session, isBlocked, callbacks);
    } catch (e) {
      callbacks.onError(`Không khởi động được bản đồ: ${String(e)}`);
      return;
    }
    callbacks.onError(
      `Không khởi động được bộ hiển thị 3D (${reason}). Đã chuyển về bản 2D.`,
    );
  };
  void import("./three/ThreeWorld")
    .then(({ ThreeWorld }) => {
      if (disposed) return;
      try {
        active = new ThreeWorld({ parent, session, isBlocked, callbacks });
      } catch (e) {
        fallbackToPhaser(e instanceof Error ? e.message : String(e));
      }
    })
    .catch((e) =>
      fallbackToPhaser(e instanceof Error ? e.message : String(e)),
    );
  return {
    destroy(removeCanvas: boolean) {
      if (disposed) {
        active?.destroy(removeCanvas);
        return;
      }
      disposed = true;
      active?.destroy(removeCanvas);
    },
  };
}
