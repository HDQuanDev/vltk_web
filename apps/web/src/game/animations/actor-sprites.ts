import { actorSpriteManifest } from "@kiem-hiep/game-content";
import type { AnimationState, Direction8 } from "@kiem-hiep/game-protocol";
import {
  SPRITE_FACINGS,
  spriteFacing,
  spriteImageUrl,
  spriteOriginRatio,
  spriteStateName,
  type SpriteFacing,
  type SpriteStateName,
} from "./sprite-frames";
export type ActorGender = "male" | "female";
export interface ActorSpriteFrame {
  /** URL ảnh trong `apps/web/public`. */
  url: string;
  /** Bộ đang dùng, dạng `<phái>/<giới>` — dùng làm khoá cache texture. */
  owner: string;
  state: SpriteStateName;
  facing: SpriteFacing;
  /** Hướng trái dùng ảnh `right` lật ngang. */
  flipX: boolean;
  /** `false` khi phải mượn bộ trung lập vì thiếu bộ của (phái, giới). */
  exact: boolean;
}
/** Tỉ lệ neo chân trong khung 256px (0.5, feetY/frameHeight). */
export const actorSpriteOriginY = spriteOriginRatio(
  actorSpriteManifest.feetY,
  actorSpriteManifest.frameHeight,
);
/** Chiều cao khung hiển thị (px màn hình). */
export const actorSpriteHeight = actorSpriteManifest.displayHeight;
export function actorGender(appearance: string): ActorGender {
  return appearance === "female" ? "female" : "male";
}
/**
 * Bộ sprite theo (phái, giới). Thiếu bộ của cặp đó → bộ trung lập (`exact: false`);
 * thiếu cả bộ trung lập → `null` để caller vẽ thủ tục.
 */
export function actorSpriteOwner(
  sectId: string,
  appearance: string,
): { owner: string; exact: boolean } | null {
  const owner = actorSpriteManifest.sets[sectId]?.[actorGender(appearance)];
  if (owner) return { owner, exact: true };
  return actorSpriteManifest.fallback
    ? { owner: actorSpriteManifest.fallback, exact: false }
    : null;
}
export function actorSpriteUrl(
  owner: string,
  facing: SpriteFacing,
  state: string,
): string {
  return spriteImageUrl(actorSpriteManifest.baseUrl, owner, facing, state);
}
/**
 * Khung hình cần vẽ cho một nhân vật tại tick hiện tại, hoặc `null` khi không có
 * bộ ảnh (caller giữ bản vẽ thủ tục theo phái/giới như cũ).
 */
export function actorSpriteFrame(
  sectId: string,
  appearance: string,
  state: AnimationState,
  direction: Direction8,
  elapsedTicks: number,
  options: { lowHp?: boolean } = {},
): ActorSpriteFrame | null {
  const set = actorSpriteOwner(sectId, appearance);
  if (!set) return null;
  const { facing, flipX } = spriteFacing(direction);
  const spriteState = spriteStateName(state, elapsedTicks, {
    lowHp: options.lowHp,
    // Nhân vật chưa có trạng thái chạy trong core: luôn dùng nhịp walk.
    fast: false,
    walkFps: actorSpriteManifest.walkFps,
    runFps: actorSpriteManifest.runFps,
  });
  return {
    url: actorSpriteUrl(set.owner, facing, spriteState),
    owner: set.owner,
    state: spriteState,
    facing,
    flipX,
    exact: set.exact,
  };
}
/** Toàn bộ file của một bộ (13 state × 3 hướng) cho công cụ kiểm tra. */
export function actorSpriteFiles(owner: string) {
  return SPRITE_FACINGS.flatMap((facing) =>
    actorSpriteManifest.states.map((state) => ({
      facing,
      state,
      url: actorSpriteUrl(owner, facing, state),
    })),
  );
}
/**
 * File cần nạp trước để nhân vật không nháy hình thủ tục lúc vào bản đồ:
 * 3 hướng × (stand + walk-1 + walk-2).
 */
export function actorSpriteWarmUrls(owner: string): string[] {
  return SPRITE_FACINGS.flatMap((facing) =>
    (["stand", "walk-1", "walk-2"] as const).map((state) =>
      actorSpriteUrl(owner, facing, state),
    ),
  );
}
