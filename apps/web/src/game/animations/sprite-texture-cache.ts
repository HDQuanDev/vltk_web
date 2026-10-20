import type Phaser from "phaser";
const PREFIX = "sprite:";
type LoadState = "loading" | "ready" | "missing";
/**
 * Tải lazy ảnh sprite actor (quái và nhân vật) bằng `Image` rồi đăng ký texture
 * Phaser.
 *
 * Mỗi khung là một file PNG riêng nên chỉ tải đúng khung đang hiển thị (3 hướng ×
 * các state đã dùng). Thiếu file → trả `null` để caller giữ bản vẽ thủ tục: không
 * lỗi, không để ô trống. Texture của actor không còn trên bản đồ hiện tại bị dọn
 * trong `retain` (giống cách WorldScene dọn atlas `actor:`), nên bộ nhớ texture
 * bám theo bản đồ đang chơi.
 */
export class SpriteTextureCache {
  private status = new Map<string, LoadState>();
  private keysByOwner = new Map<string, Set<string>>();
  private destroyed = false;
  constructor(private scene: Phaser.Scene) {}
  /** Texture key nếu ảnh đã sẵn sàng; lần gọi đầu tiên bắt đầu tải. */
  key(owner: string, url: string): string | null {
    const key = PREFIX + url;
    const state = this.status.get(key);
    if (state === "ready") return this.scene.textures.exists(key) ? key : null;
    if (state || this.destroyed) return null;
    this.status.set(key, "loading");
    const keys = this.keysByOwner.get(owner) ?? new Set<string>();
    keys.add(key);
    this.keysByOwner.set(owner, keys);
    const image = new Image();
    image.onload = () => {
      if (this.destroyed) {
        this.status.delete(key);
        return;
      }
      if (!this.scene.textures.exists(key))
        this.scene.textures.addImage(key, image);
      this.status.set(
        key,
        this.scene.textures.exists(key) ? "ready" : "missing",
      );
    };
    image.onerror = () => this.status.set(key, "missing");
    image.src = url;
    return null;
  }
  /** Nạp trước vài khung (stand/walk) để không nháy hình thủ tục lúc vào bản đồ. */
  warm(owner: string, urls: readonly string[]) {
    for (const url of urls) this.key(owner, url);
  }
  /** Bỏ texture của actor (quái/bộ nhân vật) không còn trên bản đồ hiện tại. */
  retain(owners: Set<string>) {
    for (const [owner, keys] of this.keysByOwner)
      if (!owners.has(owner)) {
        for (const key of keys) {
          this.status.delete(key);
          if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
        }
        this.keysByOwner.delete(owner);
      }
  }
  get stats() {
    let ready = 0,
      pending = 0,
      missing = 0;
    for (const state of this.status.values()) {
      if (state === "ready") ready++;
      else if (state === "loading") pending++;
      else missing++;
    }
    return { ready, pending, missing };
  }
  dispose() {
    this.destroyed = true;
    this.status.clear();
    this.keysByOwner.clear();
  }
}
