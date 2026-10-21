/**
 * Hệ tọa độ dùng chung cho bộ hiển thị 3D.
 *
 * - Trục X của three = trục x thế giới, trục Z = trục y thế giới, trục Y = cao.
 *   Nhờ vậy hướng "phải màn hình" của camera nhìn từ +Z về −Z là (+x, −y) thế giới,
 *   đúng bằng phép chiếu iso 2D: `worldToScreen({x,y}) = ((x−y)·48, (x+y)·24)`.
 * - `PX_PER_UNIT` là số px màn hình của bản 2D tương đương 1 đơn vị thế giới:
 *   dùng 64px làm đơn vị quy đổi thống nhất cho mọi kích thước px của bản 2D
 *   sang đơn vị thế giới.
 *
 * Module này KHÔNG import three để test đơn vị chạy được trong Node.
 */
export const PX_PER_UNIT = 64;
/** Điểm thế giới → điểm 3D (mặt đất y = 0). */
export function worldTo3D(
  x: number,
  y: number,
  height = 0,
): { x: number; y: number; z: number } {
  return { x, y: height, z: y };
}
/** px của bản 2D → đơn vị thế giới 3D. */
export function pxToUnits(px: number): number {
  return px / PX_PER_UNIT;
}
/**
 * Công thức neo chân cho billboard có origin `(0.5, feetY/frameHeight)`.
 *
 * Origin của Phaser tính từ TRÊN khung xuống: `originY = feetY/frameHeight`
 * (0.9609 cho khung 256 với feetY 246) là vị trí của "đường chân" trong ảnh.
 * Trong 3D, plane cao H có tâm ở local y = 0; điểm ảnh có pixel `y_p` (đo từ
 * trên) nằm ở local `H/2 − (y_p/frameHeight)·H`.
 *
 * Muốn đường chân (y_p = feetY) nằm đúng trên mặt đất (world y = 0) thì tâm
 * plane phải ở `c = H·(originY − 0.5)`.
 *
 * Kiểm chứng: originY = 246/256 → c = 0.4609·H; đỉnh plane ở 0.9609·H (đúng
 * bằng tỉ lệ khung), đáy ở −0.0391·H, và đường chân nằm đúng y = 0.
 */
export function spriteAnchorHeight(
  displayHeight: number,
  originY: number,
): number {
  return displayHeight * (originY - 0.5);
}
