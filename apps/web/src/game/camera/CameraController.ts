import Phaser from "phaser";
import { getMap } from "@kiem-hiep/game-content";
import { worldToScreen } from "@kiem-hiep/game-core";
import type { GameSnapshot } from "@kiem-hiep/game-protocol";
import { getPreferences } from "../preferences";
import { clampCameraCenter, LANDSCAPE_PADDING } from "../world/chunks";
export class CameraController {
  private zoom = 1;
  private mapId = "";
  constructor(private scene: Phaser.Scene) {
    scene.input.on(
      "wheel",
      (
        _p: Phaser.Input.Pointer,
        _objects: unknown,
        _dx: number,
        dy: number,
      ) => {
        this.zoom = Math.max(0.72, Math.min(1.8, this.zoom - dy * 0.0007));
        this.scene.cameras.main.setZoom(this.zoom);
      },
    );
  }
  reset(s: GameSnapshot) {
    this.mapId = s.mapId;
    this.zoom =
      this.scene.scale.width < 1000
        ? 0.86
        : Math.min(1.18, Math.max(0.95, this.scene.scale.width / 1440));
    const map = getMap(s.mapId),
      min =
        (this.scene.scale.width / 192 + this.scene.scale.height / 96) /
        (Math.min(map.width, map.height) / 2 + LANDSCAPE_PADDING - 2);
    this.zoom = Math.max(this.zoom, min);
    const cam = this.scene.cameras.main;
    cam.removeBounds();
    cam.setZoom(this.zoom);
    const p = this.limit(worldToScreen(s.entities[s.playerId]));
    cam.centerOn(p.x, p.y);
  }
  private limit(p: { x: number; y: number }) {
    const m = getMap(this.mapId),
      cam = this.scene.cameras.main;
    return clampCameraCenter(
      p,
      m.width,
      m.height,
      cam.width,
      cam.height,
      cam.zoom,
    );
  }
  update(
    s: GameSnapshot,
    delta: number,
    renderedPosition?: { x: number; y: number },
  ) {
    if (s.mapId !== this.mapId) this.reset(s);
    const cam = this.scene.cameras.main,
      target = this.limit(
        renderedPosition ?? worldToScreen(s.entities[s.playerId]),
      ),
      at = { x: cam.scrollX + cam.width / 2, y: cam.scrollY + cam.height / 2 },
      dx = target.x - at.x,
      dy = target.y - at.y;
    if (Math.hypot(dx, dy) < 10 / cam.zoom) return;
    const factor = getPreferences().reducedMotion
        ? 1
        : 1 - Math.exp(-delta / 140),
      max = delta * 0.95;
    const next = {
        x: at.x + Phaser.Math.Clamp(dx * factor, -max, max),
        y: at.y + Phaser.Math.Clamp(dy * factor, -max, max),
      },
      limited = this.limit(next);
    cam.centerOn(limited.x, limited.y);
  }
}
