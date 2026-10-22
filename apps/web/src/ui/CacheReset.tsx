import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { APP_BUILD_LABEL } from "../app/version";
import {
  clearAppCache,
  reloadBypassingCache,
  type ClearCacheResult,
} from "../app/pwa-cache";

/**
 * Nút xóa bộ nhớ đệm PWA trong panel Thiết lập.
 *
 * Điện thoại hay giữ bản game cũ trong nhiều giờ vì service worker phục vụ từ
 * cache. Nút này hủy service worker, xóa Cache Storage rồi tải lại bằng URL có
 * `?_cb=<mốc thời gian>` để chắc chắn lấy mã mới. Bản lưu nhân vật (IndexedDB)
 * và tuỳ chọn (localStorage) không bị đụng tới.
 */
export function CacheReset() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const message = (result: ClearCacheResult) =>
    result.failures > 0
      ? `Đã xóa ${result.cachesDeleted} bộ nhớ đệm, ${result.failures} bước lỗi (xem console). Đang tải lại…`
      : `Đã xóa ${result.cachesDeleted} bộ nhớ đệm và ${result.workersRemoved} service worker. Đang tải lại…`;

  const clear = async () => {
    if (busy) return;
    const confirmed = window.confirm(
      "Xóa bộ nhớ đệm của game và tải lại?\nBản lưu nhân vật không bị xóa.",
    );
    if (!confirmed) {
      console.info(
        "[cache-reset] người chơi huỷ (hoặc trình duyệt chặn hộp thoại)",
      );
      return;
    }
    // (a) Khóa nút và báo đang xử lý ngay khi bắt đầu.
    setBusy(true);
    setStatus("Đang xóa bộ nhớ đệm…");
    try {
      // (b) + (c) hủy service worker, xóa cache; lỗi từng bước đã được log
      // bên trong và không chặn bước (d).
      const result = await clearAppCache();
      setStatus(message(result));
    } catch (error) {
      // Phòng trường hợp hàm ném ra ngoài dự kiến: vẫn phải tải lại.
      console.error("[cache-reset] lỗi không mong đợi", error);
      setStatus("Không xóa được bộ nhớ đệm. Vẫn tải lại để lấy bản mới…");
    }
    // (d) Tải lại bỏ qua cache; để một nhịp ngắn cho trạng thái kịp hiện.
    window.setTimeout(() => reloadBypassingCache(), 250);
  };

  return (
    <>
      <h3 className="section-heading">Bộ nhớ đệm &amp; cập nhật</h3>
      <p className="hint">
        Điện thoại có thể giữ bản game cũ trong vài giờ. Xóa bộ nhớ đệm để tải
        mã mới ngay; bản lưu nhân vật nằm trong IndexedDB nên không bị ảnh
        hưởng.
      </p>
      <div className="save-actions">
        <button
          className="outline-button"
          onClick={() => void clear()}
          disabled={busy}
        >
          <RefreshCw size={15} />{" "}
          {busy ? "Đang xóa bộ nhớ đệm…" : "Xóa bộ nhớ đệm & tải lại"}
        </button>
      </div>
      {status ? (
        <p className="hint" role="status" aria-live="polite">
          {status}
        </p>
      ) : null}
      {/* Cùng chuỗi với lobby: một nguồn duy nhất ở app/version.ts. */}
      <p className="hint game-build-label">{APP_BUILD_LABEL}</p>
    </>
  );
}
