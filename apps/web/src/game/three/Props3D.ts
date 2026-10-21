import * as THREE from "three";
import {
  getMap,
  propAssets,
  type MapDefinition,
  type MapProp,
} from "@kiem-hiep/game-content";
import { CHUNK_SIZE } from "../world/chunks";
import { pxToUnits, worldTo3D } from "./coords";

interface PropType {
  type: string;
  texture?: THREE.Texture;
  /** Bề rộng hiển thị (đơn vị thế giới). */
  width: number;
  /** Chiều cao hiển thị (đơn vị thế giới). */
  height: number;
  /** Độ lệch dọc của plane so với mặt đất tại điểm neo. */
  lift: number;
}

interface PropInstance {
  prop: MapProp;
  x: number;
  y: number;
}

/**
 * Vật thể môi trường 3D.
 *
 * Mỗi loại prop là một `InstancedMesh` (plane hai mặc, alphaTest 0.5) với
 * texture tải từ `propAssets`. Các instance được xoay quanh trục Y của chính
 * nó để mặt phẳng luôn hướng về camera (billboard trụ) — giống cách prop 2D
 * nằm sẵn trong khung iso.
 *
 * Bản 3D dùng z-buffer thật nên KHÔNG cần hiệu ứng occlusion fade 0.38 của
 * bản 2D: prop che nhân vật là hành vi đúng của 3D.
 */
export class Props3D {
  private group = new THREE.Group();
  private map!: MapDefinition;
  private types = new Map<string, PropType>();
  private meshes = new Map<string, THREE.InstancedMesh>();
  private instances = new Map<string, PropInstance[]>();
  private loader = new THREE.TextureLoader();
  private dummy = new THREE.Object3D();
  private mapId = "";

  constructor(private scene: THREE.Scene) {
    this.group.name = "props";
    this.scene.add(this.group);
  }

  changeMap(id: string) {
    this.destroy();
    this.mapId = id;
    this.map = getMap(id);
    this.buildTypes();
    this.buildInstances();
  }

  private buildTypes() {
    for (const asset of propAssets) {
      const width = pxToUnits(asset.displayWidth);
      const height = (asset.displayWidth * asset.height) / asset.width / 64;
      const texture = this.loader.load(asset.url);
      texture.colorSpace = THREE.SRGBColorSpace;
      this.types.set(asset.type, {
        type: asset.type,
        texture,
        width,
        height,
        // Độ lệch dọc: cạnh dưới plane chạm đất tại điểm neo theo pivot.
        lift: (1 - asset.pivot.y) * height,
      });
    }
  }

  private buildInstances() {
    for (const prop of this.map.props) {
      const list = this.instances.get(prop.type) ?? [];
      list.push({ prop, x: prop.x, y: prop.y });
      this.instances.set(prop.type, list);
    }
    for (const [type, list] of this.instances) {
      const spec = this.types.get(type);
      if (!spec || !list.length) continue;
      const geometry = new THREE.PlaneGeometry(spec.width, spec.height);
      const material = new THREE.MeshBasicMaterial({
        map: spec.texture,
        transparent: true,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.InstancedMesh(geometry, material, list.length);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.name = `prop:${type}`;
      this.meshes.set(type, mesh);
      this.group.add(mesh);
    }
  }

  /** Quay mọi instance về phía camera (billboard quanh trục Y). */
  update(camera: THREE.Camera) {
    const camPos = camera.getWorldPosition(new THREE.Vector3());
    for (const [type, list] of this.instances) {
      const mesh = this.meshes.get(type);
      const spec = this.types.get(type);
      if (!mesh || !spec) continue;
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const at = worldTo3D(item.x, item.y, 0);
        this.dummy.position.set(at.x, spec.lift + spec.height / 2, at.z);
        // Góc quay quanh trục Y để plane hướng về camera.
        this.dummy.rotation.set(0, Math.atan2(camPos.x - at.x, camPos.z - at.z), 0);
        this.dummy.scale.set(1, 1, 1);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /** Số prop thực tế của map đang nạp (đưa vào báo cáo hiệu năng). */
  get propCount() {
    let n = 0;
    for (const list of this.instances.values()) n += list.length;
    return n;
  }

  get mapId_() {
    return this.mapId;
  }

  /** Bỏ nội dung theo map (group sống cùng lớp 3D). */
  destroy() {
    for (const mesh of this.meshes.values()) {
      this.group.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    for (const spec of this.types.values()) spec.texture?.dispose();
    this.meshes.clear();
    this.instances.clear();
    this.types.clear();
  }

  /** Gỡ hẳn khỏi scene khi bộ hiển thị đóng. */
  dispose() {
    this.destroy();
    this.scene.remove(this.group);
  }
}

/** Chunk của một prop (dùng để đối chiếu vòng đời chunk của địa hình). */
export function propChunkKey(prop: MapProp) {
  return `${Math.floor(prop.x / CHUNK_SIZE)}:${Math.floor(prop.y / CHUNK_SIZE)}`;
}
