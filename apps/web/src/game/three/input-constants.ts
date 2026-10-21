/**
 * Bán kính bắt chọn quy đổi từ px màn hình của bản 2D sang đơn vị thế giới
 * (chia cho 68 ≈ px trên 1 đơn vị), làm tròn lên cho dễ nhấn trên cảm ứng.
 *
 * Bản 2D dùng bán kính lọc theo trục: loot 24/25px, node 22px, quái 32px,
 * NPC 35px, portal 45px.
 */
export const PICK_RADIUS = {
  /** Bản 2D lọc loot bằng |dx| < 24 và |dy − 5| < 25 → bán kính hiệu dụng 25px. */
  loot: 0.37,
  node: 0.33,
  monster: 0.48,
  npc: 0.52,
  portal: 0.67,
};
/** Chu kỳ gửi lệnh di chuyển bằng bàn phím (ms) — khớp bản 2D. */
export const MOVE_INTERVAL = 140;
/** Độ dài bước chuẩn hóa (đơn vị thế giới) — khớp bản 2D. */
export const MOVE_STEP = 2;
