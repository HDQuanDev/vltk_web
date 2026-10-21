import * as THREE from "three";
import {
  getMap,
  groundTextureAsset,
  type MapDefinition,
} from "@kiem-hiep/game-content";
import {
  CHUNK_SIZE,
  LANDSCAPE_PADDING,
  type ChunkPosition,
} from "../world/chunks";
import { terrainCanvas } from "../renderers/ChunkWorldRenderer";
import { qualityBudget } from "../preferences";

interface ChunkView {
  key: string;
  mesh: THREE.Mesh;
  texture: THREE.CanvasTexture;
  bytes: number;
}

/**
 * Địa hình 3D chia theo chunk giống bản 2D.
 *
 * Mặt đất mỗi chunk là một plane 8×8 đơn vị thế giới nằm ngang (y = 0), texture
 * lấy CHÍNH canvas địa hình mà bản 2D vẽ (`terrainCanvas`) nên màu đất, đường,
 * nước và quảng trường khớp 100% với bản 2D.
 *
 * Ánh xạ world → UV là HÀM AFFINE (sx = (x−y)·48, sy = (x+y)·24), nên gán UV
 * theo công thức ở 4 đỉnh là chính xác cả trong tam giác (nội suy barycentric
 * tái tạo chính xác hàm affine trên mỗi tam giác).
 *
 * Lật trục V: canvas được vẽ theo phép chiếu iso 2D (screen Y đi xuống), còn
 * V của three đi lên → v = 1 − (sy − bounds.y)/bounds.height.
 */
export class Terrain3D {
  private map!: MapDefinition;
  private group = new THREE.Group();
  private cache = new Map<string, ChunkView>();
  private active = new Set<string>();
  private createdThisFrame = 0;
  private groundImage?: HTMLImageElement;
  private groundReady = false;
  private resolution = 1;
  private queued = 0;
  private created = 0;
  private released = 0;
  private mapId = "";

  constructor(
    private scene: THREE.Scene,
    private renderer: THREE.WebGLRenderer,
  ) {
    this.group.name = "terrain";
    this.scene.add(this.group);
    this.loadGround();
  }

  private loadGround() {
    const image = new Image();
    image.onload = () => {
      this.groundImage = image;
      this.groundReady = true;
    };
    image.onerror = () => {
      this.groundReady = false;
    };
    image.src = groundTextureAsset.url;
  }

  changeMap(id: string) {
    this.destroy();
    this.mapId = id;
    this.map = getMap(id);
    this.resolution = qualityBudget(this.width).chunkResolution;
  }

  private get width() {
    return this.renderer.domElement.clientWidth || 1280;
  }

  /** Chunk chứa người chơi và các chunk lân cận, ưu tiên gần nhất. */
  private collect(player: { x: number; y: number }) {
    const limit = qualityBudget(this.width).cacheChunks;
    const cx = Math.floor(player.x / CHUNK_SIZE);
    const cy = Math.floor(player.y / CHUNK_SIZE);
    // Bán kính Chebyshev suy từ ngân sách chunk (hình vuông (2r+1)² chunk).
    let radius = 0;
    while ((radius + 1) * 2 + 1 <= Math.sqrt(limit)) radius++;
    const loX = Math.max(
      Math.floor(-LANDSCAPE_PADDING / CHUNK_SIZE),
      cx - radius,
    );
    const hiX = Math.min(
      Math.ceil((this.map.width + LANDSCAPE_PADDING) / CHUNK_SIZE) - 1,
      cx + radius,
    );
    const loY = Math.max(
      Math.floor(-LANDSCAPE_PADDING / CHUNK_SIZE),
      cy - radius,
    );
    const hiY = Math.min(
      Math.ceil((this.map.height + LANDSCAPE_PADDING) / CHUNK_SIZE) - 1,
      cy + radius,
    );
    const out: ChunkPosition[] = [];
    for (let y = loY; y <= hiY; y++)
      for (let x = loX; x <= hiX; x++)
        out.push({ x, y, key: `${x}:${y}` });
    out.sort((a, b) => {
      const da = Math.hypot(
        (a.x + 0.5) * CHUNK_SIZE - player.x,
        (a.y + 0.5) * CHUNK_SIZE - player.y,
      );
      const db = Math.hypot(
        (b.x + 0.5) * CHUNK_SIZE - player.x,
        (b.y + 0.5) * CHUNK_SIZE - player.y,
      );
      return da - db;
    });
    return out.slice(0, limit);
  }

  update(player: { x: number; y: number }) {
    if (!this.map) return;
    const budget = qualityBudget(this.width);
    if (budget.chunkResolution !== this.resolution) this.changeMap(this.mapId);
    const wanted = this.collect(player);
    const keep = new Set(wanted.map((c) => c.key));
    for (const [key, view] of this.cache)
      if (!keep.has(key)) {
        this.release(view);
        this.cache.delete(key);
      }
    this.active = new Set(keep);
    // Tối đa 2 chunk mỗi frame để không giật khung hình (giống bản 2D).
    this.createdThisFrame = 0;
    const pending = wanted.filter((c) => !this.cache.has(c.key));
    this.queued = pending.length;
    if (!this.groundReady || !this.groundImage) return;
    const start = performance.now();
    for (const chunk of pending) {
      if (
        this.createdThisFrame >= 2 ||
        (this.createdThisFrame > 0 && performance.now() - start >= 4)
      )
        break;
      const view = this.create(chunk);
      this.cache.set(chunk.key, view);
      this.created++;
      this.createdThisFrame++;
    }
    this.queued = pending.length - this.createdThisFrame;
  }

  private create(chunk: ChunkPosition): ChunkView {
    // Vùng world mà canvas chunk thực sự vẽ: ô (cx·8 … cx·8+7) × (cy·8 …
    // cy·8+7), mỗi ô là thoi rộng 96px × cao 48px theo phép chiếu iso 2D.
    // Vùng này KHÔNG dùng `chunkBounds` của bản 2D (vốn dựng rộng 772×388 và
    // lệch nửa ô) — bản 3D cần vùng vẽ chính xác để các chunk khớp kề nhau.
    const bounds = this.drawnBounds(chunk.x, chunk.y);
    const { canvas } = terrainCanvas(
      this.map,
      chunk,
      this.resolution,
      this.groundImage as CanvasImageSource,
      bounds,
    );
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(
      4,
      this.renderer.capabilities.getMaxAnisotropy(),
    );
    texture.needsUpdate = true;
    // Plane phủ đúng vùng world của chunk: 8×8 đơn vị, tâm (cx·8+4, cy·8+4).
    const cx = chunk.x * CHUNK_SIZE + CHUNK_SIZE / 2;
    const cy = chunk.y * CHUNK_SIZE + CHUNK_SIZE / 2;
    const geometry = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE);
    this.applyChunkUv(geometry, cx, cy, bounds);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      alphaTest: 0.5,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(cx, 0, cy);
    mesh.renderOrder = -10;
    mesh.name = `chunk:${chunk.key}`;
    this.group.add(mesh);
    return {
      key: chunk.key,
      mesh,
      texture,
      bytes: canvas.width * canvas.height * 4,
    };
  }

  /**
   * Gán UV theo phép chiếu iso 2D: điểm thế giới (x, y) nằm ở pixel
   * ((x−y)·48, (x+y)·24) trong canvas chunk. Ánh xạ là affine nên gán ở 4 đỉnh
   * là chính xác cả trong tam giác.
   */
  private applyChunkUv(
    geometry: THREE.PlaneGeometry,
    cx: number,
    cy: number,
    bounds: { x: number; y: number; width: number; height: number },
  ) {
    const uv = geometry.getAttribute("uv") as THREE.BufferAttribute;
    const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
    // PlaneGeometry: đỉnh (px, py) → sau khi xoay −90° quanh X: world = (px, −py).
    for (let i = 0; i < uv.count; i++) {
      const wx = cx + pos.getX(i);
      const wy = cy - pos.getY(i);
      const sx = (wx - wy) * 48;
      const sy = (wx + wy) * 24;
      uv.setXY(
        i,
        (sx - bounds.x) / bounds.width,
        1 - (sy - bounds.y) / bounds.height,
      );
    }
    uv.needsUpdate = true;
  }

  /**
   * Vùng pixel (hệ toạ độ màn hình iso 2D) mà canvas chunk vẽ: 768×384,
   * khớp 64 ô thoi của chunk, không có viền thừa.
   */
  private drawnBounds(x: number, y: number) {
    return {
      x: (x - y) * CHUNK_SIZE * 48 - CHUNK_SIZE * 48,
      y: (x + y) * CHUNK_SIZE * 24 - CHUNK_SIZE * 24,
      width: CHUNK_SIZE * 96,
      height: CHUNK_SIZE * 48,
    };
  }

  private release(view: ChunkView) {
    this.released++;
    this.group.remove(view.mesh);
    view.mesh.geometry.dispose();
    (view.mesh.material as THREE.Material).dispose();
    view.texture.dispose();
  }

  get diagnostics() {
    return {
      activeChunks: this.active.size,
      cachedChunks: this.cache.size,
      queuedChunks: this.queued,
      createdThisFrame: this.createdThisFrame,
      createdChunks: this.created,
      releasedChunks: this.released,
      terrainBytes: [...this.cache.values()].reduce((n, c) => n + c.bytes, 0),
    };
  }

  /** Bỏ nội dung theo map (không gỡ group khỏi scene — group sống cùng lớp 3D). */
  destroy() {
    for (const view of this.cache.values()) this.release(view);
    this.cache.clear();
    this.active.clear();
  }

  /** Gỡ hẳn khỏi scene khi bộ hiển thị đóng. */
  dispose() {
    this.destroy();
    this.scene.remove(this.group);
  }
}
