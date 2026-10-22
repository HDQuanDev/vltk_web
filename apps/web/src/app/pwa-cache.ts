/**
 * Xóa bộ nhớ đệm của game (Service Worker + Cache Storage) rồi tải lại trang
 * bằng URL có tham số chống cache.
 *
 * Dùng khi điện thoại vẫn chạy bản cũ sau khi deploy. CHỈ đụng tới cache của
 * PWA: bản lưu nhân vật nằm ở IndexedDB và tuỳ chọn ở localStorage nên được giữ
 * nguyên. Mỗi bước lỗi được ghi log riêng và KHÔNG chặn bước tải lại.
 */

/** Tiền tố log để lọc nhanh khi debug trên máy người chơi. */
const LOG = "[cache-reset]";

/** Tham số chống cache gắn vào URL khi tải lại. */
export const CACHE_BUST_PARAM = "_cb";

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
  /** Số bước lỗi (không chặn việc tải lại). */
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

  // (b) Hủy đăng ký mọi Service Worker — lỗi không chặn bước sau.
  const getRegistrations = env.serviceWorker?.getRegistrations;
  if (getRegistrations) {
    try {
      const registrations = await getRegistrations.call(env.serviceWorker);
      const outcomes = await Promise.allSettled(
        registrations.map((registration) => registration.unregister()),
      );
      for (const outcome of outcomes) {
        if (outcome.status === "rejected") {
          result.failures += 1;
          console.error(`${LOG} không hủy được service worker`, outcome.reason);
        } else if (outcome.value) result.workersRemoved += 1;
      }
    } catch (error) {
      result.failures += 1;
      console.error(`${LOG} không đọc được danh sách service worker`, error);
    }
  } else {
    console.info(`${LOG} trình duyệt không hỗ trợ service worker`);
  }

  // (c) Xóa toàn bộ Cache Storage của origin này.
  const storage = env.caches;
  if (storage) {
    try {
      const keys = await storage.keys();
      const outcomes = await Promise.allSettled(
        keys.map((key) => storage.delete(key)),
      );
      for (const outcome of outcomes) {
        if (outcome.status === "rejected") {
          result.failures += 1;
          console.error(`${LOG} không xóa được cache`, outcome.reason);
        } else if (outcome.value) result.cachesDeleted += 1;
      }
    } catch (error) {
      result.failures += 1;
      console.error(`${LOG} không đọc được danh sách cache`, error);
    }
  } else {
    console.info(`${LOG} trình duyệt không hỗ trợ Cache Storage`);
  }

  return result;
}

/**
 * (d) Tải lại trang bằng địa chỉ hiện tại + `?_cb=<mốc thời gian>` để trình
 * duyệt bỏ qua bộ nhớ đệm HTTP. Tham số này được gỡ ở lần tải kế tiếp bằng
 * `stripCacheBustParam()`.
 */
export function reloadBypassingCache(
  target: Pick<Location, "href" | "replace"> = window.location,
  now: number = Date.now(),
): string {
  const url = new URL(target.href);
  url.searchParams.set(CACHE_BUST_PARAM, String(now));
  target.replace(url.toString());
  return url.toString();
}

/** Gỡ tham số chống cache khỏi thanh địa chỉ sau khi trang đã tải xong. */
export function stripCacheBustParam(
  target: Pick<Location, "href"> = window.location,
  history: Pick<History, "state" | "replaceState"> = window.history,
): boolean {
  const url = new URL(target.href);
  if (!url.searchParams.has(CACHE_BUST_PARAM)) return false;
  url.searchParams.delete(CACHE_BUST_PARAM);
  history.replaceState(history.state, "", url.toString());
  return true;
}
