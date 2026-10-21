/**
 * Chu kỳ ngày–đêm của `worldClock` (tick, 20Hz). Một vòng = 24000 tick = 20 phút.
 * Chỉ là lớp hiển thị: không đọc/ghi simulation.
 */
export const DAY_TICKS = 24000;
/** Phần ngày trong [0,1): 0 = bình minh, 0.25 = giữa trưa, 0.5 = hoàng hôn. */
export function dayPhaseFromClock(timeTicks: number): number {
  return (((timeTicks % DAY_TICKS) + DAY_TICKS) % DAY_TICKS) / DAY_TICKS;
}
/** Độ tối ban đêm 0–1 (giữ nguyên công thức cũ của EnvironmentRenderer). */
export function nightFactorFromClock(timeTicks: number): number {
  return Math.max(0, -Math.sin(dayPhaseFromClock(timeTicks) * Math.PI * 2));
}
/**
 * Tông hoàng hôn/bình minh 0–1: lấy độ lớn đạo hàm của `nightFactor` theo pha
 * ngày, tức |cos(2π·day)|. Bằng 0 ở giữa trưa (0.25) và giữa đêm (0.75), đạt 1
 * đúng hai chuyển giao ngày↔đêm (0 và 0.5), biến thiên mượt trong cả vòng.
 */
export function duskFactorFromClock(timeTicks: number): number {
  return Math.abs(Math.cos(dayPhaseFromClock(timeTicks) * Math.PI * 2));
}
