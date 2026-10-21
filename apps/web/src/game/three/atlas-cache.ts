import * as THREE from "three";
import { SPRITE_FACINGS, SPRITE_STATE_NAMES } from "../animations/sprite-frames";

/**
 * Atlas trong bộ nhớ cho một bộ sprite (nhân vật theo (phái, giới) hoặc quái).
 *
 * Bộ gồm 3 cột (down/right/up) × 13 hàng (theo thứ tự `SPRITE_STATE_NAMES`),
 * mỗi ô 256×256 → canvas 768×3328. Atlas được dựng từ 39 file PNG riêng.
 */
export const ATLAS_COLUMNS = SPRITE_FACINGS.length;
export const ATLAS_ROWS = SPRITE_STATE_NAMES.length;
export const ATLAS_CELL = 256;

export interface AtlasEntry {
  texture: THREE.CanvasTexture;
  /** Vị trí ô theo (cột, hàng). */
  cell: { column: number; row: number };
}

export class AtlasCache {
  private atlases = new Map<string, AtlasEntry>();
  private loading = new Set<string>();
  /** Đánh dấu đã hủy để callback nạp không tạo texture sau khi đóng bộ hiển thị. */
  private disposed = false;
  /**
   * Số thế hệ nạp: mỗi lần `reset()` tăng lên. Callback nạp chỉ tạo texture nếu
   * thế hệ của nó vẫn là hiện tại — nếu không, atlas đó đã bị bỏ giữa chừng và
   * texture tạo ra sẽ rò (không ai dispose).
   */
  private generation = 0;

  /** Bắt đầu nạp atlas nếu chưa có; trả về atlas nếu sẵn sàng. */
  load(
    owner: string,
    files: { facing: string; state: string; url: string }[],
  ): AtlasEntry | null {
    if (this.disposed) return null;
    const cached = this.atlases.get(owner);
    if (cached) return cached;
    if (this.loading.has(owner)) return null;
    this.loading.add(owner);
    const generation = this.generation;
    const canvas = document.createElement("canvas");
    canvas.width = ATLAS_COLUMNS * ATLAS_CELL;
    canvas.height = ATLAS_ROWS * ATLAS_CELL;
    const g = canvas.getContext("2d")!;
    let pending = files.length;
    const done = () => {
      pending--;
      if (pending > 0) return;
      this.loading.delete(owner);
      // Đã hủy hoặc thế hệ đã cũ → atlas bị bỏ giữa chừng, không tạo texture.
      if (this.disposed || generation !== this.generation) return;
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
      this.atlases.set(owner, { texture, cell: { column: 0, row: 0 } });
    };
    for (const file of files) {
      const column = SPRITE_FACINGS.indexOf(file.facing as never);
      const row = SPRITE_STATE_NAMES.indexOf(file.state as never);
      if (column < 0 || row < 0) {
        done();
        continue;
      }
      const image = new Image();
      image.onload = () => {
        g.drawImage(image, column * ATLAS_CELL, row * ATLAS_CELL);
        done();
      };
      image.onerror = () => done();
      image.src = file.url;
    }
    return null;
  }

  get(owner: string) {
    return this.atlases.get(owner) ?? null;
  }

  /** Thả atlas của các owner không còn trên bản đồ (bám theo map như bản 2D). */
  retain(owners: Set<string>) {
    for (const [owner, entry] of this.atlases)
      if (!owners.has(owner)) {
        entry.texture.dispose();
        this.atlases.delete(owner);
      }
  }

  /** Thả toàn bộ atlas nhưng vẫn cho phép nạp lại (đổi map). */
  reset() {
    this.generation++;
    for (const entry of this.atlases.values()) entry.texture.dispose();
    this.atlases.clear();
    this.loading.clear();
  }

  /** Đóng hẳn: callback nạp dở không được tạo texture (tránh rò GPU). */
  dispose() {
    this.disposed = true;
    this.reset();
  }
}
