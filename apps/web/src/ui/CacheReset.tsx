import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { clearAppCache } from "../app/pwa-cache";

/**
 * Nút xóa bộ nhớ đệm PWA trong panel Thiết lập.
 *
 * Điện thoại hay giữ bản game cũ trong nhiều giờ vì service worker phục vụ từ
 * cache. Nút này xóa CacheStorage + hủy đăng ký service worker rồi tải lại,
 * buộc lần tải kế tiếp lấy mã mới. Bản lưu nhân vật (IndexedDB) không bị đụng.
 */
export function CacheReset() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const clear = async () => {
    if (busy) return;
    const confirmed = window.confirm(
      "Xóa bộ nhớ đệm của game và tải lại?\nBản lưu nhân vật không bị xóa.",
    );
    if (!confirmed) return;
    setBusy(true);
    setStatus("Đang xóa bộ nhớ đệm…");
    const result = await clearAppCache();
    setStatus(
      result.failures > 0
        ? `Đã xóa ${result.cachesDeleted} bộ nhớ đệm, ${result.failures} mục không xóa được. Đang tải lại…`
        : `Đã xóa ${result.cachesDeleted} bộ nhớ đệm và ${result.workersRemoved} service worker. Đang tải lại…`,
    );
    window.setTimeout(() => window.location.reload(), 700);
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
          <RefreshCw size={15} /> Xóa bộ nhớ đệm &amp; tải lại
        </button>
      </div>
      {status ? (
        <p className="hint" role="status" aria-live="polite">
          {status}
        </p>
      ) : null}
    </>
  );
}
