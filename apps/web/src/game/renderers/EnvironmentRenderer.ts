import { qualityBudget } from "../preferences";
import Phaser from "phaser";
import { resourceNodes } from "@kiem-hiep/game-content";
import { worldToScreen } from "@kiem-hiep/game-core";
import type { GameSnapshot } from "@kiem-hiep/game-protocol";
import { elementColor } from "../animations/atlas";
export class EnvironmentRenderer {
  private ground: Phaser.GameObjects.Graphics;
  private air: Phaser.GameObjects.Graphics;
  private weather: Phaser.GameObjects.Graphics;
  private night: Phaser.GameObjects.Rectangle;
  private labels = new Map<string, Phaser.GameObjects.Text>();
  constructor(private scene: Phaser.Scene) {
    this.ground = scene.add.graphics().setDepth(-1);
    this.air = scene.add.graphics().setDepth(5000);
    this.weather = scene.add.graphics().setDepth(9000).setScrollFactor(0);
    this.night = scene.add
      .rectangle(0, 0, 1, 1, 0x122138, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(8999);
  }
  changeMap(mapId: string) {
    for (const l of this.labels.values()) l.destroy();
    this.labels.clear();
    for (const node of resourceNodes.filter((n) => n.mapId === mapId)) {
      const p = worldToScreen(node);
      this.labels.set(
        node.id,
        this.scene.add
          .text(p.x, p.y - 27, node.name, {
            fontFamily: "Arial",
            fontSize: "10px",
            color: "#d1d6a2",
            stroke: "#243a2d",
            strokeThickness: 3,
          })
          .setOrigin(0.5)
          .setDepth(p.y + 50),
      );
    }
  }
  update(s: GameSnapshot) {
    const p = s.entities[s.playerId],
      ground = this.ground,
      air = this.air;
    ground.clear();
    air.clear();
    if (p.targetId && p.hp > 0) {
      const loc = worldToScreen(p);
      ground
        .lineStyle(1, 0xc9bd8a, 0.18)
        .strokeEllipse(loc.x, loc.y, p.attackRange * 136, p.attackRange * 68);
    }
    for (const zone of s.telegraphs.filter((z) => z.mapId === s.mapId)) {
      const loc = worldToScreen(zone.position),
        remaining = Math.max(0, zone.resolveAt - s.tick);
      ground
        .fillStyle(0xc65f48, 0.16 + 0.12 * (1 - remaining / 30))
        .fillEllipse(loc.x, loc.y, zone.radius * 136, zone.radius * 68);
      ground
        .lineStyle(2, 0xf2a077, 0.75)
        .strokeEllipse(loc.x, loc.y, zone.radius * 136, zone.radius * 68);
      ground
        .lineStyle(1, 0xf2c99a, 0.5)
        .strokeEllipse(
          loc.x,
          loc.y,
          zone.radius * 136 * (1 - remaining / 32),
          zone.radius * 68 * (1 - remaining / 32),
        );
    }
    for (const projectile of s.projectiles.filter((p) => p.mapId === s.mapId)) {
      const loc = worldToScreen(projectile),
        tail = worldToScreen({
          x: projectile.x - projectile.dx * 0.5,
          y: projectile.y - projectile.dy * 0.5,
        }),
        color = elementColor(projectile.element);
      air
        .lineStyle(4, color, 0.2)
        .lineBetween(tail.x, tail.y - 25, loc.x, loc.y - 25);
      air
        .lineStyle(1.6, color, 0.9)
        .lineBetween(tail.x, tail.y - 25, loc.x, loc.y - 25);
      if (projectile.element === "water")
        air
          .fillStyle(0xd9f5ef, 0.95)
          .fillTriangle(
            loc.x,
            loc.y - 34,
            loc.x - 4,
            loc.y - 22,
            loc.x + 4,
            loc.y - 22,
          );
      else if (projectile.element === "fire")
        air
          .fillStyle(0xffcc84, 0.9)
          .fillTriangle(
            loc.x,
            loc.y - 35,
            loc.x - 5,
            loc.y - 22,
            loc.x + 6,
            loc.y - 22,
          );
      else if (projectile.element === "metal")
        air
          .lineStyle(2, 0xf5e3a9, 0.9)
          .lineBetween(loc.x - 4, loc.y - 21, loc.x + 4, loc.y - 32);
      else air.fillStyle(0xf4edcb, 1).fillCircle(loc.x, loc.y - 25, 3);
    }
    for (const node of resourceNodes.filter((n) => n.mapId === s.mapId)) {
      const loc = worldToScreen(node),
        ready = (s.resources[node.id]?.availableAt ?? 0) <= s.tick;
      const label = this.labels.get(node.id);
      label?.setAlpha(ready ? 0.9 : 0.35);
      ground
        .fillStyle(ready ? 0xb4c68a : 0x6c816c, ready ? 0.3 : 0.12)
        .fillEllipse(loc.x, loc.y, 26, 13);
      if (node.kind === "herbalism") {
        for (let i = 0; i < 4; i++) {
          air
            .lineStyle(2, ready ? 0x9fb66f : 0x667c5e, 0.9)
            .lineBetween(
              loc.x,
              loc.y,
              loc.x + (i - 1.5) * 5,
              loc.y - 10 - (i % 2) * 5,
            );
          air
            .fillStyle(0xc5d89a, ready ? 0.9 : 0.3)
            .fillEllipse(loc.x + (i - 1.5) * 5, loc.y - 12 - (i % 2) * 5, 6, 3);
        }
      } else if (node.kind === "mining") {
        air
          .fillStyle(ready ? 0xa7aaa0 : 0x6b7e70, 1)
          .fillTriangle(
            loc.x - 9,
            loc.y,
            loc.x - 3,
            loc.y - 17,
            loc.x + 11,
            loc.y - 4,
          );
        air
          .lineStyle(1, 0xd2caa6, 0.7)
          .lineBetween(loc.x - 3, loc.y - 17, loc.x + 1, loc.y - 4);
      } else {
        air
          .lineStyle(7, ready ? 0x9c835b : 0x60715c, 0.9)
          .lineBetween(loc.x - 10, loc.y - 3, loc.x + 9, loc.y - 10);
        air
          .lineStyle(1, 0xc5b185, 0.8)
          .lineBetween(loc.x - 9, loc.y - 5, loc.x + 9, loc.y - 12);
      }
    }
    const width = this.scene.scale.width,
      height = this.scene.scale.height;
    this.night.setSize(width, height);
    const day = (s.worldClock.timeTicks % 24000) / 24000,
      night = Math.max(0, -Math.sin(day * Math.PI * 2));
    this.night.setAlpha(night * 0.36);
    this.weather.clear();
    if (s.worldClock.weather === "rain") {
      const count =
        s.settings.effects === "high" ? qualityBudget(width).weather : 15;
      this.weather.lineStyle(1, 0xc1dad2, 0.23);
      for (let i = 0; i < count; i++) {
        const x = (((i * 137.3 - s.tick * 1.9) % width) + width) % width,
          y = (i * 97.7 + s.tick * 8) % height;
        this.weather.lineBetween(x, y, x - 4, y + 14);
      }
    } else if (s.worldClock.weather === "mist") {
      this.weather.fillStyle(0xaebfb5, 0.04);
      for (let i = 0; i < 5; i++)
        this.weather.fillEllipse(
          ((s.tick * 0.3 + i * 233) % (width + 300)) - 150,
          height * (0.15 + i * 0.16),
          width * 0.8,
          90,
        );
    }
    if (s.settings.effects === "high") {
      this.air.fillStyle(0xf0d9bc, 0.35);
      for (let i = 0; i < 12; i++) {
        const x = (((i * 211 + s.tick * 0.3) % width) + width) % width,
          y = (i * 93 + s.tick * 0.7) % height;
        const point = this.scene.cameras.main.getWorldPoint(x, y);
        air.fillEllipse(point.x, point.y, 2.5, 1);
      }
    }
  }
  destroy() {
    this.ground.destroy();
    this.air.destroy();
    this.weather.destroy();
    this.night.destroy();
    for (const l of this.labels.values()) l.destroy();
    this.labels.clear();
  }
}
