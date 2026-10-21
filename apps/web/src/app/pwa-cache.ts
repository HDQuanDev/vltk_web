/**
 * Xóa bộ nhớ đệm của game (CacheStorage + service worker) để lần tải kế tiếp
 * lấy mã mới từ mạng.
 *
 * Dùng khi điện thoại vẫn chạy bản cũ sau khi deploy. CHỈ đụng tới cache của
 * PWA: bản lưu nhân vật nằm ở IndexedDB và tuỳ chọn ở localStorage nên được giữ
 * nguyên. Mọi lỗi đều được đếm thay vì ném ra, để nút bấm vẫn tải lại được.
 */

export type CacheEnv = {
  caches?: {
    keys: () => Promise<string[]>;
    delete: (key: string) => Promise<boolean>;
  };
  serviceWorker?: {
    getRegistrations?: () => Promise<{ unregister: () => Promise<boolean> }[]>;
  };
};

export type ClearCacheResult = {
  /** Số cache đã xóa thành công. */
  cachesDeleted: number;
  /** Số service worker đã hủy đăng ký. */
  workersRemoved: number;
  /** Số thao tác lỗi (không chặn việc tải lại). */
  failures: number;
};

/** Môi trường mặc định: trình duyệt đang chạy app. */
const browserEnv = () => globalThis as unknown as CacheEnv;

export async function clearAppCache(
  env: CacheEnv = browserEnv(),
): Promise<ClearCacheResult> {
  const result: ClearCacheResult = {
    cachesDeleted: 0,
    workersRemoved: 0,
    failures: 0,
  };

  const storage = env.caches;
  if (storage) {
    try {
      const keys = await storage.keys();
      const outcomes = await Promise.allSettled(
        keys.map((key) => storage.delete(key)),
      );
      for (const outcome of outcomes) {
        if (outcome.status === "rejected") result.failures += 1;
        else if (outcome.value) result.cachesDeleted += 1;
      }
    } catch {
      result.failures += 1;
    }
  }

  const getRegistrations = env.serviceWorker?.getRegistrations;
  if (getRegistrations) {
    try {
      const registrations = await getRegistrations.call(env.serviceWorker);
      const outcomes = await Promise.allSettled(
        registrations.map((registration) => registration.unregister()),
      );
      for (const outcome of outcomes) {
        if (outcome.status === "rejected") result.failures += 1;
        else if (outcome.value) result.workersRemoved += 1;
      }
    } catch {
      result.failures += 1;
    }
  }

  return result;
}
