import {
  monsterSpriteManifest,
  monsters,
  type MonsterDefinition,
} from "@kiem-hiep/game-content";
import type { AnimationState, Direction8 } from "@kiem-hiep/game-protocol";
import {
  spriteFacing,
  spriteImageUrl,
  spriteOriginRatio,
  spriteStateName,
  type SpriteFacing,
  type SpriteStateName,
} from "./sprite-frames";
export type MonsterFacing = SpriteFacing;
export interface MonsterSpriteFrame {
  /** URL ảnh trong `apps/web/public`. */
  url: string;
  /** Tên file trạng thái đã chọn (`stand`, `walk-1`, `run-2`, ...). */
  state: SpriteStateName;
  facing: MonsterFacing;
  /** Hướng trái dùng ảnh `right` lật ngang. */
  flipX: boolean;
}
/** Tỉ lệ neo chân trong khung 256px (0.5, feetY/frameHeight). */
export const monsterSpriteOriginY = spriteOriginRatio(
  monsterSpriteManifest.feetY,
  monsterSpriteManifest.frameHeight,
);
export function monsterDefinition(
  definitionId: string,
): MonsterDefinition | undefined {
  return monsters.find((m) => m.id === definitionId);
}
/** Có bộ ảnh đăng ký trong `monsterSpriteManifest` hay không. */
export function hasMonsterSprites(definitionId: string): boolean {
  return (monsterSpriteManifest.monsters as readonly string[]).includes(
    definitionId,
  );
}
/** Boss hiển thị cỡ lớn hơn và bóng đổ rộng hơn (chỉ hiển thị). */
export function isBossMonster(definitionId: string): boolean {
  return monsterDefinition(definitionId)?.brain === "boss";
}
/**
 * Cơ chế đặc biệt của boss (`quake`/`storm`) — dùng cho hiệu ứng hiển thị
 * (rung camera, vòng đất lan). `null` với quái thường hoặc cơ chế khác.
 */
export function monsterBossMechanic(
  definitionId: string,
): "quake" | "storm" | null {
  const mechanic = monsterDefinition(definitionId)?.bossMechanic;
  return mechanic === "quake" || mechanic === "storm" ? mechanic : null;
}
/**
 * Quái đủ nhanh để dùng nhịp `run-*`: lấy từ `speed` của monster def nên chỉ là
 * ánh xạ hiển thị, không thêm trạng thái chạy vào simulation.
 */
export function isFastMonster(definitionId: string): boolean {
  const def = monsterDefinition(definitionId);
  return !!def && def.speed >= monsterSpriteManifest.runSpeedThreshold;
}
/** Chiều cao khung hiển thị (px màn hình): quái thường 112, boss ×1.5. */
export function monsterSpriteHeight(definitionId: string): number {
  return (
    monsterSpriteManifest.displayHeight *
    (isBossMonster(definitionId) ? monsterSpriteManifest.bossScale : 1)
  );
}
export const monsterFacing = spriteFacing;
/** Ánh xạ trạng thái simulation sang tên file sprite của quái. */
export function monsterSpriteState(
  state: AnimationState,
  elapsedTicks: number,
  options: { lowHp?: boolean; fast?: boolean } = {},
): SpriteStateName {
  return spriteStateName(state, elapsedTicks, {
    lowHp: options.lowHp,
    fast: options.fast,
    walkFps: monsterSpriteManifest.walkFps,
    runFps: monsterSpriteManifest.runFps,
  });
}
export function monsterSpriteUrl(
  definitionId: string,
  facing: MonsterFacing,
  state: string,
): string {
  return spriteImageUrl(
    monsterSpriteManifest.baseUrl,
    definitionId,
    facing,
    state,
  );
}
/**
 * Khung hình cần vẽ cho một quái tại tick hiện tại, hoặc `null` khi quái không
 * có bộ ảnh (caller giữ bản vẽ thủ tục).
 */
export function monsterSpriteFrame(
  definitionId: string,
  state: AnimationState,
  direction: Direction8,
  elapsedTicks: number,
  options: { lowHp?: boolean } = {},
): MonsterSpriteFrame | null {
  if (!hasMonsterSprites(definitionId)) return null;
  const { facing, flipX } = spriteFacing(direction);
  const spriteState = monsterSpriteState(state, elapsedTicks, {
    lowHp: options.lowHp,
    fast: isFastMonster(definitionId),
  });
  return {
    url: monsterSpriteUrl(definitionId, facing, spriteState),
    state: spriteState,
    facing,
    flipX,
  };
}
/** Toàn bộ file của một bộ sprite (13 state × 3 hướng) cho công cụ kiểm tra. */
export function monsterSpriteFiles(definitionId: string) {
  return monsterSpriteManifest.directions.flatMap((facing) =>
    monsterSpriteManifest.states.map((state) => ({
      facing,
      state,
      url: monsterSpriteUrl(definitionId, facing, state),
    })),
  );
}
