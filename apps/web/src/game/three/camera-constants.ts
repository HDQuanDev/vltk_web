/**
 * Tham số camera của bộ hiển thị 3D.
 *
 * Camera đặt tại (d, h, d) so với chân người chơi — tức nằm trên ĐƯỜNG PHÂN
 * GIÁC của mặt phẳng xz — và `h = d·√(2/3)`. Khi đó phép chiếu phối cảnh của
 * three khớp ĐÚNG phép chiếu iso 2D (`worldToScreen` 48:24):
 * worldX → (+0.7071, +0.3536), worldZ → (−0.7071, +0.3536).
 *
 * Nhờ vậy texture đất vẽ sẵn theo iso của bản 2D không bị méo khi đặt lên mặt
 * phẳng 3D, và hướng nhìn khớp: phải màn hình = thế giới (+x, −y).
 */
export const CAMERA_DIAGONAL = 12;
export const CAMERA_HEIGHT = CAMERA_DIAGONAL * Math.sqrt(2 / 3);
/** Góc nghiêng của camera so với mặt phẳng ngang (độ). */
export const CAMERA_TILT_DEGREES = 30;
