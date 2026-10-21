import * as THREE from "three";
import type { GameEvent, GameSnapshot } from "@kiem-hiep/game-protocol";
import { getPreferences, qualityBudget } from "../preferences";
import { pxToUnits, worldTo3D } from "./coords";
import { elementColor } from "./element-colors";
import { DomOverlay } from "./dom-overlay";

interface Burst {
  mesh: THREE.Mesh;
  start: number;
  until: number;
  size: number;
  ground: boolean;
}

interface Popup {
  el: HTMLDivElement;
  start: number;
  until: number;
  worldX: number;
  worldY: number;
  worldZ: number;
}

/** Số chữ bay tối đa (khớp bản 2D). */
const MAX_POPUPS = 16;
/** Vòng đời chữ bay (ms) — khớp bản 2D. */
const POPUP_LIFE = 850;
/** Marker di chuyển: sống 700ms, phóng 1.7 lần (khớp tween bản 2D). */
const MARKER_LIFE = 700;

/**
 * Hiệu ứng combat của bản 3D: burst theo nguyên tố, chữ bay sát thương/hồi
 * máu/đột phá và marker điểm đến.
 *
 * Trần hiệu ứng đồng thời theo `qualityBudget().maxEffects` (giống bản 2D).
 */
export class Effects3D {
  private group = new THREE.Group();
  private overlay: DomOverlay;
  private bursts: Burst[] = [];
  private popups: Popup[] = [];
  private freePopups: HTMLDivElement[] = [];
  private marker?: THREE.Mesh;
  private markerUntil = 0;
  private dummy = new THREE.Object3D();

  constructor(
    private scene: THREE.Scene,
    parent: HTMLElement,
  ) {
    this.group.name = "effects";
    this.scene.add(this.group);
    this.overlay = new DomOverlay(parent, "three-overlay-effects");
  }

  /** Nhận sự kiện combat từ `session.subscribe`. */
  event(e: GameEvent, snapshot: GameSnapshot) {
    const entity = e.entityId ? snapshot.entities[e.entityId] : null;
    if (!entity || entity.mapId !== snapshot.mapId) return;
    if (["damage", "heal", "level"].includes(e.type))
      this.popup(e, entity.x, entity.y);
    if (
      !["skill", "impact", "damage", "heal", "level", "status"].includes(
        e.type,
      ) ||
      (e.type === "damage" && !e.value)
    )
      return;
    const limit = qualityBudget(window.innerWidth).maxEffects;
    if (this.bursts.length >= limit) return;
    const healing = e.type === "heal" || e.skillId === "heal";
    const impact = e.type === "damage" || e.type === "impact";
    const size = e.type === "level" ? 60 : impact ? 28 : 43;
    const color = healing ? 0xb7df9c : elementColor(e.element ?? entity.element);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    );
    const at = worldTo3D(entity.x, entity.y, pxToUnits(20));
    mesh.position.set(at.x, at.y, at.z);
    mesh.renderOrder = 8;
    this.group.add(mesh);
    const now = performance.now();
    this.bursts.push({
      mesh,
      start: now,
      until: now + (impact ? 330 : 650),
      size: pxToUnits(size),
      ground: false,
    });
  }

  private popup(e: GameEvent, x: number, y: number) {
    if (this.popups.length >= MAX_POPUPS) return;
    const el = this.freePopups.pop() ?? document.createElement("div");
    el.style.position = "absolute";
    el.style.transform = "translate(-50%, -100%)";
    el.style.display = "block";
    el.style.fontFamily = "Georgia, serif";
    el.style.fontWeight = "bold";
    el.style.textShadow = "-1px -1px 0 #16241e, 1px -1px 0 #16241e";
    el.style.pointerEvents = "none";
    if (!el.isConnected) this.overlay.root.appendChild(el);
    el.textContent =
      e.type === "level"
        ? "ĐỘT PHÁ"
        : e.type === "heal"
          ? `+${e.value ?? ""}`
          : e.text;
    el.style.fontSize = `${e.critical ? 27 : 19}px`;
    el.style.color =
      e.type === "heal" ? "#c8efae" : e.critical ? "#ffe3a3" : "#f0d39a";
    const now = performance.now();
    this.popups.push({
      el,
      start: now,
      until: now + POPUP_LIFE,
      worldX: x,
      worldY: y,
      worldZ: pxToUnits(20),
    });
  }

  /** Marker vị trí đến khi người chơi bấm mặt đất. */
  showMoveMarker(x: number, y: number) {
    if (!this.marker) {
      this.marker = new THREE.Mesh(
        new THREE.RingGeometry(0.7, 0.95, 32),
        new THREE.MeshBasicMaterial({
          color: 0xe0ce94,
          transparent: true,
          opacity: 0.8,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      this.marker.rotation.x = -Math.PI / 2;
      this.marker.renderOrder = 4;
      this.group.add(this.marker);
    }
    const at = worldTo3D(x, y, 0);
    this.marker.position.set(at.x, 0.05, at.z);
    this.marker.visible = true;
    this.markerUntil = performance.now() + MARKER_LIFE;
  }

  update(
    snapshot: GameSnapshot,
    rendered: Map<string, { x: number; y: number }>,
    camera: THREE.Camera,
    mapId: string,
  ) {
    const now = performance.now();
    const camPos = camera.getWorldPosition(new THREE.Vector3());
    // Burst.
    this.bursts = this.bursts.filter((b) => {
      if (now >= b.until) {
        this.group.remove(b.mesh);
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.Material).dispose();
        return false;
      }
      const p = (now - b.start) / (b.until - b.start);
      const still = getPreferences().reducedMotion;
      b.mesh.rotation.set(
        0,
        Math.atan2(camPos.x - b.mesh.position.x, camPos.z - b.mesh.position.z),
        0,
      );
      const scale = still ? 1 : 1 + p * 0.55;
      b.mesh.scale.set(b.size * 2 * scale, b.size * 2 * scale, 1);
      (b.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - p;
      return true;
    });
    // Chữ bay.
    this.popups = this.popups.filter((p) => {
      if (now >= p.until) {
        p.el.style.display = "none";
        this.freePopups.push(p.el);
        return false;
      }
      const progress = (now - p.start) / (p.until - p.start);
      const offset = ((p.worldX - p.worldY) * 48) / 64;
      const at = new THREE.Vector3(p.worldX, p.worldZ, p.worldY);
      const projected = at.clone().project(camera);
      const rect = this.overlay.root.getBoundingClientRect();
      const sx = ((projected.x + 1) / 2) * rect.width + offset;
      const sy = ((1 - projected.y) / 2) * rect.height;
      p.el.style.display = "block";
      p.el.style.left = `${Math.round(sx)}px`;
      p.el.style.top = `${Math.round(sy - progress * 48)}px`;
      p.el.style.opacity = `${1 - progress}`;
      return true;
    });
    // Marker điểm đến.
    if (this.marker) {
      if (now >= this.markerUntil) {
        this.marker.visible = false;
      } else {
        const progress = (now - (this.markerUntil - MARKER_LIFE)) / MARKER_LIFE;
        const scale = 1 + progress * 0.7;
        this.marker.scale.set(scale, scale, 1);
        (this.marker.material as THREE.MeshBasicMaterial).opacity =
          0.8 * (1 - progress);
      }
    }
    void snapshot;
    void rendered;
    void mapId;
    void this.dummy;
  }

  get activeEffects() {
    return this.bursts.length;
  }

  get domCount() {
    let n = 0;
    for (const p of this.popups)
      if (p.el.style.display !== "none") n++;
    return n;
  }

  destroy() {
    for (const b of this.bursts) {
      this.group.remove(b.mesh);
      b.mesh.geometry.dispose();
      (b.mesh.material as THREE.Material).dispose();
    }
    this.bursts = [];
    for (const p of this.popups) p.el.remove();
    for (const p of this.freePopups) p.remove();
    this.popups = [];
    this.freePopups = [];
    if (this.marker) {
      this.group.remove(this.marker);
      this.marker.geometry.dispose();
      (this.marker.material as THREE.Material).dispose();
    }
    this.overlay.destroy();
    this.scene.remove(this.group);
  }
}
