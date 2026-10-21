import * as THREE from "three";
import type { GameSnapshot } from "@kiem-hiep/game-protocol";
import {
  getMap,
  getItem,
  npcs,
  resourceNodes,
  type MapDefinition,
  type NpcDefinition,
  type ResourceDefinition,
} from "@kiem-hiep/game-content";
import { interfaceIcons, itemArtKey } from "../../ui/interface-art";
import { pxToUnits, worldTo3D } from "./coords";
import { DomOverlay } from "./dom-overlay";
import { elementColor } from "./element-colors";

/** Bảng màu độ hiếm — sao chép từ `renderers/GroundLootRenderer.ts`. */
const RARITY_COLORS: Record<string, number> = {
  common: 0xe0d9bd,
  uncommon: 0xa9d483,
  rare: 0x8ccfed,
  epic: 0xd0a1f1,
  legendary: 0xf2c14e,
  mythic: 0xf07a6a,
};

interface NpcView {
  npc: NpcDefinition;
  sprite: THREE.Mesh;
  shadow: THREE.Mesh;
  label: HTMLDivElement;
  role: HTMLDivElement;
}

interface PortalView {
  id: string;
  ring: THREE.Mesh;
  label: HTMLDivElement;
}

interface NodeView {
  node: ResourceDefinition;
  marker: THREE.Mesh;
  label: HTMLDivElement;
}

interface LootView {
  icon: THREE.Mesh;
  glow: THREE.Mesh;
  beam?: THREE.Mesh;
  label: HTMLDivElement;
}

const MAX_LOOT_LABELS = 32;

/**
 * Vật thể tĩnh của bản đồ trong bản 3D: NPC, cổng dịch chuyển, nút tài nguyên,
 * đồ rơi đất, vùng báo trước (telegraph) và đạn bay.
 *
 * Tất cả dữ liệu lấy từ snapshot/game-content giống bản 2D; khác nhau ở cách
 * vẽ: hình học cơ bản + billboard trụ thay cho Graphics của Phaser.
 */
export class WorldObjects3D {
  private group = new THREE.Group();
  private overlay: DomOverlay;
  private map!: MapDefinition;
  private npcViews: NpcView[] = [];
  private portalViews: PortalView[] = [];
  private nodeViews: NodeView[] = [];
  private lootViews = new Map<string, LootView>();
  private telegraphPool: THREE.Mesh[] = [];
  private projectilePool: THREE.Mesh[] = [];
  private iconTexture?: THREE.Texture;
  private iconColumns = 6;
  private dummy = new THREE.Object3D();
  private mapId = "";

  constructor(
    private scene: THREE.Scene,
    parent: HTMLElement,
  ) {
    this.group.name = "world-objects";
    this.scene.add(this.group);
    this.overlay = new DomOverlay(parent, "three-overlay-objects");
    this.loadIcons();
  }

  private loadIcons() {
    this.iconTexture = new THREE.TextureLoader().load(
      "/assets/interface/icons-atlas-v1.png",
    );
    this.iconTexture.colorSpace = THREE.SRGBColorSpace;
  }

  changeMap(id: string, _snapshot: GameSnapshot) {
    this.clearMap();
    this.mapId = id;
    this.map = getMap(id);
    this.buildNpcs();
    this.buildPortals();
    this.buildNodes();
  }

  private clearMap() {
    for (const view of this.npcViews) {
      this.group.remove(view.sprite);
      this.group.remove(view.shadow);
      view.sprite.geometry.dispose();
      (view.sprite.material as THREE.Material).dispose();
      // Texture SVG của NPC phải được dispose riêng — `material.dispose()`
      // không giải phóng texture.
      const npcMaterial = view.sprite.material as THREE.MeshBasicMaterial;
      npcMaterial.map?.dispose();
      view.shadow.geometry.dispose();
      (view.shadow.material as THREE.Material).dispose();
      view.label.remove();
      view.role.remove();
    }
    this.npcViews = [];
    for (const view of this.portalViews) {
      this.group.remove(view.ring);
      view.ring.geometry.dispose();
      (view.ring.material as THREE.Material).dispose();
      view.label.remove();
    }
    this.portalViews = [];
    for (const view of this.nodeViews) {
      this.group.remove(view.marker);
      view.marker.geometry.dispose();
      (view.marker.material as THREE.Material).dispose();
      view.label.remove();
    }
    this.nodeViews = [];
  }

  private buildNpcs() {
    const loader = new THREE.TextureLoader();
    for (const npc of npcs.filter((n) => n.mapId === this.mapId)) {
      const url =
        npc.id === "elder"
          ? "/assets/elder.svg"
          : npc.id === "merchant"
            ? "/assets/merchant.svg"
            : "/assets/bandit.svg";
      const texture = loader.load(url);
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
        color:
          npc.appearance === "elder"
            ? 0xb6b1a0
            : npc.appearance === "female"
              ? 0xc5d2b3
              : 0xd7b37c,
      });
      const sprite = new THREE.Mesh(
        new THREE.PlaneGeometry(pxToUnits(48), pxToUnits(72)),
        material,
      );
      sprite.renderOrder = 6;
      this.group.add(sprite);
      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(0.5, 16),
        new THREE.MeshBasicMaterial({
          color: 0x17271e,
          transparent: true,
          opacity: 0.32,
          depthWrite: false,
        }),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.scale.set(pxToUnits(34), pxToUnits(14), 1);
      shadow.renderOrder = 1;
      this.group.add(shadow);
      const label = this.createLabel("#f3e2aa", "12px");
      const role = this.createLabel(
        npc.id === "elder" ? "#efd277" : "#b0c2a5",
        "10px",
      );
      role.textContent = npc.id === "elder" ? "◆ Nhiệm vụ" : npc.role;
      this.npcViews.push({ npc, sprite, shadow, label, role });
    }
  }

  private buildPortals() {
    for (const portal of this.map.portals) {
      const ring = new THREE.Mesh(
        new THREE.CircleGeometry(0.5, 32),
        new THREE.MeshBasicMaterial({
          color: 0x86c6b2,
          transparent: true,
          opacity: 0.15,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      // `CircleGeometry(0.5)` có đường kính 1 → scale = kích thước mong muốn.
      // Bản 2D vẽ elip 64×28px → 64/64 = 1 đơn vị ngang, 28/64 = 0.4375 dọc.
      ring.scale.set(pxToUnits(64), pxToUnits(28), 1);
      ring.renderOrder = 3;
      this.group.add(ring);
      const label = this.createLabel("#d5e2b4", "12px");
      label.textContent = `◇ ${portal.name}`;
      this.portalViews.push({ id: portal.id, ring, label });
    }
  }

  private buildNodes() {
    for (const node of resourceNodes.filter((n) => n.mapId === this.mapId)) {
      const marker = new THREE.Mesh(
        this.nodeGeometry(node.kind),
        new THREE.MeshBasicMaterial({
          color: 0xb4c68a,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      marker.renderOrder = 4;
      this.group.add(marker);
      const label = this.createLabel("#d1d6a2", "10px");
      label.textContent = node.name;
      this.nodeViews.push({ node, marker, label });
    }
  }

  /** Hình học đơn giản theo loại tài nguyên (thảo dược / quặng / gỗ). */
  private nodeGeometry(kind: string) {
    if (kind === "mining")
      return new THREE.ConeGeometry(pxToUnits(20), pxToUnits(26), 3);
    if (kind === "wood") return new THREE.CylinderGeometry(pxToUnits(5), pxToUnits(5), pxToUnits(40), 6);
    return new THREE.SphereGeometry(pxToUnits(14), 8, 6);
  }

  private createLabel(color: string, size: string) {
    const el = document.createElement("div");
    el.style.position = "absolute";
    el.style.transform = "translate(-50%, -100%)";
    el.style.display = "none";
    el.style.whiteSpace = "nowrap";
    el.style.fontFamily = "Arial, sans-serif";
    el.style.fontSize = size;
    el.style.color = color;
    el.style.textShadow =
      "-1px -1px 0 #263326, 1px -1px 0 #263326, -1px 1px 0 #263326, 1px 1px 0 #263326";
    this.overlay.root.appendChild(el);
    return el;
  }

  private placeLabel(
    el: HTMLDivElement,
    x: number,
    y: number,
    z: number,
    camera: THREE.Camera,
    offsetPx = 0,
  ) {
    const projected = new THREE.Vector3(x, y, z).project(camera);
    if (projected.z > 1 || projected.z < -1) {
      el.style.display = "none";
      return;
    }
    const rect = this.overlay.root.getBoundingClientRect();
    const sx = ((projected.x + 1) / 2) * rect.width;
    const sy = ((1 - projected.y) / 2) * rect.height;
    if (sx < -160 || sx > rect.width + 160 || sy < -80 || sy > rect.height + 80) {
      el.style.display = "none";
      return;
    }
    el.style.display = "block";
    el.style.left = `${Math.round(sx)}px`;
    el.style.top = `${Math.round(sy + offsetPx)}px`;
  }

  update(
    snapshot: GameSnapshot,
    rendered: Map<string, { x: number; y: number }>,
    camera: THREE.Camera,
    mapId: string,
    night: number,
  ) {
    if (mapId !== this.mapId) return;
    const camPos = camera.getWorldPosition(new THREE.Vector3());
    for (const view of this.npcViews) {
      const at = worldTo3D(view.npc.x, view.npc.y, 0);
      view.sprite.position.set(
        at.x,
        pxToUnits(72) / 2,
        at.z,
      );
      view.sprite.rotation.set(
        0,
        Math.atan2(camPos.x - at.x, camPos.z - at.z),
        0,
      );
      view.shadow.position.set(at.x, 0.01, at.z);
      this.placeLabel(view.label, at.x, pxToUnits(87), at.z, camera);
      this.placeLabel(view.role, at.x, pxToUnits(102), at.z, camera);
    }
    // Cổng dịch chuyển: nhịp phóng 1.1 lần/1500ms (khớp tween bản 2D).
    const phase = (performance.now() % 1500) / 1500;
    const pulse = 1 + Math.sin(phase * Math.PI * 2) * 0.05;
    for (const view of this.portalViews) {
      const portal = this.map.portals.find((p) => p.id === view.id);
      if (!portal) continue;
      const at = worldTo3D(portal.x, portal.y, 0);
      view.ring.position.set(at.x, 0.03, at.z);
      view.ring.scale.set(
        pxToUnits(64) * pulse,
        pxToUnits(28) * pulse,
        1,
      );
      (view.ring.material as THREE.MeshBasicMaterial).opacity = 0.15 + 0.25 * pulse;
      this.placeLabel(view.label, at.x, pxToUnits(16), at.z, camera);
    }
    // Nút tài nguyên: sáng khi sẵn sàng, mờ 0.35 khi chưa.
    for (const view of this.nodeViews) {
      const ready = (snapshot.resources[view.node.id]?.availableAt ?? 0) <= snapshot.tick;
      const at = worldTo3D(view.node.x, view.node.y, 0);
      const material = view.marker.material as THREE.MeshBasicMaterial;
      material.opacity = ready ? 0.9 : 0.35;
      material.color.setHex(ready ? 0xb4c68a : 0x6c816c);
      view.marker.position.set(at.x, pxToUnits(14), at.z);
      view.marker.rotation.set(0, Math.atan2(camPos.x - at.x, camPos.z - at.z), 0);
      this.placeLabel(view.label, at.x, pxToUnits(27), at.z, camera);
    }
    this.updateLoot(snapshot, rendered, camera);
    this.updateTelegraphs(snapshot, camera);
    this.updateProjectiles(snapshot, camera);
    void night;
  }

  private updateLoot(
    snapshot: GameSnapshot,
    rendered: Map<string, { x: number; y: number }>,
    camera: THREE.Camera,
  ) {
    for (const [id, view] of this.lootViews)
      if (!snapshot.groundLoot[id]) {
        this.group.remove(view.icon);
        this.group.remove(view.glow);
        view.icon.geometry.dispose();
        (view.icon.material as THREE.Material).dispose();
        view.glow.geometry.dispose();
        (view.glow.material as THREE.Material).dispose();
        view.label.remove();
        this.lootViews.delete(id);
      }
    const occupied: {
      left: number;
      top: number;
      right: number;
      bottom: number;
    }[] = [];
    for (const loot of Object.values(snapshot.groundLoot)) {
      if (loot.mapId !== snapshot.mapId) continue;
      if (loot.ownerId !== snapshot.playerId) continue;
      if (loot.expiresAt <= snapshot.tick) continue;
      const pos = rendered.get(loot.id) ?? loot;
      let view = this.lootViews.get(loot.id);
      if (!view) {
        if (this.lootViews.size >= MAX_LOOT_LABELS) continue;
        view = this.createLoot(loot.item?.definitionId);
        this.lootViews.set(loot.id, view);
      }
      const definition = loot.item ? getItem(loot.item.definitionId) : null;
      const color = definition ? RARITY_COLORS[definition.rarity] : 0xe9c76b;
      const at = worldTo3D(pos.x, pos.y, 0);
      const age = snapshot.tick - loot.createdAt;
      const bounce =
        age < 12
          ? -Math.sin((age / 12) * Math.PI) * pxToUnits(15)
          : Math.sin(age / 12) * pxToUnits(1.5);
      view.icon.position.set(at.x, pxToUnits(30) / 2 + bounce, at.z);
      view.icon.rotation.set(0, Math.atan2(
        camera.getWorldPosition(new THREE.Vector3()).x - at.x,
        camera.getWorldPosition(new THREE.Vector3()).z - at.z,
      ), 0);
      (view.glow.material as THREE.MeshBasicMaterial).color.setHex(color);
      (view.glow.material as THREE.MeshBasicMaterial).opacity =
        0.65 + Math.sin(age / 10) * 0.25;
      view.glow.position.set(at.x, 0.02, at.z);
      if (view.beam) {
        view.beam.position.set(at.x, pxToUnits(30), at.z);
        view.beam.rotation.set(
          0,
          Math.atan2(
            camera.getWorldPosition(new THREE.Vector3()).x - at.x,
            camera.getWorldPosition(new THREE.Vector3()).z - at.z,
          ),
          0,
        );
      }
      // Nhãn: chống đè bằng thuật toán đẩy tối đa 16 vòng (chép bản 2D).
      const projected = new THREE.Vector3(at.x, pxToUnits(9), at.z).project(camera);
      const rect = this.overlay.root.getBoundingClientRect();
      const sx = ((projected.x + 1) / 2) * rect.width;
      const sy = ((1 - projected.y) / 2) * rect.height;
      const halfWidth = 40;
      let offsetY = 0;
      for (
        let i = 0;
        i < 16 &&
        occupied.some(
          (b) =>
            sx - halfWidth < b.right &&
            sx + halfWidth > b.left &&
            sy + offsetY < b.bottom &&
            sy + offsetY + 16 > b.top,
        );
        i++
      )
        offsetY += 18;
      occupied.push({
        left: sx - halfWidth,
        right: sx + halfWidth,
        top: sy + offsetY,
        bottom: sy + offsetY + 16,
      });
      view.label.style.display = "block";
      view.label.style.left = `${Math.round(sx)}px`;
      view.label.style.top = `${Math.round(sy + offsetY)}px`;
    }
  }

  private createLoot(definitionId?: string) {
    const definition = definitionId ? getItem(definitionId) : null;
    const color = definition ? RARITY_COLORS[definition.rarity] : 0xe9c76b;
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 20),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.scale.set(pxToUnits(31), pxToUnits(13), 1);
    glow.renderOrder = 3;
    this.group.add(glow);
    const icon = this.createIconMesh(definitionId);
    icon.renderOrder = 6;
    this.group.add(icon);
    let beam: THREE.Mesh | undefined;
    if (definition && ["rare", "epic", "legendary", "mythic"].includes(definition.rarity)) {
      beam = new THREE.Mesh(
        new THREE.PlaneGeometry(pxToUnits(4), pxToUnits(60)),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.3,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      beam.renderOrder = 4;
      this.group.add(beam);
    }
    const label = this.createLabel(
      `#${(color >>> 16 & 255).toString(16).padStart(2, "0")}${(color >>> 8 & 255)
        .toString(16)
        .padStart(2, "0")}${(color & 255).toString(16).padStart(2, "0")}`,
      "11px",
    );
    label.style.background = "rgba(16,37,30,0.79)";
    label.style.padding = "2px 4px";
    label.textContent = definition?.name ?? "";
    return { icon, glow, beam, label };
  }

  /** Icon vật phẩm từ atlas giao diện (ô 128×128, lưới tính theo ảnh thật). */
  private createIconMesh(definitionId?: string) {
    const geometry = new THREE.PlaneGeometry(pxToUnits(30), pxToUnits(30));
    if (!definitionId || !this.iconTexture) {
      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          color: 0xe9c76b,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      return mesh;
    }
    const definition = getItem(definitionId);
    const index = interfaceIcons.indexOf(
      itemArtKey(definition.id) as (typeof interfaceIcons)[number],
    );
    const material = new THREE.MeshBasicMaterial({
      map: this.iconTexture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    if (index >= 0) {
      const columns = this.iconColumns;
      const row = Math.floor(index / columns);
      const column = index % columns;
      const w = 1 / columns;
      const h = 1 / this.iconRows;
      // Atlas 6×6 = 768×768 với ô 128px.
      const cellW = 128 / 768;
      const cellH = 128 / 768;
      void w;
      void h;
      material.map!.offset.set(column * cellW, 1 - (row + 1) * cellH);
      material.map!.repeat.set(cellW, cellH);
    }
    return new THREE.Mesh(geometry, material);
  }

  private get iconRows() {
    return 6;
  }

  private updateTelegraphs(snapshot: GameSnapshot, camera: THREE.Camera) {
    const zones = snapshot.telegraphs.filter((z) => z.mapId === snapshot.mapId);
    while (this.telegraphPool.length < zones.length) {
      const mesh = new THREE.Mesh(
        new THREE.CircleGeometry(1, 40),
        new THREE.MeshBasicMaterial({
          color: 0xc65f48,
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.renderOrder = 3;
      this.group.add(mesh);
      this.telegraphPool.push(mesh);
    }
    for (let i = 0; i < this.telegraphPool.length; i++) {
      const mesh = this.telegraphPool[i];
      const zone = zones[i];
      if (!zone) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      const remaining = Math.max(0, zone.resolveAt - snapshot.tick);
      const at = worldTo3D(zone.position.x, zone.position.y, 0);
      mesh.position.set(at.x, 0.04, at.z);
      mesh.scale.set(zone.radius, zone.radius * 0.5, 1);
      (mesh.material as THREE.MeshBasicMaterial).opacity =
        0.16 + 0.12 * (1 - remaining / 30);
    }
    void camera;
  }

  private updateProjectiles(snapshot: GameSnapshot, camera: THREE.Camera) {
    const shots = snapshot.projectiles.filter((p) => p.mapId === snapshot.mapId);
    while (this.projectilePool.length < shots.length) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(pxToUnits(5), 8, 6),
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
        }),
      );
      mesh.renderOrder = 7;
      this.group.add(mesh);
      this.projectilePool.push(mesh);
    }
    for (let i = 0; i < this.projectilePool.length; i++) {
      const mesh = this.projectilePool[i];
      const shot = shots[i];
      if (!shot) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      const at = worldTo3D(shot.x, shot.y, pxToUnits(25));
      mesh.position.set(at.x, at.y, at.z);
      (mesh.material as THREE.MeshBasicMaterial).color.setHex(
        elementColor(shot.element),
      );
    }
    void camera;
  }

  get domCount() {
    let n = 0;
    for (const view of this.npcViews) {
      if (view.label.style.display !== "none") n++;
      if (view.role.style.display !== "none") n++;
    }
    for (const view of this.portalViews)
      if (view.label.style.display !== "none") n++;
    for (const view of this.nodeViews)
      if (view.label.style.display !== "none") n++;
    for (const view of this.lootViews.values())
      if (view.label.style.display !== "none") n++;
    return n;
  }

  destroy() {
    this.clearMap();
    for (const mesh of this.telegraphPool) {
      this.group.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.telegraphPool = [];
    for (const mesh of this.projectilePool) {
      this.group.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.projectilePool = [];
    this.iconTexture?.dispose();
    this.overlay.destroy();
    this.scene.remove(this.group);
  }
}
