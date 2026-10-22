import Phaser from "phaser";
import { getMap } from "@kiem-hiep/game-content";
import { TICK_RATE, worldToScreen } from "@kiem-hiep/game-core";
import type { GameSnapshot } from "@kiem-hiep/game-protocol";
import { getPreferences } from "../preferences";
import { clampCameraCenter, LANDSCAPE_PADDING } from "../world/chunks";
import { dampingFactor } from "../renderers/motion";
/** Camera nhìn trước tối đa 24px màn hình theo hướng di chuyển. */
const LOOKAHEAD_PX = 24;
/** Đứng yên quá 300ms thì vector nhìn trước tự về 0. */
const LOOKAHEAD_IDLE_MS = 300;
/** Nhanh hơn tốc độ đi bộ gốc 15%, giữ liên tục 1 giây → phóng nhẹ. */
const FAST_SPEED_RATIO = 1.15;
const FAST_HOLD_MS = 1000;
const FAST_ZOOM = 1.05;
export class CameraController {
  /** Zoom người chơi đặt bằng lăn chuột — không bị hiệu ứng phóng ghi đè. */
  private zoom = 1;
  private mapId = "";
  private lead = { x: 0, y: 0 };
  private lastRendered?: { x: number; y: number };
  private lastMovedAt = 0;
  private sample?: { x: number; y: number; tick: number };
  private speed = 0;
  private fastFor = 0;
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
    this.lead = { x: 0, y: 0 };
    this.lastRendered = undefined;
    this.sample = undefined;
    this.speed = 0;
    this.fastFor = 0;
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
  /** Hướng di chuyển suy từ hiệu vị trí container, làm mượt như nội suy camera. */
  private trackLookahead(base: { x: number; y: number }, delta: number) {
    const last = this.lastRendered;
    this.lastRendered = { x: base.x, y: base.y };
    const factor = 1 - Math.exp(-delta / 140);
    if (last) {
      const mx = base.x - last.x,
        my = base.y - last.y,
        len = Math.hypot(mx, my);
      if (len > 0.5) {
        this.lead.x = Phaser.Math.Linear(
          this.lead.x,
          (mx / len) * LOOKAHEAD_PX,
          factor,
        );
        this.lead.y = Phaser.Math.Linear(
          this.lead.y,
          (my / len) * LOOKAHEAD_PX,
          factor,
        );
        this.lastMovedAt = this.scene.time.now;
      }
    }
    if (this.scene.time.now - this.lastMovedAt > LOOKAHEAD_IDLE_MS) {
      this.lead.x = Phaser.Math.Linear(this.lead.x, 0, factor);
      this.lead.y = Phaser.Math.Linear(this.lead.y, 0, factor);
    }
    return this.lead;
  }
  /** Tốc độ (đơn vị thế giới/giây) suy từ snapshot qua các tick. */
  private trackSpeed(s: GameSnapshot, delta: number) {
    const p = s.entities[s.playerId],
      sample = this.sample;
    if (!sample || s.tick !== sample.tick) {
      if (sample && s.tick > sample.tick)
        this.speed = Phaser.Math.Linear(
          this.speed,
          Math.hypot(p.x - sample.x, p.y - sample.y) /
            ((s.tick - sample.tick) / TICK_RATE),
          0.35,
        );
      this.sample = { x: p.x, y: p.y, tick: s.tick };
    }
    const threshold = Math.max(0.1, p.movementSpeed) * FAST_SPEED_RATIO;
    if (this.speed > threshold)
      this.fastFor = Math.min(FAST_HOLD_MS, this.fastFor + delta);
    else this.fastFor = Math.max(0, this.fastFor - delta * 2);
    return this.fastFor >= FAST_HOLD_MS;
  }
  update(
    s: GameSnapshot,
    delta: number,
    renderedPosition?: { x: number; y: number },
  ) {
    if (s.mapId !== this.mapId) this.reset(s);
    const prefs = getPreferences(),
      cam = this.scene.cameras.main,
      base = renderedPosition ?? worldToScreen(s.entities[s.playerId]),
      assisted = prefs.cameraLookahead && !prefs.reducedMotion;
    if (!assisted) {
      this.lead = { x: 0, y: 0 };
      this.lastRendered = undefined;
    }
    const lead = assisted ? this.trackLookahead(base, delta) : { x: 0, y: 0 },
      target = this.limit({ x: base.x + lead.x, y: base.y + lead.y });
    // Nhìn trước + phóng nhẹ chỉ đổi zoom đích; zoom gốc vẫn do lăn chuột giữ.
    const wanted =
        this.zoom * (assisted && this.trackSpeed(s, delta) ? FAST_ZOOM : 1),
      zoomFactor = prefs.reducedMotion ? 1 : 1 - Math.exp(-delta / 220),
      nextZoom = Phaser.Math.Linear(cam.zoom, wanted, zoomFactor);
    if (Math.abs(nextZoom - cam.zoom) > 0.0005) cam.setZoom(nextZoom);
    const at = {
        x: cam.scrollX + cam.width / 2,
        y: cam.scrollY + cam.height / 2,
      },
      dx = target.x - at.x,
      dy = target.y - at.y;
    // Dịch chuyển tức thời (đổi map, hồ thành phù, hồi sinh): bám thẳng, không trượt.
    if (Math.hypot(dx, dy) > 400 / cam.zoom) {
      const snapped = this.limit({ x: target.x, y: target.y });
      cam.centerOn(snapped.x, snapped.y);
      return;
    }
    if (Math.hypot(dx, dy) < 10 / cam.zoom) return;
    // B1.4: giảm chấn hàm mũ theo thời gian thực, hằng số CAMERA_SMOOTHING = 8.
    const factor = prefs.reducedMotion ? 1 : dampingFactor(delta),
      max = delta * 0.95;
    const next = {
        x: at.x + Phaser.Math.Clamp(dx * factor, -max, max),
        y: at.y + Phaser.Math.Clamp(dy * factor, -max, max),
      },
      limited = this.limit(next);
    cam.centerOn(limited.x, limited.y);
  }
}
