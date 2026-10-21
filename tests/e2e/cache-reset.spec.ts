import { test, expect } from "@playwright/test";
import { enterCharacter } from "./helpers/characters";

/**
 * Nút "Xóa bộ nhớ đệm & tải lại" trong panel Thiết lập phải:
 * - xóa CacheStorage và hủy đăng ký service worker (để lấy mã mới),
 * - tải lại trang và vào lại được game,
 * - KHÔNG làm mất bản lưu nhân vật (IndexedDB).
 */
test("xóa bộ nhớ đệm: xóa cache, hủy service worker, giữ bản lưu", async ({
  page,
}) => {
  await page.goto("/");
  await enterCharacter(page);
  // Lần tải đầu đăng ký service worker; tải lại để nó kiểm soát trang và
  // precache xong trước khi ta xóa.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await enterCharacter(page);
  await expect
    .poll(() => page.evaluate(() => caches.keys().then((k) => k.length)), {
      timeout: 15000,
    })
    .toBeGreaterThan(0);

  // Cache đánh dấu: workbox không tạo lại tên này, nên nếu nó còn sau khi bấm
  // thì cache đã không bị xóa.
  await page.evaluate(async () => {
    const cache = await caches.open("kiem-hiep-sentinel");
    await cache.put("/sentinel.txt", new Response("sentinel"));
  });

  await page.getByRole("button", { name: "Thiết lập", exact: true }).click();
  const clearButton = page.getByRole("button", { name: /Xóa bộ nhớ đệm/ });
  await expect(clearButton).toBeVisible();
  page.once("dialog", (dialog) => void dialog.accept());
  await Promise.all([page.waitForEvent("load"), clearButton.click()]);

  // Sau khi tải lại: cache đánh dấu biến mất, service worker vẫn đăng ký lại
  // được, app vào lại được và bản lưu còn nguyên.
  expect(await page.evaluate(() => caches.has("kiem-hiep-sentinel"))).toBe(
    false,
  );
  await expect(page.locator(".character-lobby")).toBeVisible();
  expect(
    await page.evaluate(async () =>
      Boolean(await navigator.serviceWorker.getRegistration()),
    ),
  ).toBe(true);
  const saves = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("kiem-hiep-web");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const rows = await new Promise<unknown[]>((resolve, reject) => {
      const request = db.transaction("saves").objectStore("saves").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return rows.length;
  });
  expect(saves).toBeGreaterThan(0);
});
