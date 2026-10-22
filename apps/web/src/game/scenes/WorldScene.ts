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
  actorSpriteManifest,
} from "@kiem-hiep/game-content";
import {
  worldToScreen,
  screenToWorld,
  distance,
  TICK_RATE,
} from "@kiem-hiep/game-core";
import {
  ENABLE_MOTION_SMOOTHING,
  HITSTOP_MAX_FIGHTERS,
  HITSTOP_MS,
  KNOCKBACK_ELITE_PX,
  KNOCKBACK_PX,
  bobOffset,
  knockbackOffset,
  lerp,
  settleBob,
  shadowScale,
  shouldAdoptDirection,
  STAND_DELAY_MS,
  flipScale,
  stateScale,
  transitionAlpha,
  lungeOffset,
} from "../renderers/motion";
import {
  hasMonsterSprites,
  isBossMonster,
  monsterSpriteFrame,
  monsterSpriteHeight,
  monsterSpriteOriginY,
} from "../animations/monster-sprites";
import {
  actorSpriteFrame,
  actorSpriteHeight,
  actorSpriteOriginY,
  actorSpriteOwner,
  actorSpriteWarmUrls,
} from "../animations/actor-sprites";
import { SpriteTextureCache } from "../animations/sprite-texture-cache";
import { actorTexture } from "../animations/atlas";
import { animationFrame } from "../animations/frames";
import { EnvironmentRenderer } from "../renderers/EnvironmentRenderer";
import { ChunkWorldRenderer } from "../renderers/ChunkWorldRenderer";
import { CameraController } from "../camera/CameraController";
import { createPropTextures, ensureGlowTexture } from "../renderers/art";
import { GroundLootRenderer } from "../renderers/GroundLootRenderer";
import { ForegroundRenderer } from "../renderers/ForegroundRenderer";
import { nightFactorFromClock } from "../world/daynight";
import { bossMechanicEvent } from "../world/boss-effects";
/** Neo chân (246/256) và ngưỡng HP dùng chung cho mọi bộ ảnh actor. */
const spriteOriginY = actorSpriteOriginY;
const hurtHpRatio = actorSpriteManifest.hurtHpRatio;
/** Tỉ lệ vẽ tinh anh so với quái gốc (B2.2). */
const ELITE_SCALE = 1.35;
/** Đường kính vùng sáng quanh nhân vật ban đêm (C2): bán kính ~3 ô. */
const PLAYER_GLOW_DIAMETER = 3 * 48 * 2;
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
/**
 * Trạng thái HIỂN THỊ của một thực thể (Phần B). Không bao giờ ghi ngược vào
 * logic: va chạm/tầm đánh/lưu game vẫn dùng toạ độ trong snapshot.
 */
interface MotionState {
  init: boolean;
  mapId: string;
  /** Tick logic của mốc nội suy hiện tại + thời điểm nhận (ms). */
  tick: number;
  tickAt: number;
  /** Hai đầu mút nội suy (px màn hình) và vị trí hiển thị hiện tại. */
  prevX: number;
  prevY: number;
  nextX: number;
  nextY: number;
  x: number;
  y: number;
  /** Quãng đường tích luỹ để chọn khung chân + nhún thân. */
  distance: number;
  bob: number;
  /** Hướng đang vẽ (0–7) và hướng đang chờ đủ 100ms. */
  direction: number;
  pendingDirection: number;
  pendingSince: number;
  /** Trượt lùi hiển thị: mốc bắt đầu (0 = không), hướng đơn vị, trần px. */
  knockAt: number;
  knockX: number;
  knockY: number;
  knockMax: number;
  /** Dừng hình cực ngắn: giữ nguyên hiển thị tới mốc này (ms). */
  frozenUntil: number;
  /** Có đang di chuyển thật trong khung này không (dùng cho Mục 4/5.6). */
  walking: boolean;
  /** Mốc ms của lần đi bộ gần nhất (Mục 4: trễ walk→stand 120ms). */
  lastWalkAt: number;
  /** Trạng thái đang vẽ + mốc bắt đầu hiệu ứng scale (Mục 6.2). */
  drawState: string;
  stateEnteredAt: number;
  /** Lần đổi flipX gần nhất (Mục 6.3). */
  flipAt: number;
  flip: boolean;
  /** Ghost mờ dần khi đổi trạng thái (Mục 6.1). */
  ghostTexture: string | null;
  ghostStartedAt: number;
}
/** Nguồn ảnh sprite của một actor: quái hoặc nhân vật theo (phái, giới). */
type SpriteSource =
  | { kind: "monster"; definitionId: string; height: number }
  | {
      kind: "actor";
      sectId: string;
      appearance: string;
      owner: string;
      height: number;
    };
interface EntityView {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  /** Ảnh mờ của frame cũ khi đổi trạng thái (Mục 6.1). */
  ghost: Phaser.GameObjects.Image;
  bar: Phaser.GameObjects.Graphics;
  ring: Phaser.GameObjects.Ellipse;
  /** Vòng sáng vàng dưới chân tinh anh (B2). */
  eliteRing: Phaser.GameObjects.Ellipse;
  /** Quầng sáng dưới chân theo bậc cường hóa cao nhất đang mặc (A4). */
  enhanceGlow: Phaser.GameObjects.Ellipse;
  /** Bóng dưới chân: đổi độ đậm/độ lớn theo trạng thái (attack/cast/dead). */
  shadow: Phaser.GameObjects.Ellipse;
  label: Phaser.GameObjects.Text;
  /** Bản vẽ thủ tục đang dùng, để quay lại khi thiếu ảnh sprite. */
  atlas: { key: string; width: number; height: number };
  /** Có bộ ảnh: texture đổi theo state/hướng thay cho atlas. */
  spriteSource: SpriteSource | null;
  labelY: number;
  barY: number;
  /** Trạng thái hiển thị của Phần B (nội suy tick, nhún, hướng, trượt lùi). */
  motion: MotionState;
}
export class WorldScene extends Phaser.Scene {
  private environment?: EnvironmentRenderer;
  private worldRenderer?: ChunkWorldRenderer;
  private vfx?: CombatVFXRenderer;
  private lootRenderer?: GroundLootRenderer;
  private cameraController?: CameraController;
  private foreground?: ForegroundRenderer;
  /** Đốm sáng nhỏ quanh nhân vật người chơi cục bộ, sáng dần khi về đêm. */
  private playerGlow?: Phaser.GameObjects.Image;
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
  private monsterSprites?: SpriteTextureCache;
  private actorSprites?: SpriteTextureCache;
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
    this.monsterSprites = new SpriteTextureCache(this);
    this.actorSprites = new SpriteTextureCache(this);
    this.lootRenderer = new GroundLootRenderer(this, (lootId) => {
      if (!this.isBlocked())
        this.session.sendCommand({ type: "pickup", lootId });
    });
    this.cameraController = new CameraController(this);
    this.foreground = new ForegroundRenderer(this);
    this.playerGlow = this.add
      .image(0, 0, ensureGlowTexture(this))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(140, 140)
      .setAlpha(0)
      .setVisible(false);
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
      this.foreground?.destroy();
      this.playerGlow?.destroy();
      this.playerGlow = undefined;
      this.monsterSprites?.dispose();
      this.actorSprites?.dispose();
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
    this.monsterSprites?.retain(
      new Set(
        Object.values(this.snapshot.entities)
          .filter((e) => e.kind === "monster" && e.mapId === this.currentMap)
          .map((e) => e.definitionId),
      ),
    );
    // Nhân vật: giữ texture theo bộ (phái, giới) có trên bản đồ và nạp trước
    // stand/walk để không nháy hình thủ tục khi vừa vào bản đồ.
    const actorOwners = new Set<string>();
    for (const e of Object.values(this.snapshot.entities)) {
      if (e.kind !== "player" || e.mapId !== this.currentMap) continue;
      const set = actorSpriteOwner(e.definitionId, this.appearanceFor(e));
      if (!set) continue;
      actorOwners.add(set.owner);
      this.actorSprites?.warm(set.owner, actorSpriteWarmUrls(set.owner));
    }
    this.actorSprites?.retain(actorOwners);
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
  /** Ngoại hình actor: người chơi cục bộ lấy từ snapshot, player khác từ actors. */
  private appearanceFor(e: CombatEntity): string {
    if (e.id === this.snapshot.playerId) return this.snapshot.appearance;
    return this.snapshot.actors[e.id]?.appearance ?? "male";
  }
  private weaponFor(e: CombatEntity) {
    if (e.kind !== "player")
      return actorVisualManifest.weaponByMonster[e.definitionId] ?? "sword";
    return `${this.appearanceFor(e) === "female" ? "female:" : ""}${actorVisualManifest.weaponByClass[e.definitionId] ?? "sword"}`;
  }
  private createView(e: CombatEntity) {
    const container = this.add.container(0, 0);
    const boss = e.kind === "monster" && isBossMonster(e.definitionId);
    const shadow = this.add.ellipse(0, 1, boss ? 60 : 31, 12, 0x112b1e, 0.4);
    const ring = this.add
      .ellipse(0, 0, 42, 20, 0xd5b66e, 0)
      .setStrokeStyle(1.5, e.kind === "player" ? 0xd5c48b : 0xd9785c, 0.7);
    // Vòng sáng vàng dưới chân tinh anh (B2.2), vẽ bằng code.
    const eliteRing = this.add
      .ellipse(0, 2, 46, 20, 0xf0cf6b, 0.16)
      .setStrokeStyle(2, 0xf3d885, 0.8)
      .setVisible(false);
    // Quầng sáng dưới chân theo bậc cường hóa cao nhất đang mặc (A4.3).
    const enhanceGlow = this.add
      .ellipse(0, 3, 40, 17, 0xb494f0, 0.2)
      .setStrokeStyle(2, 0xc6a9f0, 0.85)
      .setVisible(false);
    const atlas = {
      key: actorTexture(this, this.weaponFor(e)),
      width: boss ? 88 : 64,
      height: boss ? 132 : 96,
    };
    const sprite = this.add
      .image(
        0,
        0,
        atlas.key,
        animationFrame(
          e.state,
          e.direction,
          this.snapshot.tick,
          e.stateStartedAt,
        ),
      )
      .setOrigin(0.5, 88 / 96)
      .setDisplaySize(atlas.width, atlas.height);
    // Có bộ ảnh (quái hoặc nhân vật): khung 256px neo chân, boss scale lớn hơn
    // cho đúng tầm vóc; nhân vật dùng bộ theo (phái, giới).
    const monsterSprite =
      e.kind === "monster" && hasMonsterSprites(e.definitionId);
    const actorSet =
      e.kind === "player"
        ? actorSpriteOwner(e.definitionId, this.appearanceFor(e))
        : null;
    const spriteSource: SpriteSource | null = monsterSprite
      ? {
          kind: "monster",
          definitionId: e.definitionId,
          height: monsterSpriteHeight(e.definitionId),
        }
      : actorSet
        ? {
            kind: "actor",
            sectId: e.definitionId,
            appearance: this.appearanceFor(e),
            owner: actorSet.owner,
            height: actorSpriteHeight,
          }
        : null;
    const originY =
      spriteSource?.kind === "monster"
        ? monsterSpriteOriginY
        : spriteSource?.kind === "actor"
          ? actorSpriteOriginY
          : 88 / 96;
    const height = spriteSource ? spriteSource.height : atlas.height;
    const labelY = spriteSource
      ? -Math.round(height * originY) - 12
      : boss
        ? -132
        : -96;
    const barY = labelY + (boss ? 13 : 10);
    if (e.kind === "player") {
      if (spriteSource) {
        // Ảnh sprite đã có màu riêng theo phái: không tint đè lên art.
        sprite.clearTint();
      } else {
        const school = getSect(e.definitionId);
        const shade = Phaser.Display.Color.HexStringToColor(
          this.appearanceFor(e) === "female" ? "#dbc5dc" : school.color,
        );
        const tint = Phaser.Display.Color.Interpolate.ColorWithColor(
          shade,
          new Phaser.Display.Color(255, 255, 255),
          100,
          68,
        );
        sprite.setTint(Phaser.Display.Color.GetColor(tint.r, tint.g, tint.b));
      }
    } else if (spriteSource) sprite.clearTint();
    else if (e.definitionId === "bandit" || e.definitionId === "archer")
      sprite.setTint(0xd3b89a);
    else if (e.definitionId === "assassin") sprite.setTint(0xc8aacd);
    else if (e.definitionId === "boss") sprite.setTint(0xe5ba81);
    const label = this.add
      .text(0, labelY, e.name, {
        fontFamily: "Arial",
        fontSize: "12px",
        color:
          e.kind === "player" ? "#d4e9bc" : e.elite ? "#f2cf77" : "#ead6ba",
        stroke: "#233229",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    const bar = this.add.graphics();
    container.add([shadow, enhanceGlow, eliteRing, ring, sprite, label, bar]);
    // Ghost đặt dưới sprite chính, chỉ dùng khi đổi trạng thái (Mục 6.1).
    const ghost = this.add
      .image(0, 0, sprite.texture.key)
      .setOrigin(0.5, sprite.originY);
    ghost.setVisible(false);
    container.addAt(ghost, container.getIndex(sprite));
    const view: EntityView = {
      container,
      sprite,
      ghost,
      bar,
      ring,
      eliteRing,
      enhanceGlow,
      shadow,
      label,
      atlas,
      spriteSource,
      labelY,
      barY,
      motion: this.createMotion(e),
    };
    this.views.set(e.id, view);
    return view;
  }
  /**
   * Chọn texture cho actor tại tick hiện tại: quái và nhân vật có bộ ảnh dùng PNG
   * 256px theo state/hướng (trái = phải lật ngang). Ảnh chưa tải xong hoặc thiếu
   * file thì giữ bản vẽ thủ tục của atlas — không lỗi, không để ô trống.
   */
  private syncActorSprite(e: CombatEntity, v: EntityView) {
    const now = performance.now();
    const m = v.motion;
    const elapsed = this.snapshot.tick - e.stateStartedAt;
    const source = v.spriteSource;
    const eliteScale = e.elite ? ELITE_SCALE : 1;

    // Mục 4: giữ frame đi bộ thêm STAND_DELAY_MS sau khi dừng (chỉ lớp hiển thị).
    if (e.state === "walk") m.lastWalkAt = now;
    let displayState: CombatEntity["state"] = e.state;
    if (e.state === "idle" && now - m.lastWalkAt < STAND_DELAY_MS)
      displayState = "walk";
    // Mục 5.6: đang đi mà ra đòn thì chỉ chớp frame attack quanh mốc trúng đòn.
    if (e.state === "attack" && e.strike && m.walking) {
      const hitInMs =
        (e.strike.resolveAt - this.snapshot.tick) * (1000 / TICK_RATE);
      if (Math.abs(hitInMs) > 60) displayState = "walk";
    }
    const previousState = m.drawState;
    if (displayState !== previousState) {
      m.drawState = displayState;
      m.stateEnteredAt = now;
    }

    const drawDirection = m.direction as CombatEntity["direction"];
    const distancePx = m.distance;
    const lowHp = e.maxHp > 0 && e.hp / e.maxHp <= hurtHpRatio;
    const frame = source
      ? source.kind === "monster"
        ? monsterSpriteFrame(
            source.definitionId,
            displayState,
            drawDirection,
            elapsed,
            { lowHp, distancePx },
          )
        : actorSpriteFrame(
            source.sectId,
            source.appearance,
            displayState,
            drawDirection,
            elapsed,
            { lowHp, distancePx },
          )
      : null;
    const owner =
      source?.kind === "monster"
        ? source.definitionId
        : source
          ? source.owner
          : "";
    const cache =
      source?.kind === "monster" ? this.monsterSprites : this.actorSprites;
    const key = frame && source ? (cache?.key(owner, frame.url) ?? null) : null;

    if (frame && key && source) {
      // Mục 6.1: chỉ khi đổi TRẠNG THÁI mới giữ frame cũ trên ghost mờ dần.
      if (v.sprite.texture.key !== key) {
        if (
          ENABLE_MOTION_SMOOTHING &&
          previousState !== "" &&
          previousState !== displayState
        ) {
          v.ghost.setTexture(v.sprite.texture.key);
          v.ghost.setVisible(true);
          v.ghost.setAlpha(0.55);
          m.ghostStartedAt = now;
        }
        v.sprite.setTexture(key);
      }
      if (frame.flipX !== m.flip) {
        m.flip = frame.flipX;
        m.flipAt = now;
      }
      const stateK = stateScale(e.state, now - m.stateEnteredAt);
      const flipK = flipScale(now - m.flipAt);
      const width = source.height * eliteScale * stateK.x * flipK,
        height = source.height * eliteScale * stateK.y;
      v.sprite
        .setOrigin(0.5, spriteOriginY)
        .setFlipX(frame.flipX)
        .setDisplaySize(width, height);
      if (v.ghost.visible)
        v.ghost
          .setOrigin(0.5, spriteOriginY)
          .setPosition(v.sprite.x, v.sprite.y)
          .setFlipX(v.sprite.flipX)
          .setDisplaySize(width, height);
    } else if (v.sprite.texture.key !== v.atlas.key) {
      v.sprite
        .setTexture(v.atlas.key)
        .setOrigin(0.5, 88 / 96)
        .setFlipX(false)
        .setDisplaySize(
          v.atlas.width * eliteScale,
          v.atlas.height * eliteScale,
        );
    }
    if (!frame || !key)
      v.sprite.setFrame(
        animationFrame(
          e.state,
          e.direction,
          this.snapshot.tick,
          e.stateStartedAt,
        ),
      );
    // Mục 6.1: ghost mờ dần 0,55 → 0 trong TRANSITION_FADE_MS.
    if (v.ghost.visible) {
      const alpha = transitionAlpha(now - m.ghostStartedAt);
      if (alpha <= 0.01) v.ghost.setVisible(false);
      else v.ghost.setAlpha(alpha);
    }
  }

  update(time: number, delta: number) {
    if (!this.snapshot) return;
    const updateStart = performance.now();
    // Mốc thời gian thực dùng cho nội suy 20Hz → 60fps (một lần mỗi khung).
    const now = updateStart;
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
      const display = this.stepMotion(e, v, delta, now);
      v.container.setPosition(display.x, display.y);
      v.container.setDepth(display.y);
      // Nhún thân chỉ tác động sprite; bóng/vòng/nhãn giữ nguyên mặt đất.
      v.sprite.setY(display.bob);
      this.syncActorSprite(e, v);
      v.container.setAlpha(e.hp <= 0 ? 0.55 : 1);
      v.container.setVisible(true);
      // Bóng theo trạng thái: cast/attack thì nhỏ và nhạt hơn, chết thì mờ hẳn.
      const crouch = e.state === "cast" || e.state === "attack",
        down = e.state === "dead";
      v.shadow.setScale((crouch ? 0.85 : 1) * shadowScale(display.bob));
      v.shadow.setAlpha(down ? 0.15 : crouch ? 0.22 : 0.4);
      // A2.3: tên tinh anh màu vàng kim (đặt ở createView) và luôn kèm chữ
      // "Tinh Anh" kể cả khi tên dữ liệu không có sẵn cụm đó.
      const labelText =
        e.elite && !e.name.includes("Tinh Anh")
          ? `${e.name} · Tinh Anh`
          : e.name;
      if (v.label.text !== labelText) v.label.setText(labelText);
      v.label.setY(v.labelY);
      v.bar.clear();
      // A2: chỉ hiện tên + thanh máu cho quái đang được chọn, đang giao chiến,
      // đã mất máu hoặc tinh anh. Quái nguyên vẹn chưa giao chiến thì ẩn.
      const engaged =
        p.targetId === e.id ||
        e.targetId === p.id ||
        (e.threat[p.id] ?? 0) > 0 ||
        e.hp < e.maxHp ||
        !!e.elite;
      const showBar = e.kind === "monster" && e.hp > 0 && engaged;
      v.label.setVisible(e.kind === "monster" ? showBar : true);
      if (e.kind === "player" && e.hp > 0) {
        const y = v.barY;
        v.bar.fillStyle(0x15231c, 0.9).fillRoundedRect(-23, y, 46, 4, 1);
        v.bar
          .fillStyle(0x9fae6f)
          .fillRoundedRect(-22, y + 1, (44 * e.hp) / e.maxHp, 2, 1);
      } else if (showBar) {
        const y = v.barY,
          ratio = e.maxHp > 0 ? e.hp / e.maxHp : 0,
          color = ratio > 0.5 ? 0x8fbf5f : ratio > 0.25 ? 0xd7b356 : 0xc2503c;
        v.bar.fillStyle(0x15231c, 0.9).fillRoundedRect(-23, y, 46, 4, 1);
        v.bar.fillStyle(color).fillRoundedRect(-22, y + 1, 44 * ratio, 2, 1);
      }
      if (e.casting) {
        const total = Math.max(1, e.casting.resolveAt - e.stateStartedAt),
          progress = 1 - (e.casting.resolveAt - this.snapshot.tick) / total;
        v.bar.fillStyle(0x122923, 0.9).fillRect(-22, v.barY + 8, 44, 3);
        v.bar
          .fillStyle(0xc4d4b1, 1)
          .fillRect(-22, v.barY + 8, 44 * progress, 3);
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
            .fillCircle(-12 + ix++ * 5, v.barY + 19, 1.5);
        }
      }
      v.ring.setVisible(
        e.kind === "player" || p.targetId === e.id || !!e.elite,
      );
      // A4.3: nhân vật là sprite nguyên bộ (không tách vũ khí), nên dùng quầng
      // sáng dưới chân theo bậc cường hóa cao nhất đang mặc, chỉ từ +9.
      const topEnhance = Math.max(
        0,
        ...Object.values(this.snapshot.equipment).map(
          (item) => item.enhancement ?? 0,
        ),
      );
      const glowTone =
        topEnhance >= 11
          ? 0xf3d885
          : topEnhance >= 9
            ? 0xb494f0
            : topEnhance >= 7
              ? 0x8ec8f6
              : 0xc8f2dd;
      v.enhanceGlow
        .setVisible(e.kind === "player" && topEnhance >= 9)
        .setFillStyle(glowTone, e.kind === "player" ? 0.18 : 0)
        .setStrokeStyle(2, glowTone, 0.75);
      // Vòng sáng vàng dưới chân tinh anh, vẽ bằng code (B2.2).
      v.eliteRing.setVisible(!!e.elite && e.hp > 0);
    }
    const playerView = this.views.get(p.id),
      nightFactor = nightFactorFromClock(this.snapshot.worldClock.timeTicks);
    this.cameraController?.update(this.snapshot, delta, playerView?.container);
    this.worldRenderer?.update(p, playerView?.container, nightFactor);
    this.environment?.update(this.snapshot);
    this.vfx?.update(this.snapshot.paused);
    this.lootRenderer?.update(this.snapshot);
    this.foreground?.update();
    this.syncPlayerGlow(playerView, nightFactor);
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
  /** Trạng thái hiển thị ban đầu cho một view mới (đứng yên tại vị trí logic). */
  private createMotion(e: CombatEntity): MotionState {
    const at = worldToScreen(e);
    const now = performance.now();
    return {
      init: true,
      mapId: e.mapId,
      tick: this.snapshot.tick,
      tickAt: now,
      prevX: at.x,
      prevY: at.y,
      nextX: at.x,
      nextY: at.y,
      x: at.x,
      y: at.y,
      distance: 0,
      bob: 0,
      direction: e.direction,
      pendingDirection: e.direction,
      pendingSince: now,
      knockAt: 0,
      knockX: 0,
      knockY: 0,
      knockMax: 0,
      frozenUntil: 0,
      walking: false,
      lastWalkAt: 0,
      drawState: "",
      stateEnteredAt: now,
      flipAt: 0,
      flip: false,
      ghostTexture: null,
      ghostStartedAt: 0,
    };
  }
  /**
   * Nội suy hiển thị giữa hai tick logic 20Hz (B1.2) + nhún thân (B2.2) + trượt
   * lùi (B3.3) + dừng hình (B3.4). Chỉ trả toạ độ để VẼ; vị trí logic vẫn là
   * nguồn sự thật cho va chạm/tầm đánh/lưu game.
   */
  private stepMotion(
    e: CombatEntity,
    v: EntityView,
    delta: number,
    now: number,
  ) {
    const m = v.motion;
    const target = worldToScreen(e);
    if (this.snapshot.tick !== m.tick) {
      // Cắt nội suy khi dịch chuyển tức thời: đổi map, hồi sinh, hồi thành phù.
      const jump = Math.hypot(target.x - m.nextX, target.y - m.nextY);
      const teleport = e.mapId !== m.mapId || jump > 320;
      m.prevX = teleport ? target.x : m.nextX;
      m.prevY = teleport ? target.y : m.nextY;
      m.nextX = target.x;
      m.nextY = target.y;
      m.tick = this.snapshot.tick;
      m.tickAt = now;
      m.mapId = e.mapId;
      if (teleport) {
        m.x = target.x;
        m.y = target.y;
        m.distance = 0;
        m.bob = 0;
        m.knockAt = 0;
        m.frozenUntil = 0;
      }
    }
    // Hướng hiển thị: giữ 100ms trước khi đổi; quay > 90° hoặc đang đánh thì đổi ngay.
    if (e.direction !== m.pendingDirection) {
      m.pendingDirection = e.direction;
      m.pendingSince = now;
    }
    const forceDirection =
      e.state === "attack" || e.state === "cast" || e.state === "dead";
    if (
      m.direction !== m.pendingDirection &&
      (forceDirection ||
        shouldAdoptDirection(
          m.direction,
          m.pendingDirection,
          now - m.pendingSince,
        ))
    ) {
      m.direction = m.pendingDirection;
      m.pendingSince = now;
    }
    // Dừng hình: giữ nguyên hiển thị của đúng 2 thực thể trong 35ms.
    if (m.frozenUntil > now) return { x: m.x, y: m.y, bob: m.bob };
    const alpha = ENABLE_MOTION_SMOOTHING
      ? Math.min(1, Math.max(0, (now - m.tickAt) / (1000 / TICK_RATE)))
      : 1;
    const px = lerp(m.prevX, m.nextX, alpha);
    const py = lerp(m.prevY, m.nextY, alpha);
    const moved = Math.hypot(px - m.x, py - m.y);
    const walking = e.state === "walk" && moved > 0.01;
    if (walking) m.distance += moved;
    m.x = px;
    m.y = py;
    let knockX = 0,
      knockY = 0;
    if (m.knockAt) {
      const offset = knockbackOffset(now - m.knockAt, m.knockMax);
      if (!offset) m.knockAt = 0;
      knockX = m.knockX * offset;
      knockY = m.knockY * offset;
    }
    m.walking = walking;
    m.bob = walking ? bobOffset(m.distance) : settleBob(m.bob, delta);
    // Mục 2: lao tới hiển thị của đòn thường, đỉnh đúng mốc 35% chu kỳ; đòn bị
    // cắt ngang (e.strike = null) thì offset về 0 ngay trong khung này.
    let lungeX = 0,
      lungeY = 0;
    const strike = e.strike;
    if (strike) {
      const target = this.snapshot.entities[strike.targetId];
      if (target && target.mapId === e.mapId) {
        const progress =
          (this.snapshot.tick + alpha - strike.startedAt) /
          Math.max(1, strike.cycleTicks);
        const amount = lungeOffset(progress);
        const dx = (target.x - e.x - (target.y - e.y)) * 48,
          dy = (target.x - e.x + (target.y - e.y)) * 24;
        const length = Math.hypot(dx, dy) || 1;
        lungeX = (dx / length) * amount;
        lungeY = (dy / length) * amount;
      }
    }
    return { x: px + knockX + lungeX, y: py + knockY + lungeY, bob: m.bob };
  }
  /** Bắt đầu cú trượt lùi hiển thị khi trúng đòn (B3.3). */
  private startKnockback(victimId: string) {
    const victim = this.snapshot.entities[victimId];
    const m = victim ? this.views.get(victimId)?.motion : undefined;
    if (!victim || !m) return;
    const from = this.snapshot.entities[this.snapshot.playerId];
    let dx = victim.x - from.x,
      dy = victim.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    // Đổi sang hướng trên màn hình iso để cú đẩy lùi đúng cảm giác.
    const sx = (dx - dy) * 48,
      sy = (dx + dy) * 24;
    const screenLength = Math.hypot(sx, sy) || 1;
    m.knockAt = performance.now();
    m.knockX = sx / screenLength;
    m.knockY = sy / screenLength;
    m.knockMax =
      victim.elite || isBossMonster(victim.definitionId)
        ? KNOCKBACK_ELITE_PX
        : KNOCKBACK_PX;
  }
  /** Số thực thể đang giao chiến với người chơi (để bỏ dừng hình khi quá đông). */
  private engagedFighters() {
    const p = this.snapshot.entities[this.snapshot.playerId];
    if (!p) return 0;
    let count = 0;
    for (const e of Object.values(this.snapshot.entities)) {
      if (e.mapId !== p.mapId || e.kind !== "monster" || e.hp <= 0) continue;
      if (
        e.targetId === p.id ||
        p.targetId === e.id ||
        (e.threat[p.id] ?? 0) > 0
      )
        count += 1;
    }
    return count;
  }
  /** Dừng hình cực ngắn cho đúng 2 thực thể tại khoảnh khắc chạm đòn (B3.4). */
  private startHitStop(attackerId: string, victimId: string) {
    if (!getPreferences().hitStop) return;
    if (this.engagedFighters() >= HITSTOP_MAX_FIGHTERS) return;
    const until = performance.now() + HITSTOP_MS;
    for (const id of [attackerId, victimId]) {
      const m = this.views.get(id)?.motion;
      if (m) m.frozenUntil = until;
    }
  }
  private effect(e: GameEvent) {
    this.vfx?.event(e, this.snapshot);
    if (e.type === "damage" && e.value) {
      const view = this.views.get(e.entityId ?? "");
      // A3: nhấp nháy đỏ 80–100ms khi trúng đòn; bỏ qua sát thương độc theo
      // nhịp (dot) để tránh chớp liên tục.
      if (view && e.damageSource !== "dot") {
        const color = view.sprite.tintTopLeft;
        view.sprite.setTintFill(0xe0675a);
        this.time.delayedCall(90, () => {
          if (view.sprite.active) view.sprite.setTint(color);
        });
      }
      if (view && e.damageSource !== "dot") {
        // Trượt lùi hiển thị + dừng hình cực ngắn tại khoảnh khắc chạm đòn.
        this.startKnockback(e.entityId ?? "");
        this.startHitStop(this.snapshot.playerId, e.entityId ?? "");
      }
      if (
        e.critical &&
        !getPreferences().reducedMotion &&
        this.snapshot.settings.effects === "high"
      )
        this.cameras.main.shake(60, 0.0012);
    }
    // Boss dùng kỹ năng cơ chế (quake/storm): rung màn hình, cùng điều kiện
    // effects "high" và tôn trọng reducedMotion như rung chí mạng.
    if (
      bossMechanicEvent(e, this.snapshot) &&
      !getPreferences().reducedMotion &&
      this.snapshot.settings.effects === "high"
    )
      this.cameras.main.shake(120, 0.0025);
  }
  /** Đốm sáng nhỏ của người chơi cục bộ: theo view, chỉ hiện khi về đêm. */
  /**
   * Vòng sáng ấm quanh nhân vật ban đêm (C2).
   *
   * Dùng texture gradient đã tạo sẵn một lần trong `ensureGlowTexture` (không
   * tạo gradient mỗi frame), bán kính ~3 ô, tắt hoàn toàn ban ngày.
   */
  private syncPlayerGlow(
    playerView: EntityView | undefined,
    nightFactor: number,
  ) {
    const glow = this.playerGlow;
    if (!glow || !playerView) {
      glow?.setVisible(false);
      return;
    }
    const enabled =
      getPreferences().playerNightLight && getPreferences().glowLanterns;
    // 3 ô ≈ 3 * 48px theo tỉ lệ worldToScreen (x-y)*48, đường kính gấp đôi.
    const alpha = enabled ? 0.42 * nightFactor : 0;
    glow.setVisible(alpha > 0.01);
    if (alpha <= 0.01) return;
    glow
      .setPosition(playerView.container.x, playerView.container.y - 10)
      .setDepth(playerView.container.y - 1)
      .setAlpha(alpha)
      .setDisplaySize(PLAYER_GLOW_DIAMETER, PLAYER_GLOW_DIAMETER * 0.55);
  }
}
