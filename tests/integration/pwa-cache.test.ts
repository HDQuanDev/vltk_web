import { describe, expect, it } from "vitest";
import { clearAppCache } from "../../apps/web/src/app/pwa-cache";

describe("clearAppCache", () => {
  it("xóa mọi cache và hủy đăng ký mọi service worker", async () => {
    const deleted: string[] = [];
    const unregistered: string[] = [];
    const result = await clearAppCache({
      caches: {
        keys: async () => ["workbox-precache-v2", "actor-sprites"],
        delete: async (key) => {
          deleted.push(key);
          return true;
        },
      },
      serviceWorker: {
        getRegistrations: async () => [
          {
            unregister: async () => {
              unregistered.push("precache");
              return true;
            },
          },
          {
            unregister: async () => {
              unregistered.push("runtime");
              return true;
            },
          },
        ],
      },
    });
    expect(deleted).toEqual(["workbox-precache-v2", "actor-sprites"]);
    expect(unregistered).toEqual(["precache", "runtime"]);
    expect(result).toEqual({
      cachesDeleted: 2,
      workersRemoved: 2,
      failures: 0,
    });
  });

  it("không lỗi khi trình duyệt thiếu CacheStorage và service worker", async () => {
    await expect(clearAppCache({})).resolves.toEqual({
      cachesDeleted: 0,
      workersRemoved: 0,
      failures: 0,
    });
  });

  it("đếm thao tác lỗi thay vì ném ra để vẫn tải lại được", async () => {
    const result = await clearAppCache({
      caches: {
        keys: async () => ["stale"],
        delete: async () => {
          throw new Error("QuotaExceeded");
        },
      },
      serviceWorker: {
        getRegistrations: async () => {
          throw new Error("SecurityError");
        },
      },
    });
    expect(result).toEqual({
      cachesDeleted: 0,
      workersRemoved: 0,
      failures: 2,
    });
  });

  it("cache đã biến mất trước khi xóa không bị tính là lỗi", async () => {
    const result = await clearAppCache({
      caches: {
        keys: async () => ["gone"],
        delete: async () => false,
      },
    });
    expect(result).toEqual({
      cachesDeleted: 0,
      workersRemoved: 0,
      failures: 0,
    });
  });
});
