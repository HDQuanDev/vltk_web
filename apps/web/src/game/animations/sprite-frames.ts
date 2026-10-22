import { TICK_RATE } from "@kiem-hiep/game-core";
import type { AnimationState, Direction8 } from "@kiem-hiep/game-protocol";
/**
 * Phần ánh xạ dùng chung cho mọi bộ ảnh actor (quái và nhân vật): chỉ 3 hướng vẽ
 * sẵn, 13 tên file trạng thái, nhịp walk/run tính theo tick 20Hz. Các manifest
 * (`monsterSpriteManifest`, `actorSpriteManifest`) chỉ cung cấp đường dẫn và
 * thông số riêng, không lặp lại logic ở đây.
 */
export const SPRITE_FACINGS = ["down", "right", "up"] as const;
export type SpriteFacing = (typeof SPRITE_FACINGS)[number];
export const SPRITE_STATE_NAMES = [
  "stand",
  "walk-1",
  "walk-2",
  "run-1",
  "run-2",
  "cast",
  "attack",
  "hit",
  "hurt",
  "die",
  "use",
  "loot",
  "sit",
] as const;
export type SpriteStateName = (typeof SPRITE_STATE_NAMES)[number];
/** Trạng thái runtime có dùng; `loot`/`sit` chưa có state tương ứng trong core. */
export const SPRITE_RUNTIME_STATES = [
  "stand",
  "walk-1",
  "walk-2",
  "run-1",
  "run-2",
  "cast",
  "attack",
  "hit",
  "hurt",
  "die",
  "use",
] as const satisfies readonly SpriteStateName[];
/** Neo chân trong khung (ví dụ `246 / 256`) → tỉ lệ origin Y cho Phaser. */
export function spriteOriginRatio(feetY: number, frameHeight: number): number {
  return feetY / frameHeight;
}
/**
 * `Direction8` là góc màn hình 45°: 0 đông/phải, 2 nam/xuống, 4 tây/trái,
 * 6 bắc/lên. Bộ ảnh chỉ có 3 hướng nên chéo gộp theo trục dọc
 * (1,3 → `down`; 5,7 → `up`), còn tây dùng `right` lật ngang.
 */
export function spriteFacing(direction: Direction8): {
  facing: SpriteFacing;
  flipX: boolean;
} {
  if (direction === 0) return { facing: "right", flipX: false };
  if (direction === 4) return { facing: "right", flipX: true };
  if (direction === 1 || direction === 2 || direction === 3)
    return { facing: "down", flipX: false };
  return { facing: "up", flipX: false };
}
/**
 * Quãng đường (px màn hình) cho đúng 1 chu kỳ 2 khung đi bộ. Nhịp chân theo
 * quãng đường nên chân không trượt ở bất kỳ tốc độ nào (walk hay run).
 */
export const STEP_CYCLE_PX = 28;
/**
 * Ánh xạ trạng thái simulation sang tên file sprite. Trạng thái một khung
 * (cast/attack/hit/hurt/die/use) giữ nguyên ảnh nên `die` tự dừng ở khung cuối.
 *
 * `options.distancePx` (nếu có) chọn khung walk/run theo QUÃNG ĐƯỜNG đã đi:
 * mỗi STEP_CYCLE_PX px là một chu kỳ, nửa chu kỳ đổi khung. Không truyền thì
 * giữ cách chọn theo thời gian như cũ.
 */
export function spriteStateName(
  state: AnimationState,
  elapsedTicks: number,
  options: {
    lowHp?: boolean;
    fast?: boolean;
    walkFps: number;
    runFps: number;
    distancePx?: number;
  },
): SpriteStateName {
  switch (state) {
    case "idle":
      return "stand";
    case "walk": {
      const frames = options.fast
        ? (["run-1", "run-2"] as const)
        : (["walk-1", "walk-2"] as const);
      const fps = options.fast ? options.runFps : options.walkFps;
      const frame =
        options.distancePx !== undefined
          ? Math.floor(Math.max(0, options.distancePx) / (STEP_CYCLE_PX / 2)) %
            2
          : Math.floor((Math.max(0, elapsedTicks) * fps) / TICK_RATE) % 2;
      return frames[frame];
    }
    case "attack":
      return "attack";
    case "cast":
      return "cast";
    case "hit":
      return options.lowHp ? "hurt" : "hit";
    case "dead":
      return "die";
    case "revive":
      // Không có bộ ảnh hồi sinh riêng: dùng lại tư thế gục.
      return "die";
    case "interact":
      return "use";
  }
}
/** URL ảnh: `<baseUrl>/<ownerPath>/sprites/<hướng>/<state>.png`. */
export function spriteImageUrl(
  baseUrl: string,
  ownerPath: string,
  facing: SpriteFacing,
  state: string,
): string {
  return `${baseUrl}/${ownerPath}/sprites/${facing}/${state}.png`;
}
