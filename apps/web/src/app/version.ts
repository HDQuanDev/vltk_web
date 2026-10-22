/**
 * NGUỒN DUY NHẤT của chuỗi phiên bản hiển thị cho người chơi.
 *
 * Nhắc việc: khi bàn giao bản sửa chữa/tính năng mới, chỉ cần đổi `version`
 * trong `package.json` ở thư mục gốc repo — KHÔNG sửa chuỗi phiên bản ở bất kỳ
 * file nào khác. Giá trị dưới đây và ngày build được chèn tự động lúc build
 * (`apps/web/vite.config.ts` → `define`); hai hằng số fallback chỉ dùng khi
 * chạy ngoài Vite (vitest) hoặc khi build thiếu define.
 */
declare const __APP_VERSION__: string | undefined;
declare const __APP_BUILD_DATE__: string | undefined;

export const APP_VERSION: string =
  typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0.6.0";

/** Ngày build dạng dd/mm/yyyy. */
export const APP_BUILD_DATE: string =
  typeof __APP_BUILD_DATE__ === "string" ? __APP_BUILD_DATE__ : "21/10/2026";

/** "v0.6.0 · 21/10/2026" */
export const APP_VERSION_LABEL = `v${APP_VERSION} · ${APP_BUILD_DATE}`;

/** "BẢN OFFLINE · v0.6.0 · 21/10/2026" — dùng y hệt ở lobby và Thiết lập. */
export const APP_BUILD_LABEL = `BẢN OFFLINE · ${APP_VERSION_LABEL}`;
