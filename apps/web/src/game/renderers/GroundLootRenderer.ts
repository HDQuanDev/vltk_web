import { interfaceIcons, itemArtKey } from "../../ui/interface-art";
import Phaser from "phaser";
import { getItem } from "@kiem-hiep/game-content";
import { worldToScreen } from "@kiem-hiep/game-core";
import type { GameSnapshot, GroundLoot } from "@kiem-hiep/game-protocol";

const colors: Record<string, number> = {
  common: 0xe0d9bd,
  uncommon: 0xa9d483,
  rare: 0x8ccfed,
  epic: 0xd0a1f1,
  legendary: 0xf2c14e,
  mythic: 0xf07a6a,
};
export class GroundLootRenderer {
  private views = new Map<
    string,
    {
      container: Phaser.GameObjects.Container;
      icon: Phaser.GameObjects.Graphics | Phaser.GameObjects.Image;
      glow: Phaser.GameObjects.Ellipse;
      label: Phaser.GameObjects.Text;
    }
  >();
  constructor(
    private scene: Phaser.Scene,
    private onPickup: (id: string) => void,
  ) {}
  private create(loot: GroundLoot) {
    const definition = loot.item ? getItem(loot.item.definitionId) : null;
    const color = definition ? colors[definition.rarity] : 0xe9c76b;
    const container = this.scene.add.container(0, 0);
    const glow = this.scene.add
      .ellipse(0, 0, 31, 13, color, 0.18)
      .setStrokeStyle(1, color, 0.55);
    let icon: Phaser.GameObjects.Graphics | Phaser.GameObjects.Image =
      this.scene.add.graphics();
    icon.lineStyle(1.5, color, 1);
    icon.fillStyle(color, 0.85);
    if (!definition) {
      icon.fillEllipse(0, -7, 16, 9).strokeEllipse(0, -10, 16, 9);
      icon.fillRect(-6, -13, 12, 4);
    } else if (definition.kind === "weapon") {
      icon.lineStyle(4, 0xd7e8e1).lineBetween(-6, -1, 8, -22);
      icon
        .lineStyle(3, 0xc5a766)
        .lineBetween(-8, -10, 4, -3)
        .lineBetween(-7, -1, -11, 5);
    } else if (definition.kind === "consumable") {
      icon
        .fillStyle(definition.restore === "hp" ? 0xd66d51 : 0x65b6e1)
        .fillCircle(0, -8, 7);
      icon.fillStyle(0xc5a766).fillRect(-3, -20, 6, 6);
    } else if (definition.kind === "gem") {
      icon.fillPoints(
        [
          { x: 0, y: -23 },
          { x: 10, y: -13 },
          { x: 0, y: -2 },
          { x: -10, y: -13 },
        ],
        true,
      );
    } else if (definition.kind === "armor") {
      icon.fillPoints(
        [
          { x: -5, y: -21 },
          { x: -13, y: -14 },
          { x: -9, y: -8 },
          { x: -5, y: -11 },
          { x: -7, y: 0 },
          { x: 7, y: 0 },
          { x: 5, y: -11 },
          { x: 9, y: -8 },
          { x: 13, y: -14 },
          { x: 5, y: -21 },
          { x: 0, y: -16 },
        ],
        true,
      );
    } else if (definition.kind === "boots") {
      icon.fillRect(-7, -21, 8, 18).fillRect(-7, -8, 17, 8);
    } else {
      icon.fillTriangle(-10, -3, 0, -23, 10, -3);
      if (definition.id === "herb")
        icon.lineStyle(2, 0xc1e69d).lineBetween(0, 0, 0, -25);
    }
    if (definition && this.scene.textures.exists("interface-icons")) {
      const index = interfaceIcons.indexOf(
        itemArtKey(definition.id) as (typeof interfaceIcons)[number],
      );
      if (index >= 0) {
        icon.destroy();
        icon = this.scene.add
          .image(0, -12, "interface-icons", index)
          .setDisplaySize(30, 30)
          .setRotation(-0.12);
      }
    }
    if (
      definition &&
      ["rare", "epic", "legendary", "mythic"].includes(definition.rarity)
    ) {
      const beam = this.scene.add
        .graphics()
        .lineStyle(2, color, 0.3)
        .lineBetween(0, -7, 0, -60);
      container.add(beam);
    }
    const label = this.scene.add
      .text(0, 9, definition?.name ?? `${loot.gold} bạc`, {
        fontFamily: "Arial",
        fontSize: "11px",
        color: Phaser.Display.Color.IntegerToColor(color).rgba,
        backgroundColor: "#10251ec9",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true })
      .on(
        "pointerdown",
        (
          _p: Phaser.Input.Pointer,
          _x: number,
          _y: number,
          event: Phaser.Types.Input.EventData,
        ) => {
          event.stopPropagation();
          this.onPickup(loot.id);
        },
      );
    container.add([glow, icon, label]);
    const view = { container, icon, glow, label };
    this.views.set(loot.id, view);
    return view;
  }
  update(s: GameSnapshot) {
    const view = this.scene.cameras.main.worldView;
    const occupied: {
      left: number;
      top: number;
      right: number;
      bottom: number;
    }[] = [];
    for (const [id, v] of this.views) {
      const loot = s.groundLoot[id];
      if (!loot || loot.mapId !== s.mapId || loot.expiresAt <= s.tick) {
        v.container.destroy();
        this.views.delete(id);
      }
    }
    for (const loot of Object.values(s.groundLoot)) {
      if (loot.mapId !== s.mapId || loot.ownerId !== s.playerId) continue;
      const p = worldToScreen(loot);
      const visible =
        p.x > view.left - 120 &&
        p.x < view.right + 120 &&
        p.y > view.top - 100 &&
        p.y < view.bottom + 100;
      let v = this.views.get(loot.id);
      if (!visible) {
        if (v) {
          v.container.destroy();
          this.views.delete(loot.id);
        }
        continue;
      }
      v ??= this.create(loot);
      v.container
        .setPosition(p.x, p.y)
        .setDepth(p.y + 1)
        .setVisible(visible);
      const age = s.tick - loot.createdAt;
      v.icon.setY(
        age < 12
          ? -Math.sin((age / 12) * Math.PI) * 15
          : Math.sin(age / 12) * 1.5,
      );
      v.glow.setAlpha(0.65 + Math.sin(age / 10) * 0.25);
      if (visible) {
        let y = 9;
        const left = p.x - v.label.width / 2,
          right = p.x + v.label.width / 2;
        for (
          let i = 0;
          i < 16 &&
          occupied.some(
            (b) =>
              left < b.right &&
              right > b.left &&
              p.y + y < b.bottom &&
              p.y + y + v.label.height > b.top,
          );
          i++
        )
          y += v.label.height + 2;
        v.label.setY(y);
        occupied.push({
          left,
          right,
          top: p.y + y,
          bottom: p.y + y + v.label.height,
        });
      }
    }
  }
  destroy() {
    for (const v of this.views.values()) v.container.destroy();
    this.views.clear();
  }
}
