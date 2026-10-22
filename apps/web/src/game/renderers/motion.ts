/**
 * Hằng số + hàm thuần cho "cảm giác chuyển động" ở tầng vẽ (Phần B).
 *
 * Toàn bộ độ lệch ở đây chỉ là HIỂN THỊ: không ghi ngược vào logic, không đổi
 * va chạm/tầm đánh/tốc độ. Tắt khẩn cấp: đặt ENABLE_MOTION_SMOOTHING = false để
 * quay lại đúng hành vi trước đợt này (hằng số cấp code, không phải cài đặt).
 */

import { STEP_CYCLE_PX } from "../animations/sprite-frames";

export { STEP_CYCLE_PX };

/** Công tắc tắt khẩn cấp cho toàn bộ Phần B. */
export const ENABLE_MOTION_SMOOTHING = true;

/** Hằng số giảm chấn camera (1/giây) — camera tiến 1 − e^(−8·dt). */
export const CAMERA_SMOOTHING = 8;

/** Biên độ nhún thân khi đi (px). */
export const BOB_AMPLITUDE_PX = 1.5;

/** Thời gian trả nhún về 0 khi dừng (ms). */
export const BOB_SETTLE_MS = 100;

/** Bóng dưới chân co giãn ±8% ngược pha với nhún. */
export const SHADOW_PULSE = 0.08;

/** Giữ hướng hiển thị trước khi đổi (ms); đổi > 90° thì đổi ngay. */
export const DIRECTION_HOLD_MS = 100;

/** Coi như đã tới đích trong bán kính này (px màn hình) để không giật lùi. */
export const ARRIVE_RADIUS_PX = 6;

/** Đứng yên đủ lâu mới chuyển walk → stand (ms). */
export const WALK_STOP_MS = 120;

/** Mốc chạm đòn trong chu kỳ đòn (0..1). */
export const HIT_AT_CYCLE = 0.35;

/** Độ lao tới tối đa của đánh thường (px). */
export const LUNGE_PX = 8;

/** Độ trượt lùi hiển thị khi trúng đòn (px) — tinh anh/boss nhỏ hơn. */
export const KNOCKBACK_PX = 10;
export const KNOCKBACK_ELITE_PX = 4;

/** Các mốc thời gian của cú trượt lùi (ms). */
export const KNOCKBACK_OUT_MS = 60;
export const KNOCKBACK_HOLD_MS = 40;
export const KNOCKBACK_BACK_MS = 140;

/** Dừng hình cực ngắn tại khoảnh khắc chạm đòn (ms). */
export const HITSTOP_MS = 35;

/** Từ ngần này thực thể đang giao chiến trở lên thì bỏ dừng hình. */
export const HITSTOP_MAX_FIGHTERS = 5;

export const lerp = (from: number, to: number, t: number) =>
  from + (to - from) * t;

/** Hệ số giảm chấn hàm mũ theo thời gian thực: 1 − e^(−smoothing·dt). */
export function dampingFactor(deltaMs: number, smoothing = CAMERA_SMOOTHING) {
  if (!ENABLE_MOTION_SMOOTHING) return 1;
  const dt = Math.max(0, deltaMs) / 1000;
  return 1 - Math.exp(-smoothing * dt);
}

/** Độ lệch dọc của nhún thân theo quãng đường đã đi (px, âm = nhô lên). */
export function bobOffset(distancePx: number, progress = 1) {
  if (!ENABLE_MOTION_SMOOTHING) return 0;
  const half = STEP_CYCLE_PX / 2;
  const phase = ((distancePx % STEP_CYCLE_PX) + STEP_CYCLE_PX) % STEP_CYCLE_PX;
  // Cao nhất ở giữa mỗi nửa chu kỳ: |sin| đạt 1 tại 1/4 và 3/4 chu kỳ.
  const wave = Math.abs(Math.sin((phase / half) * Math.PI));
  return -BOB_AMPLITUDE_PX * wave * Math.max(0, Math.min(1, progress));
}

/** Bóng co giãn ngược pha với nhún (1 ± 8%). */
export function shadowScale(bob: number) {
  if (!ENABLE_MOTION_SMOOTHING) return 1;
  const ratio = bob / -BOB_AMPLITUDE_PX;
  return 1 - SHADOW_PULSE * (2 * ratio - 1);
}

/** Trả độ lệch nhún về 0 trong BOB_SETTLE_MS khi vừa dừng đi. */
export function settleBob(
  current: number,
  deltaMs: number,
  settleMs = BOB_SETTLE_MS,
) {
  if (!ENABLE_MOTION_SMOOTHING) return 0;
  const step = (BOB_AMPLITUDE_PX / Math.max(1, settleMs)) * deltaMs;
  if (Math.abs(current) <= step) return 0;
  return current > 0 ? current - step : current + step;
}

/** Có nên đổi hướng hiển thị chưa, theo quy tắc giữ hướng 100ms. */
export function shouldAdoptDirection(
  previous: number,
  next: number,
  heldMs: number,
  holdMs = DIRECTION_HOLD_MS,
) {
  if (!ENABLE_MOTION_SMOOTHING) return true;
  if (previous === next) return false;
  // Đổi hơn 90° (2 bước 45°) thì đổi ngay để không cảm giác đi lùi.
  const diff = Math.abs(((next - previous + 8) % 8) - 0);
  const turn = Math.min(diff, 8 - diff);
  if (turn > 2) return true;
  return heldMs >= holdMs;
}

/** Độ lệch lao tới của đòn đánh theo tiến độ chu kỳ 0..1. */
export function lungeOffset(progress: number) {
  if (!ENABLE_MOTION_SMOOTHING) return 0;
  if (progress < 0) return 0;
  if (progress <= HIT_AT_CYCLE) {
    // 0 → 35%: ease-out tới tối đa.
    const t = progress / HIT_AT_CYCLE;
    return LUNGE_PX * (1 - (1 - t) * (1 - t));
  }
  // 35% → 100%: trả về 0, ease-in-out.
  const t = Math.min(1, (progress - HIT_AT_CYCLE) / (1 - HIT_AT_CYCLE));
  return LUNGE_PX * (1 - t * t * (3 - 2 * t));
}

/** Độ lệch trượt lùi hiển thị theo thời gian kể từ lúc trúng đòn (ms). */
export function knockbackOffset(elapsedMs: number, maxPx = KNOCKBACK_PX) {
  if (!ENABLE_MOTION_SMOOTHING) return 0;
  const out = KNOCKBACK_OUT_MS,
    hold = KNOCKBACK_HOLD_MS,
    back = KNOCKBACK_BACK_MS;
  if (elapsedMs <= 0) return 0;
  if (elapsedMs < out) {
    const t = elapsedMs / out;
    return maxPx * (1 - (1 - t) * (1 - t)); // ease-out
  }
  if (elapsedMs < out + hold) return maxPx;
  if (elapsedMs < out + hold + back) {
    const t = (elapsedMs - out - hold) / back;
    return maxPx * (1 - t * t); // ease-in về 0
  }
  return 0;
}
