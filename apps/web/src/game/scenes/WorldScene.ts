import { getPreferences } from "../preferences";
import { CombatVFXRenderer } from "../renderers/CombatVFXRenderer";
import Phaser from "phaser";
import type {
  GameSession,
  GameSnapshot,
  CombatEntity,
  GameEvent,
} from "@kiem-hiep/game-protocol";
import {
  npcs,
  getMap,
  actorVisualManifest,
  getSect,
  resourceNodes,
  propAssets,
  groundTextureAsset,
} from "@kiem-hiep/game-content";
import { worldToScreen, screenToWorld, distance } from "@kiem-hiep/game-core";
import { actorTexture } from "../animations/atlas";
import { animationFrame } from "../animations/frames";
import { EnvironmentRenderer } from "../renderers/EnvironmentRenderer";
import { ChunkWorldRenderer } from "../renderers/ChunkWorldRenderer";
import { CameraController } from "../camera/CameraController";
import { createPropTextures } from "../renderers/art";
import { GroundLootRenderer } from "../renderers/GroundLootRenderer";
export interface WorldCallbacks {
  onReady: () => void;
  onError: (message: string) => void;
  onDiagnostics?: (data: {
    fps: number;
    renderMs: number;
    objects: number;
    textures: number;
    activeChunks?: number;
    cachedChunks?: number;
    terrainBytes?: number;
    renderer?: string;
    activeEffects?: number;
  }) => void;
}
interface EntityView {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  bar: Phaser.GameObjects.Graphics;
  ring: Phaser.GameObjects.Ellipse;
  label: Phaser.GameObjects.Text;
}
export class WorldScene extends Phaser.Scene {
  private environment?: EnvironmentRenderer;
  private worldRenderer?: ChunkWorldRenderer;
  private vfx?: CombatVFXRenderer;
  private lootRenderer?: GroundLootRenderer;
  private cameraController?: CameraController;
  private lastDiagnostics = 0;
  private session: GameSession;
  private snapshot!: GameSnapshot;
  private unsubscribe?: () => void;
  private currentMap = "";
  private mapObjects: Phaser.GameObjects.GameObject[] = [];
  private views = new Map<string, EntityView>();
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private lastMove = 0;
  private clickMarker?: Phaser.GameObjects.Arc;
  private isBlocked: () => boolean;
  private callbacks: WorldCallbacks;
  constructor(
    session: GameSession,
    isBlocked: () => boolean,
    callbacks: WorldCallbacks,
  ) {
    super("WorldScene");
    this.session = session;
    this.isBlocked = isBlocked;
    this.callbacks = callbacks;
  }
  preload() {
    this.load.on("loaderror", (file: Phaser.Loader.File) =>
      this.callbacks.onError(
        `Không tải được tài nguyên: ${file.key}. Kiểm tra kết nối hoặc bộ nhớ cache rồi thử lại.`,
      ),
    );
    this.load.spritesheet(
      "interface-icons",
      "/assets/interface/icons-atlas-v1.png",
      { frameWidth: 128, frameHeight: 128 },
    );
    this.load.image(groundTextureAsset.id, groundTextureAsset.url);
    for (const asset of propAssets) this.load.image(asset.id, asset.url);
    for (const name of ["hero", "bandit", "elder", "merchant", "wolf", "boss"])
      this.load.svg(name, `/assets/${name}.svg`, { width: 120, height: 174 });
  }
  create() {
    createPropTextures(this);
    this.cameras.main.setBackgroundColor("#364c35");
    this.snapshot = this.session.getSnapshot();
    this.environment = new EnvironmentRenderer(this);
    this.worldRenderer = new ChunkWorldRenderer(this);
    this.vfx = new CombatVFXRenderer(this);
    this.lootRenderer = new GroundLootRenderer(this, (lootId) => {
      if (!this.isBlocked())
        this.session.sendCommand({ type: "pickup", lootId });
    });
    this.cameraController = new CameraController(this);
    this.buildMap();
    this.unsubscribe = this.session.subscribe((u) => {
      this.snapshot = u.snapshot;
      if (this.currentMap !== u.snapshot.mapId) this.buildMap();
      for (const e of u.events) this.effect(e);
    });
    this.input.mouse?.disableContextMenu();
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.isBlocked()) return;
      const wx = pointer.worldX,
        wy = pointer.worldY;
      const loot = Object.values(this.snapshot.groundLoot).find((l) => {
        const p = worldToScreen(l);
        return (
          l.mapId === this.currentMap &&
          l.ownerId === this.snapshot.playerId &&
          Math.abs(p.x - wx) < 24 &&
          Math.abs(p.y - wy - 5) < 25
        );
      });
      if (loot) {
        this.session.sendCommand({ type: "pickup", lootId: loot.id });
        return;
      }
      const node = resourceNodes
        .filter((n) => n.mapId === this.currentMap)
        .find((n) => {
          const p = worldToScreen(n);
          return Math.hypot(p.x - wx, p.y - wy + 8) < 22;
        });
      if (node) {
        this.session.sendCommand({ type: "gather", nodeId: node.id });
        return;
      }
      const monster = Object.values(this.snapshot.entities)
        .filter(
          (e) =>
            e.kind === "monster" && e.mapId === this.currentMap && e.hp > 0,
        )
        .find((e) => {
          const p = worldToScreen(e);
          return Math.hypot(p.x - wx, p.y - wy - 27) < 32;
        });
      if (monster) {
        this.session.sendCommand(
          pointer.rightButtonDown()
            ? {
                type: "skill",
                skillId: this.snapshot.hotbar[0],
                targetId: monster.id,
              }
            : { type: "attack", targetId: monster.id },
        );
        return;
      }
      const npc = npcs
        .filter((n) => n.mapId === this.currentMap)
        .find((n) => {
          const p = worldToScreen(n);
          return Math.hypot(p.x - wx, p.y - wy - 30) < 35;
        });
      if (npc) {
        this.session.sendCommand({ type: "interact", targetId: npc.id });
        return;
      }
      const portal = getMap(this.currentMap).portals.find((n) => {
        const p = worldToScreen(n);
        return Math.hypot(p.x - wx, p.y - wy) < 45;
      });
      if (portal) {
        this.session.sendCommand({
          type: "interact",
          targetId: `portal:${portal.id}`,
        });
        return;
      }
      // Mobile movement comes from the joystick; world taps still allow interactions.
      if (pointer.wasTouch || this.scale.width <= 1000) return;
      const destination = screenToWorld({ x: wx, y: wy });
      this.session.sendCommand({ type: "move", destination });
      if (this.clickMarker) {
        this.tweens.killTweensOf(this.clickMarker);
        this.clickMarker.destroy();
      }
      this.clickMarker = this.add
        .circle(wx, wy, 13, 0xc9b574, 0)
        .setStrokeStyle(1, 0xe0ce94, 0.8)
        .setDepth(1);
      const marker = this.clickMarker;
      this.tweens.add({
        targets: marker,
        scaleX: 1.7,
        scaleY: 0.8,
        alpha: 0,
        duration: 700,
        onComplete: () => marker.destroy(),
      });
    });
    this.keys = this.input.keyboard?.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE",
      false,
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard?.on("keydown-SPACE", (event: KeyboardEvent) => {
      const active = document.activeElement;
      if (
        event.repeat ||
        this.isBlocked() ||
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement
      )
        return;
      const player = this.snapshot.entities[this.snapshot.playerId];
      if (player.hp <= 0) return;
      const target = Object.values(this.snapshot.entities)
        .filter(
          (e) =>
            e.kind === "monster" && e.mapId === this.currentMap && e.hp > 0,
        )
        .sort((a, b) => distance(player, a) - distance(player, b))[0];
      if (target)
        this.session.sendCommand({ type: "attack", targetId: target.id });
    });
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
      this.unsubscribe?.();
      this.environment?.destroy();
      this.worldRenderer?.destroy();
      this.vfx?.destroy();
      this.lootRenderer?.destroy();
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
    this.scale.on("resize", () => this.resizeCamera());
    this.resizeCamera();
    this.callbacks.onReady();
    this.cameraController.reset(this.snapshot);
  }
  private resizeCamera() {
    this.cameraController?.reset(this.snapshot);
  }
  private buildMap() {
    this.mapObjects.forEach((o) => {
      this.tweens.killTweensOf(o);
      o.destroy();
    });
    this.views.forEach((v) => v.container.destroy());
    this.views.clear();
    if (this.currentMap && this.currentMap !== this.snapshot.mapId)
      this.textures.remove(`terrain:${this.currentMap}`);
    this.currentMap = this.snapshot.mapId;
    this.environment?.changeMap(this.currentMap);
    const required = new Set(
      Object.values(this.snapshot.entities)
        .filter((e) => e.mapId === this.currentMap)
        .map((e) => "actor:" + this.weaponFor(e)),
    );
    for (const key of this.textures.getTextureKeys())
      if (key.startsWith("actor:") && !required.has(key))
        this.textures.remove(key);
    this.worldRenderer?.changeMap(this.currentMap);
    this.mapObjects = [];
    this.cameraController?.reset(this.snapshot);
    for (const npc of npcs.filter((n) => n.mapId === this.currentMap)) {
      const p = worldToScreen(npc);
      const shadow = this.add
        .ellipse(p.x, p.y + 2, 34, 14, 0x17271e, 0.32)
        .setDepth(p.y - 1);
      const sprite = this.add
        .image(
          p.x,
          p.y,
          npc.id === "elder"
            ? "elder"
            : npc.id === "merchant"
              ? "merchant"
              : "bandit",
        )
        .setOrigin(0.5, 1)
        .setDisplaySize(48, 72)
        .setTint(
          npc.appearance === "elder"
            ? 0xb6b1a0
            : npc.appearance === "female"
              ? 0xc5d2b3
              : 0xd7b37c,
        )
        .setDepth(p.y);
      const label = this.add
        .text(p.x, p.y - 87, npc.name, {
          fontFamily: "Arial",
          fontSize: "12px",
          color: "#f3e2aa",
          stroke: "#263326",
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(p.y + 90);
      const role = this.add
        .text(p.x, p.y - 102, npc.id === "elder" ? "◆ Nhiệm vụ" : npc.role, {
          fontFamily: "Arial",
          fontSize: "10px",
          color: npc.id === "elder" ? "#efd277" : "#b0c2a5",
          stroke: "#263326",
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(p.y + 91);
      this.mapObjects.push(shadow, sprite, label, role);
    }
    for (const portal of getMap(this.currentMap).portals) {
      const p = worldToScreen(portal);
      const circle = this.add
        .ellipse(p.x, p.y, 64, 28, 0x86c6b2, 0.15)
        .setStrokeStyle(2, 0xb8d3ab, 0.6)
        .setDepth(p.y - 5);
      this.tweens.add({
        targets: circle,
        alpha: 0.4,
        scaleX: 1.1,
        scaleY: 1.1,
        yoyo: true,
        repeat: -1,
        duration: 1500,
      });
      const label = this.add
        .text(p.x, p.y - 16, `◇ ${portal.name}`, {
          fontFamily: "Arial",
          fontSize: "12px",
          color: "#d5e2b4",
          stroke: "#263326",
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(p.y + 100);
      this.mapObjects.push(circle, label);
    }
  }
  private weaponFor(e: CombatEntity) {
    if (e.kind !== "player")
      return actorVisualManifest.weaponByMonster[e.definitionId] ?? "sword";
    const appearance =
      e.id === this.snapshot.playerId
        ? this.snapshot.appearance
        : this.snapshot.actors[e.id]?.appearance;
    return `${appearance === "female" ? "female:" : ""}${actorVisualManifest.weaponByClass[e.definitionId] ?? "sword"}`;
  }
  private createView(e: CombatEntity) {
    const container = this.add.container(0, 0);
    const shadow = this.add.ellipse(
      0,
      1,
      e.definitionId === "boss" ? 60 : 31,
      12,
      0x112b1e,
      0.4,
    );
    const ring = this.add
      .ellipse(0, 0, 42, 20, 0xd5b66e, 0)
      .setStrokeStyle(1.5, e.kind === "player" ? 0xd5c48b : 0xd9785c, 0.7);
    const key = actorTexture(this, this.weaponFor(e));
    const sprite = this.add
      .image(
        0,
        0,
        key,
        animationFrame(
          e.state,
          e.direction,
          this.snapshot.tick,
          e.stateStartedAt,
        ),
      )
      .setOrigin(0.5, 88 / 96)
      .setDisplaySize(
        e.definitionId === "boss" ? 88 : 64,
        e.definitionId === "boss" ? 132 : 96,
      );
    if (e.kind === "player") {
      const school = getSect(e.definitionId),
        appearance =
          e.id === this.snapshot.playerId
            ? this.snapshot.appearance
            : this.snapshot.actors[e.id]?.appearance;
      const shade = Phaser.Display.Color.HexStringToColor(
        appearance === "female" ? "#dbc5dc" : school.color,
      );
      const tint = Phaser.Display.Color.Interpolate.ColorWithColor(
        shade,
        new Phaser.Display.Color(255, 255, 255),
        100,
        68,
      );
      sprite.setTint(Phaser.Display.Color.GetColor(tint.r, tint.g, tint.b));
    } else if (e.definitionId === "bandit" || e.definitionId === "archer")
      sprite.setTint(0xd3b89a);
    else if (e.definitionId === "assassin") sprite.setTint(0xc8aacd);
    else if (e.definitionId === "boss") sprite.setTint(0xe5ba81);
    const label = this.add
      .text(0, -89, e.name, {
        fontFamily: "Arial",
        fontSize: "12px",
        color:
          e.kind === "player" ? "#d4e9bc" : e.elite ? "#f2cf77" : "#ead6ba",
        stroke: "#233229",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    const bar = this.add.graphics();
    container.add([shadow, ring, sprite, label, bar]);
    const view = { container, sprite, bar, ring, label };
    this.views.set(e.id, view);
    return view;
  }
  update(time: number, delta: number) {
    if (!this.snapshot) return;
    const updateStart = performance.now();
    for (const [id, view] of this.views)
      if (
        !this.snapshot.entities[id] ||
        this.snapshot.entities[id].mapId !== this.currentMap
      ) {
        view.container.destroy();
        this.views.delete(id);
      }
    const p = this.snapshot.entities[this.snapshot.playerId];
    for (const e of Object.values(this.snapshot.entities)) {
      if (e.mapId !== this.currentMap) continue;
      const s = worldToScreen(e);
      const visible = this.cameras.main.worldView;
      const inView =
        e.id === this.snapshot.playerId ||
        (s.x > visible.left - 180 &&
          s.x < visible.right + 180 &&
          s.y > visible.top - 180 &&
          s.y < visible.bottom + 180);
      let v = this.views.get(e.id);
      if (!inView) {
        if (v) {
          v.container.destroy();
          this.views.delete(e.id);
        }
        continue;
      }
      if (!v) v = this.createView(e);
      const alpha = 1 - Math.exp(-delta / 65);
      if (v.container.x === 0 && v.container.y === 0)
        v.container.setPosition(s.x, s.y);
      else {
        v.container.x = Phaser.Math.Linear(v.container.x, s.x, alpha);
        v.container.y = Phaser.Math.Linear(v.container.y, s.y, alpha);
      }
      v.container.setDepth(v.container.y);
      v.sprite.setFrame(
        animationFrame(
          e.state,
          e.direction,
          this.snapshot.tick,
          e.stateStartedAt,
        ),
      );
      v.container.setAlpha(e.hp <= 0 ? 0.55 : 1);
      v.container.setVisible(true);
      v.label.setY(e.definitionId === "boss" ? -132 : -96);
      v.bar.clear();
      if (e.hp > 0) {
        const y = e.definitionId === "boss" ? -119 : -86;
        v.bar.fillStyle(0x15231c, 0.9).fillRoundedRect(-23, y, 46, 4, 1);
        v.bar
          .fillStyle(e.kind === "player" ? 0x9fae6f : 0xb75642)
          .fillRoundedRect(-22, y + 1, (44 * e.hp) / e.maxHp, 2, 1);
      }
      if (e.casting) {
        const total = Math.max(1, e.casting.resolveAt - e.stateStartedAt),
          progress = 1 - (e.casting.resolveAt - this.snapshot.tick) / total;
        v.bar.fillStyle(0x122923, 0.9).fillRect(-22, -78, 44, 3);
        v.bar.fillStyle(0xc4d4b1, 1).fillRect(-22, -78, 44 * progress, 3);
      }
      if (e.statuses.length) {
        let ix = 0;
        for (const status of e.statuses.slice(0, 6)) {
          v.bar
            .fillStyle(
              status.kind === "poison"
                ? 0xa6c16c
                : status.kind === "burn"
                  ? 0xd79564
                  : status.kind === "shield"
                    ? 0xdac58b
                    : 0x9ac5cf,
              0.9,
            )
            .fillCircle(-12 + ix++ * 5, -67, 1.5);
        }
      }
      v.ring.setVisible(e.kind === "player" || p.targetId === e.id);
    }
    this.cameraController?.update(
      this.snapshot,
      delta,
      this.views.get(p.id)?.container,
    );
    this.worldRenderer?.update(p, this.views.get(p.id)?.container);
    this.environment?.update(this.snapshot);
    this.vfx?.update(this.snapshot.paused);
    this.lootRenderer?.update(this.snapshot);
    if (time - this.lastDiagnostics > 1000) {
      this.lastDiagnostics = time;
      this.callbacks.onDiagnostics?.({
        fps: this.game.loop.actualFps,
        renderMs: performance.now() - updateStart,
        objects: this.children.length,
        textures: this.textures.getTextureKeys().length,
        ...this.worldRenderer?.diagnostics,
        renderer: this.game.renderer.type === Phaser.WEBGL ? "WebGL" : "Canvas",
        activeEffects: this.vfx?.activeEffects,
      });
    }
    const active = document.activeElement;
    const typing =
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement;
    if (this.keys && !this.isBlocked() && !typing && p.hp > 0) {
      const k = this.keys,
        dx =
          Number(k.D.isDown || k.RIGHT.isDown) -
          Number(k.A.isDown || k.LEFT.isDown),
        dy =
          Number(k.S.isDown || k.DOWN.isDown) -
          Number(k.W.isDown || k.UP.isDown);
      if ((dx || dy) && time - this.lastMove > 140) {
        this.lastMove = time;
        const direction = screenToWorld({ x: dx * 100, y: dy * 70 });
        const len = Math.hypot(direction.x, direction.y);
        this.session.sendCommand({
          type: "move",
          destination: {
            x: p.x + (direction.x / len) * 2,
            y: p.y + (direction.y / len) * 2,
          },
        });
      }
    }
  }
  private effect(e: GameEvent) {
    this.vfx?.event(e, this.snapshot);
    if (e.type === "damage" && e.value) {
      const view = this.views.get(e.entityId ?? "");
      if (view) {
        const color = view.sprite.tintTopLeft;
        view.sprite.setTintFill(0xf6e8c9);
        this.time.delayedCall(70, () => {
          if (view.sprite.active) view.sprite.setTint(color);
        });
      }
      if (
        e.critical &&
        !getPreferences().reducedMotion &&
        this.snapshot.settings.effects === "high"
      )
        this.cameras.main.shake(60, 0.0012);
    }
  }
}
