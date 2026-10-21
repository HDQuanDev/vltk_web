import * as THREE from "three";
import type { GameSession, GameSnapshot } from "@kiem-hiep/game-protocol";
import { getMap, npcs, resourceNodes } from "@kiem-hiep/game-content";
import { distance } from "@kiem-hiep/game-core";
import { MOVE_INTERVAL, MOVE_STEP, PICK_RADIUS } from "./input-constants";

export interface Input3DOptions {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  session: GameSession;
  isBlocked: () => boolean;
  getSnapshot: () => GameSnapshot;
  getMapId: () => string;
  onMoveMarker: (x: number, y: number) => void;
}

/**
 * Tương tác chuột/chạm và bàn phím của bộ hiển thị 3D.
 *
 * Thứ tự ưu tiên bắt chọn và payload lệnh giống HẾT bản 2D:
 * loot → nút tài nguyên → quái (trái: attack / phải: skill hotbar[0]) → NPC →
 * portal → move (chỉ khi không phải chạm và bề rộng khung ≥ ngưỡng).
 */
export class Input3D {
  private raycaster = new THREE.Raycaster();
  private ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private pointer = new THREE.Vector2();
  private hit = new THREE.Vector3();
  private keys = new Set<string>();
  private lastMove = 0;
  private element: HTMLElement;
  private onPointerDown?: (e: PointerEvent) => void;
  private onKeyDown?: (e: KeyboardEvent) => void;
  private onKeyUp?: (e: KeyboardEvent) => void;

  constructor(private options: Input3DOptions) {
    this.element = options.renderer.domElement;
    this.onPointerDown = (e) => this.pointerDown(e);
    this.onKeyDown = (e) => this.keyDown(e);
    this.onKeyUp = (e) => this.keys.delete(e.key.toLowerCase());
    this.element.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  /** Điểm thế giới (x, y) dưới con trỏ, raycast xuống mặt phẳng y = 0. */
  private pickGround(event: PointerEvent) {
    const rect = this.element.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.options.camera);
    const hit = this.raycaster.ray.intersectPlane(this.ground, this.hit);
    return hit ? { x: hit.x, y: hit.z } : null;
  }

  private pointerDown(event: PointerEvent) {
    if (this.options.isBlocked()) return;
    const snapshot = this.options.getSnapshot();
    const mapId = this.options.getMapId();
    const at = this.pickGround(event);
    if (!at) return;
    // (1) Loot của chính người chơi gần điểm nhấn.
    const loot = Object.values(snapshot.groundLoot).find((l) => {
      return (
        l.mapId === mapId &&
        l.ownerId === snapshot.playerId &&
        Math.hypot(l.x - at.x, l.y - at.y) < PICK_RADIUS.loot
      );
    });
    if (loot) {
      this.options.session.sendCommand({ type: "pickup", lootId: loot.id });
      return;
    }
    // (2) Nút tài nguyên.
    const node = resourceNodes
      .filter((n) => n.mapId === mapId)
      .find((n) => Math.hypot(n.x - at.x, n.y - at.y) < PICK_RADIUS.node);
    if (node) {
      this.options.session.sendCommand({ type: "gather", nodeId: node.id });
      return;
    }
    // (3) Quái còn sống: chuột trái đánh, chuột phải dùng kỹ năng hotbar[0].
    const monster = Object.values(snapshot.entities)
      .filter(
        (e) => e.kind === "monster" && e.mapId === mapId && e.hp > 0,
      )
      .find((e) => Math.hypot(e.x - at.x, e.y - at.y) < PICK_RADIUS.monster);
    if (monster) {
      this.options.session.sendCommand(
        event.button === 2
          ? {
              type: "skill",
              skillId: snapshot.hotbar[0],
              targetId: monster.id,
            }
          : { type: "attack", targetId: monster.id },
      );
      return;
    }
    // (4) NPC.
    const npc = npcs
      .filter((n) => n.mapId === mapId)
      .find((n) => Math.hypot(n.x - at.x, n.y - at.y) < PICK_RADIUS.npc);
    if (npc) {
      this.options.session.sendCommand({ type: "interact", targetId: npc.id });
      return;
    }
    // (5) Cổng dịch chuyển.
    const portal = getMap(mapId).portals.find(
      (p) => Math.hypot(p.x - at.x, p.y - at.y) < PICK_RADIUS.portal,
    );
    if (portal) {
      this.options.session.sendCommand({
        type: "interact",
        targetId: `portal:${portal.id}`,
      });
      return;
    }
    // (6) Mặt đất trống: chỉ chuột (không phải chạm) và màn hình rộng.
    if (event.pointerType === "touch" || window.innerWidth <= 1000) return;
    this.options.session.sendCommand({
      type: "move",
      destination: { x: at.x, y: at.y },
    });
    this.options.onMoveMarker(at.x, at.y);
  }

  private keyDown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    if (key === " ") {
      if (event.repeat) return;
      this.attackNearest(event);
      return;
    }
    if (
      ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(
        key,
      )
    )
      this.keys.add(key);
  }

  /** SPACE: tấn công quái gần nhất còn sống trên map. */
  private attackNearest(event: KeyboardEvent) {
    if (this.options.isBlocked()) return;
    const active = document.activeElement;
    if (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active instanceof HTMLSelectElement
    )
      return;
    const snapshot = this.options.getSnapshot();
    const player = snapshot.entities[snapshot.playerId];
    if (!player || player.hp <= 0) return;
    const mapId = this.options.getMapId();
    const target = Object.values(snapshot.entities)
      .filter((e) => e.kind === "monster" && e.mapId === mapId && e.hp > 0)
      .sort((a, b) => distance(player, a) - distance(player, b))[0];
    if (target)
      this.options.session.sendCommand({
        type: "attack",
        targetId: target.id,
      });
    void event;
  }

  /** Vòng lặp: gửi lệnh di chuyển mỗi 140ms khi có phím giữ. */
  update(delta: number) {
    if (this.options.isBlocked()) return;
    const active = document.activeElement;
    if (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement
    )
      return;
    const snapshot = this.options.getSnapshot();
    const player = snapshot.entities[snapshot.playerId];
    if (!player || player.hp <= 0) return;
    const has = (...keys: string[]) => keys.some((k) => this.keys.has(k));
    const dx = Number(has("d", "arrowright")) - Number(has("a", "arrowleft"));
    const dy = Number(has("s", "arrowdown")) - Number(has("w", "arrowup"));
    if (!dx && !dy) return;
    this.lastMove += delta;
    if (this.lastMove < MOVE_INTERVAL) return;
    this.lastMove = 0;
    // Hướng phím quy về thế giới theo phép chiếu iso 2D:
    // phím lên = (−1,−1), phải = (+1,−1), xuống = (+1,+1), trái = (−1,+1).
    const world = { x: dx + dy, y: dy - dx };
    const len = Math.hypot(world.x, world.y) || 1;
    this.options.session.sendCommand({
      type: "move",
      destination: {
        x: player.x + (world.x / len) * MOVE_STEP,
        y: player.y + (world.y / len) * MOVE_STEP,
      },
    });
  }

  destroy() {
    if (this.onPointerDown)
      this.element.removeEventListener("pointerdown", this.onPointerDown);
    if (this.onKeyDown) window.removeEventListener("keydown", this.onKeyDown);
    if (this.onKeyUp) window.removeEventListener("keyup", this.onKeyUp);
    this.keys.clear();
  }
}
