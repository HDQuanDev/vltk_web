import * as THREE from "three";
import type { CombatEntity, GameSnapshot } from "@kiem-hiep/game-protocol";
import { actorSpriteManifest, getSect } from "@kiem-hiep/game-content";
import {
  actorSpriteFiles,
  actorSpriteFrame,
  actorSpriteHeight,
  actorSpriteOriginY,
} from "../animations/actor-sprites";
import {
  monsterSpriteFiles,
  monsterSpriteFrame,
  monsterSpriteHeight,
  monsterSpriteOriginY,
  isBossMonster,
} from "../animations/monster-sprites";
import { SPRITE_FACINGS, SPRITE_STATE_NAMES } from "../animations/sprite-frames";
import { pxToUnits, spriteAnchorHeight, worldTo3D } from "./coords";
import {
  attachInstancedAttributes,
  createInstancedMaterial,
  setInstanceAlpha,
  setInstanceCell,
  setInstanceFlip,
  setInstanceTint,
} from "./instanced-material";
import {
  AtlasCache,
  ATLAS_COLUMNS,
  ATLAS_ROWS,
} from "./atlas-cache";
import {
  DomOverlay,
  createEntityLabel,
  createStatusDots,
  type EntityLabel,
} from "./dom-overlay";

/** Số bộ nhãn DOM dùng lại tối đa. */
const MAX_LABELS = 64;
/** Ngưỡng HP dùng chung (`actorSpriteManifest.hurtHpRatio`). */
const hurtHpRatio = actorSpriteManifest.hurtHpRatio;

type OwnerKind = "actor" | "monster";

interface OwnerGroup {
  kind: OwnerKind;
  /** Khoá cache: bộ nhân vật `<phái>/<giới>` hoặc id quái. */
  owner: string;
  mesh: THREE.InstancedMesh;
  /** Entity id → index trong instanced mesh. */
  slots: Map<string, number>;
}

interface EntityView {
  label: EntityLabel;
  dots: HTMLDivElement[];
  /** Thời điểm hết hiệu ứng nháy sáng (ms). */
  flashUntil: number;
  /** Tên owner để tra atlas khi vẽ lại. */
  owner: string;
  kind: OwnerKind;
}

const FLASH_COLOR = new THREE.Color(0xf6e8c9);
const WHITE = new THREE.Color(0xffffff);

/**
 * Actor 3D: nhân vật và quái vẽ bằng billboard trụ.
 *
 * Khung hình chọn bằng ĐÚNG các hàm sẵn có (`actorSpriteFrame`,
 * `monsterSpriteFrame`) — không viết lại bảng ánh xạ state/hướng.
 *
 * Mỗi owner (bộ nhân vật hoặc id quái) là một `InstancedMesh` với atlas 3×13 ô;
 * shader chọn ô theo thuộc tính instanced `aCell` và lật ngang theo `aFlip`.
 */
export class Actors3D {
  private group = new THREE.Group();
  private overlay: DomOverlay;
  private atlases = new AtlasCache();
  private groups = new Map<string, OwnerGroup>();
  private views = new Map<string, EntityView>();
  private labels: EntityLabel[] = [];
  private dummy = new THREE.Object3D();
  private shadowMesh: THREE.InstancedMesh;
  private ringMesh: THREE.InstancedMesh;
  private shadowGeometry: THREE.CircleGeometry;
  private ringGeometry: THREE.RingGeometry;
  private visibleCount = 0;
  private mapId = "";

  constructor(
    private scene: THREE.Scene,
    parent: HTMLElement,
  ) {
    this.group.name = "actors";
    this.scene.add(this.group);
    this.overlay = new DomOverlay(parent, "three-overlay-actors");
    for (let i = 0; i < MAX_LABELS; i++) {
      const label = createEntityLabel(this.overlay);
      this.labels.push(label);
    }
    // Bóng giả: elip phẳng trên mặt đất (mỗi quái 31×12px, boss 60×12px).
    this.shadowGeometry = new THREE.CircleGeometry(0.5, 16);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x112b1e,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    this.shadowMesh = new THREE.InstancedMesh(
      this.shadowGeometry,
      shadowMaterial,
      256,
    );
    this.shadowMesh.frustumCulled = false;
    this.shadowMesh.renderOrder = 1;
    this.group.add(this.shadowMesh);
    // Vòng mục tiêu: ring phẳng trên mặt đất.
    this.ringGeometry = new THREE.RingGeometry(0.6, 0.72, 24);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xd5c48b,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.ringMesh = new THREE.InstancedMesh(
      this.ringGeometry,
      ringMaterial,
      256,
    );
    this.ringMesh.frustumCulled = false;
    this.ringMesh.renderOrder = 2;
    this.group.add(this.ringMesh);
  }

  /** Bỏ nội dung theo map (group sống cùng lớp 3D). */
  changeMap(id: string) {
    this.mapId = id;
    for (const [key, group] of this.groups) {
      this.group.remove(group.mesh);
      group.mesh.geometry.dispose();
      (group.mesh.material as THREE.Material).dispose();
      this.groups.delete(key);
    }
    this.atlases.reset();
    for (const view of this.views.values()) view.label.root.style.display = "none";
    this.views.clear();
  }

  /** Bộ atlas của một owner (nhân vật hoặc quái) — nạp nếu chưa có. */
  private ensureOwner(kind: OwnerKind, owner: string) {
    const key = `${kind}:${owner}`;
    const existing = this.groups.get(key);
    if (existing) return existing;
    const files =
      kind === "actor"
        ? actorSpriteFiles(owner)
        : monsterSpriteFiles(owner);
    const atlas = this.atlases.load(key, files);
    if (!atlas) return null;
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = createInstancedMaterial({
      map: atlas.texture,
      transparent: true,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
      cell: true,
      flip: true,
      tint: true,
      alpha: true,
      atlas: { columns: ATLAS_COLUMNS, rows: ATLAS_ROWS },
    });
    const mesh = new THREE.InstancedMesh(geometry, material, 256);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.renderOrder = 5;
    mesh.count = 0;
    mesh.name = `actor:${key}`;
    attachInstancedAttributes(mesh, 256, {
      cell: true,
      flip: true,
      tint: true,
      alpha: true,
    });
    const group: OwnerGroup = { kind, owner, mesh, slots: new Map() };
    this.groups.set(key, group);
    this.group.add(mesh);
    return group;
  }

  /** Dự phòng khi atlas chưa nạp xong hoặc owner không có bộ ảnh. */
  private fallbackColor(e: CombatEntity) {
    if (e.kind === "player") {
      try {
        return new THREE.Color(getSect(e.definitionId).color);
      } catch {
        return new THREE.Color(0x9aa88f);
      }
    }
    return new THREE.Color(0x8a8f7a);
  }

  private acquireLabel(): EntityLabel | null {
    for (const label of this.labels)
      if (label.root.style.display === "none") return label;
    return null;
  }

  update(
    snapshot: GameSnapshot,
    rendered: Map<string, { x: number; y: number }>,
    camera: THREE.Camera,
    mapId: string,
  ) {
    this.mapId = mapId;
    const player = snapshot.entities[snapshot.playerId];
    // Bỏ các view của entity không còn trên bản đồ.
    for (const [id, view] of this.views)
      if (!snapshot.entities[id]) {
        view.label.root.style.display = "none";
        this.views.delete(id);
      }
    // Reset slot của từng nhóm trước khi gán lại.
    for (const group of this.groups.values()) {
      group.slots.clear();
      group.mesh.count = 0;
    }
    let shadowCount = 0;
    let ringCount = 0;
    const camPos = camera.getWorldPosition(new THREE.Vector3());
    const used = new Set<string>();
    for (const e of Object.values(snapshot.entities)) {
      if (e.mapId !== mapId) continue;
      const pos = rendered.get(e.id) ?? e;
      const view = this.views.get(e.id);
      const isMonster = e.kind === "monster";
      const lowHp = e.maxHp > 0 && e.hp / e.maxHp <= hurtHpRatio;
      const frame = isMonster
        ? monsterSpriteFrame(
            e.definitionId,
            e.state,
            e.direction,
            snapshot.tick - e.stateStartedAt,
            { lowHp },
          )
        : actorSpriteFrame(
            e.definitionId,
            this.appearanceFor(e, snapshot),
            e.state,
            e.direction,
            snapshot.tick - e.stateStartedAt,
            { lowHp },
          );
      const owner = isMonster
        ? e.definitionId
        : frame && "owner" in frame
          ? String(frame.owner)
          : "";
      const kind: OwnerKind = isMonster ? "monster" : "actor";
      const group =
        frame && owner
          ? this.ensureOwner(kind, owner)
          : this.fallbackGroup(kind, owner);
      if (!group) continue;
      const index = group.slots.size;
      if (index >= 256) continue;
      group.slots.set(e.id, index);
      used.add(`${kind}:${owner}`);
      const displayHeight = isMonster
        ? monsterSpriteHeight(e.definitionId)
        : actorSpriteHeight;
      const originY = isMonster
        ? monsterSpriteOriginY
        : actorSpriteOriginY;
      const units = pxToUnits(displayHeight);
      const anchor = spriteAnchorHeight(units, originY);
      const at = worldTo3D(pos.x, pos.y, 0);
      this.dummy.position.set(at.x, anchor, at.z);
      this.dummy.rotation.set(
        0,
        Math.atan2(camPos.x - at.x, camPos.z - at.z),
        0,
      );
      this.dummy.scale.set(units, units, 1);
      this.dummy.updateMatrix();
      group.mesh.setMatrixAt(index, this.dummy.matrix);
      group.mesh.count = index + 1;
      // Ô atlas: cột theo hướng, hàng theo tên trạng thái.
      if (frame) {
        const column = SPRITE_FACINGS.indexOf(frame.facing);
        const row = SPRITE_STATE_NAMES.indexOf(frame.state);
        setInstanceCell(group.mesh, index, column, row);
        setInstanceFlip(group.mesh, index, frame.flipX);
      } else {
        setInstanceCell(group.mesh, index, 0, 0);
        setInstanceFlip(group.mesh, index, false);
      }
      // Nháy sáng khi trúng đòn (70ms) + mờ 0.55 khi chết.
      let view2 = view;
      if (!view2) {
        const label = this.acquireLabel();
        if (!label) continue;
        // Nhãn được tái sử dụng cho entity khác: xoá chấm cũ trước.
        label.dots.replaceChildren();
        const dots = createStatusDots(label.dots, 6);
        view2 = { label, dots, flashUntil: 0, owner, kind };
        this.views.set(e.id, view2);
      }
      const entityView = view2;
      const flashing = performance.now() < entityView.flashUntil;
      setInstanceTint(
        group.mesh,
        index,
        flashing ? FLASH_COLOR : WHITE,
      );
      setInstanceAlpha(group.mesh, index, e.hp <= 0 ? 0.55 : 1);
      // Bóng giả: elip phẳng trên mặt đất (quái 31×12px, boss 60×12px).
      if (shadowCount < 256) {
        const shadowWidth = isMonster
          ? pxToUnits(isBossMonster(e.definitionId) ? 60 : 31)
          : pxToUnits(31);
        this.dummy.position.set(at.x, 0.01, at.z);
        this.dummy.rotation.set(-Math.PI / 2, 0, 0);
        this.dummy.scale.set(shadowWidth, shadowWidth * (12 / 31), 1);
        this.dummy.updateMatrix();
        this.shadowMesh.setMatrixAt(shadowCount, this.dummy.matrix);
        shadowCount++;
      }
      // Vòng mục tiêu.
      if (ringCount < 256 && (e.kind === "player" || player?.targetId === e.id)) {
        this.dummy.position.set(at.x, 0.02, at.z);
        this.dummy.rotation.set(-Math.PI / 2, 0, 0);
        this.dummy.scale.set(pxToUnits(42), pxToUnits(20), 1);
        this.dummy.updateMatrix();
        this.ringMesh.setMatrixAt(ringCount, this.dummy.matrix);
        ringCount++;
      }
      this.updateLabel(
        e,
        entityView.label,
        entityView.dots,
        pos,
        units,
        camera,
        snapshot,
      );
    }
    for (const group of this.groups.values()) {
      group.mesh.instanceMatrix.needsUpdate = true;
    }
    this.shadowMesh.count = shadowCount;
    this.shadowMesh.instanceMatrix.needsUpdate = true;
    this.ringMesh.count = ringCount;
    this.ringMesh.instanceMatrix.needsUpdate = true;
    this.visibleCount = shadowCount;
    // Thả atlas của owner không còn trên bản đồ (bám theo map như bản 2D).
    this.atlases.retain(used);
  }

  /** Nhóm dự phòng: quad màu đặc khi chưa có atlas. */
  private fallbackGroup(kind: OwnerKind, owner: string) {
    const key = `fallback:${kind}:${owner}`;
    const existing = this.groups.get(key);
    if (existing) return existing;
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0x8a8f7a,
      transparent: true,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, 256);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.renderOrder = 5;
    mesh.count = 0;
    mesh.name = `actor-fallback:${key}`;
    attachInstancedAttributes(mesh, 256, { tint: true, alpha: true });
    const group: OwnerGroup = { kind, owner, mesh, slots: new Map() };
    this.groups.set(key, group);
    this.group.add(mesh);
    return group;
  }

  private appearanceFor(e: CombatEntity, snapshot: GameSnapshot) {
    if (e.id === snapshot.playerId) return snapshot.appearance;
    return snapshot.actors[e.id]?.appearance ?? "male";
  }

  private updateLabel(
    e: CombatEntity,
    view: EntityLabel,
    dots: HTMLDivElement[],
    pos: { x: number; y: number },
    units: number,
    camera: THREE.Camera,
    snapshot: GameSnapshot,
  ) {
    const head = new THREE.Vector3(
      pos.x,
      units,
      pos.y,
    );
    const projected = head.clone().project(camera);
    if (projected.z > 1 || projected.z < -1) {
      view.root.style.display = "none";
      return;
    }
    const rect = this.overlay.root.getBoundingClientRect();
    const x = ((projected.x + 1) / 2) * rect.width;
    const y = ((1 - projected.y) / 2) * rect.height;
    if (x < -120 || x > rect.width + 120 || y < -80 || y > rect.height + 80) {
      view.root.style.display = "none";
      return;
    }
    view.root.style.display = "block";
    view.root.style.left = `${Math.round(x)}px`;
    view.root.style.top = `${Math.round(y - 12 / 64 * 64 / 64)}px`;
    view.name.textContent = e.name;
    view.name.style.color =
      e.kind === "player" ? "#d4e9bc" : e.elite ? "#f2cf77" : "#ead6ba";
    if (e.hp > 0 && e.maxHp > 0) {
      view.bar.style.display = "block";
      view.fill.style.display = "block";
      view.fill.style.width = `${Math.max(0, (44 * e.hp) / e.maxHp)}px`;
      view.fill.style.background =
        e.kind === "player" ? "#9fae6f" : "#b75642";
    } else {
      view.bar.style.display = "none";
      view.fill.style.display = "none";
    }
    if (e.casting) {
      const total = Math.max(1, e.casting.resolveAt - e.stateStartedAt);
      const progress = 1 - (e.casting.resolveAt - snapshot.tick) / total;
      view.cast.style.display = "block";
      view.castFill.style.width = `${Math.max(0, Math.min(1, progress)) * 44}px`;
    } else {
      view.cast.style.display = "none";
    }
    const statuses = e.statuses.slice(0, 6);
    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      const status = statuses[i];
      if (!status) {
        dot.style.display = "none";
        continue;
      }
      dot.style.display = "inline-block";
      dot.style.background =
        status.kind === "poison"
          ? "#a6c16c"
          : status.kind === "burn"
            ? "#d79564"
            : status.kind === "shield"
              ? "#dac58b"
              : "#9ac5cf";
    }
  }

  /** Nháy sáng entity khi trúng đòn (70ms, khớp `setTintFill` của WorldScene). */
  flash(entityId: string) {
    const view = this.views.get(entityId);
    if (!view) return;
    view.flashUntil = performance.now() + 70;
  }

  get domCount() {
    let n = 0;
    for (const view of this.views.values())
      if (view.label.root.style.display !== "none") n++;
    return n;
  }

  get visibleActors() {
    return this.visibleCount;
  }

  destroy() {
    for (const group of this.groups.values()) {
      this.group.remove(group.mesh);
      group.mesh.geometry.dispose();
      (group.mesh.material as THREE.Material).dispose();
    }
    this.groups.clear();
    this.atlases.dispose();
    this.overlay.destroy();
    this.scene.remove(this.group);
  }
}
