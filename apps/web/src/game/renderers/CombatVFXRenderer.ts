import Phaser from "phaser";
import { worldToScreen } from "@kiem-hiep/game-core";
import type {
  GameEvent,
  GameSnapshot,
  Element,
} from "@kiem-hiep/game-protocol";
import { elementColor } from "../animations/atlas";
import { getPreferences, qualityBudget } from "../preferences";
import { bossMechanicEvent } from "../world/boss-effects";
interface Burst {
  object: Phaser.GameObjects.Graphics;
  until: number;
  start: number;
  x: number;
  y: number;
  /** "ground" = vòng đất lan của boss (nội suy bán kính 0→90px). */
  kind: "burst" | "ground";
}
interface Popup {
  object: Phaser.GameObjects.Text;
  until: number;
  start: number;
  y: number;
}
export class CombatVFXRenderer {
  private free: Phaser.GameObjects.Graphics[] = [];
  private active: Burst[] = [];
  private texts: Popup[] = [];
  private freeText: Phaser.GameObjects.Text[] = [];
  constructor(private scene: Phaser.Scene) {}
  event(e: GameEvent, s: GameSnapshot) {
    const entity = e.entityId ? s.entities[e.entityId] : null;
    if (!entity || entity.mapId !== s.mapId) return;
    const at = worldToScreen(e.position ?? entity);
    const camera = this.scene.cameras.main;
    if (!camera.worldView.contains(at.x, at.y)) return;
    if (["damage", "heal", "level"].includes(e.type)) this.popup(e, at);
    if (
      !["skill", "impact", "damage", "heal", "level", "status"].includes(
        e.type,
      ) ||
      (e.type === "damage" && !e.value)
    )
      return;
    const limit = qualityBudget(this.scene.scale.width).maxEffects;
    if (this.active.length >= limit) return;
    // Boss dùng kỹ năng cơ chế (quake/storm): thêm vòng elip lan trên mặt đất
    // đúng tỉ lệ phối cảnh iso 2:1, dùng chung bể Graphics và trần maxEffects.
    const ground = !!bossMechanicEvent(e, s),
      y = ground ? at.y : at.y - 20;
    const g = (this.free.pop() ?? this.scene.add.graphics())
      .clear()
      .setVisible(true)
      .setAlpha(1)
      .setScale(1)
      .setPosition(at.x, y)
      .setDepth(at.y + 100);
    const element = e.element ?? entity.element;
    const impact = e.type === "damage" || e.type === "impact",
      size = e.type === "level" ? 60 : impact ? 28 : 43;
    if (ground) this.drawGroundRing(g);
    else this.draw(g, element, size, e.type === "heal" || e.skillId === "heal");
    const start = this.scene.time.now;
    this.active.push({
      object: g,
      start,
      until: start + (ground ? 520 : impact ? 330 : 650),
      x: at.x,
      y,
      kind: ground ? "ground" : "burst",
    });
  }
  /** Vòng đất lan: bán kính ngang 90px, dọc 45px (iso 2:1); update() nở dần. */
  private drawGroundRing(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0xd8c9a2, 0.12).fillEllipse(0, 0, 180, 90);
    g.lineStyle(3.5, 0xe7cb96, 0.85).strokeEllipse(0, 0, 180, 90);
    g.lineStyle(1.2, 0xf5e6c1, 0.6).strokeEllipse(0, 0, 150, 75);
  }
  private draw(
    g: Phaser.GameObjects.Graphics,
    element: Element,
    size: number,
    healing: boolean,
  ) {
    const color = healing ? 0xb7df9c : elementColor(element);
    g.lineStyle(2.4, color, 0.9).fillStyle(color, 0.5);
    if (healing || element === "wood") {
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3,
          x = Math.cos(a) * size * 0.6,
          y = Math.sin(a) * size * 0.35;
        g.beginPath();
        g.arc(x, y, 9, a, a + Math.PI * 1.5);
        g.strokePath();
        g.fillEllipse(x, y - 8, 5, 12);
      }
      g.lineStyle(1, 0xd4edb5, 0.6).strokeEllipse(0, 0, size * 1.8, size * 0.8);
    } else if (element === "metal") {
      for (let i = 0; i < 3; i++) {
        const y = (i - 1) * 12;
        g.lineStyle(5 - i, color, 0.7).lineBetween(
          -size + i * 5,
          y + 10,
          size - i * 3,
          y - 12,
        );
      }
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4,
          x = Math.cos(a) * size,
          y = Math.sin(a) * size * 0.6;
        g.fillTriangle(x, y - 5, x + 3, y, x, y + 5);
      }
    } else if (element === "water") {
      for (let i = 0; i < 7; i++) {
        const a = (i * Math.PI * 2) / 7,
          x = Math.cos(a) * size * 0.8,
          y = Math.sin(a) * size * 0.45;
        g.fillStyle(i % 2 ? 0xe1f0ed : color, 0.7).fillTriangle(
          x,
          y - 19,
          x + 6,
          y + 7,
          x - 6,
          y + 7,
        );
      }
      g.lineStyle(2, color, 0.65).strokeEllipse(0, 4, size * 2, size * 0.8);
    } else if (element === "fire") {
      for (let i = 0; i < 7; i++) {
        const x = ((i - 3) * size) / 4,
          y = Math.abs(i - 3) * 3;
        g.fillStyle(i % 2 ? 0xffd29a : color, 0.65).fillTriangle(
          x - 9,
          y + 10,
          x + Math.sin(i) * 6,
          y - 25 - (i % 3) * 7,
          x + 10,
          y + 10,
        );
      }
      g.lineStyle(2, 0xfbe3ae, 0.7)
        .beginPath()
        .arc(0, 0, size, -Math.PI, 0)
        .strokePath();
    } else {
      g.lineStyle(3, color, 0.65).strokeEllipse(0, 8, size * 2.2, size);
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3,
          x = Math.cos(a) * size * 0.7,
          y = Math.sin(a) * size * 0.35;
        g.fillStyle(i % 2 ? 0xc2aa7d : color, 0.75).fillPoints(
          [
            { x: x - 7, y: y + 3 },
            { x: x - 4, y: y - 9 },
            { x: x + 5, y: y - 12 },
            { x: x + 9, y: y + 1 },
          ],
          true,
        );
        g.lineStyle(1, 0xf0d7a4, 0.6).lineBetween(x - 4, y - 9, x + 5, y - 12);
      }
    }
  }
  private popup(e: GameEvent, at: { x: number; y: number }) {
    if (this.texts.length >= 16) return;
    const t = (
      this.freeText.pop() ??
      this.scene.add.text(0, 0, "", {
        fontFamily: "Georgia",
        fontStyle: "bold",
        stroke: "#16241e",
        strokeThickness: 3,
      })
    )
      .setVisible(true)
      .setAlpha(1)
      .setOrigin(0.5)
      .setPosition(at.x + ((e.id % 3) - 1) * 9, at.y - 77)
      .setDepth(10001)
      .setText(
        e.type === "level"
          ? "ĐỘT PHÁ"
          : e.type === "heal"
            ? `+${e.value ?? ""}`
            : e.text,
      )
      .setFontSize(e.critical ? 27 : 19)
      .setColor(
        e.type === "heal" ? "#c8efae" : e.critical ? "#ffe3a3" : "#f0d39a",
      );
    const start = this.scene.time.now;
    this.texts.push({ object: t, start, until: start + 850, y: at.y - 77 });
  }
  update(paused: boolean) {
    const now = this.scene.time.now;
    if (paused) {
      for (const b of [...this.active, ...this.texts]) {
        b.until += this.scene.game.loop.delta;
        b.start += this.scene.game.loop.delta;
      }
      return;
    }
    this.active = this.active.filter((b) => {
      if (now >= b.until) {
        b.object.setVisible(false);
        this.free.push(b.object);
        return false;
      }
      const p = (now - b.start) / (b.until - b.start),
        still = getPreferences().reducedMotion;
      // Vòng đất: bán kính lan 0 → 90px. Burst thường giữ nhịp phồng cũ.
      b.object
        .setAlpha(1 - p)
        .setScale(
          still ? 1 : b.kind === "ground" ? Math.max(0.05, p) : 1 + p * 0.55,
        );
      return true;
    });
    this.texts = this.texts.filter((t) => {
      if (now >= t.until) {
        t.object.setVisible(false);
        this.freeText.push(t.object);
        return false;
      }
      const p = (now - t.start) / (t.until - t.start);
      t.object
        .setAlpha(1 - p)
        .setY(t.y - (getPreferences().reducedMotion ? 0 : p * 48));
      return true;
    });
  }
  get activeEffects() {
    return this.active.length;
  }
  destroy() {
    for (const g of [...this.free, ...this.active.map((b) => b.object)])
      g.destroy();
    for (const t of [...this.freeText, ...this.texts.map((t) => t.object)])
      t.destroy();
    this.free = [];
    this.active = [];
    this.texts = [];
    this.freeText = [];
  }
}
