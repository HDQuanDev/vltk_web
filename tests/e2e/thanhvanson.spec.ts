import earned from "../fixtures/v0.5-earned-farm.json" with { type: "json" };
import { test, expect, type Page } from "@playwright/test";
import { enterCharacter } from "./helpers/characters";
import type { GameSnapshot } from "../../packages/game-protocol/src/index";
async function save(page: Page): Promise<GameSnapshot> {
  await page.locator(".save-state").click();
  await expect(page.locator(".save-state")).toContainText("Đã lưu");
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("kiem-hiep-web");
      r.onsuccess = () => resolve(r.result);
    });
    const rows = await new Promise<
      { snapshot: GameSnapshot; savedAt: number }[]
    >((resolve) => {
      const r = db.transaction("saves").objectStore("saves").getAll();
      r.onsuccess = () => resolve(r.result);
    });
    db.close();
    return rows.sort((a, b) => b.savedAt - a.savedAt)[0].snapshot;
  });
}
for (const width of [1366, 932])
  test(`đi cổng sang Thanh Vân Sơn, gặp quái mới và giữ tiến trình offline ${width}`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height: width === 932 ? 430 : 768 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await enterCharacter(page);
    // Checkpoint này do starterJourney + 30 phút farm bằng lệnh thật tạo ra;
    // đây là bài kiểm tra đi cổng/render/offline, không grant thêm gì.
    await page.locator('input[type="file"]').setInputFiles({
      name: "earned-farm.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(earned)),
    });
    await page
      .getByRole("button", { name: "Xác nhận nhập", exact: true })
      .click();
    await expect(page.locator(".world-loading")).toHaveCount(0);
    await expect(page.locator(".player-name strong")).toHaveText(earned.name);
    await expect(page.locator(".world-viewport canvas")).toBeVisible();
    await page.keyboard.press("m");
    const map = page.getByRole("dialog", { name: "Thiên hạ đồ", exact: true });
    await expect(map).toContainText("Vân Khê Sơn Dã");
    // Cổng mới nối Vân Khê sang bãi luyện cấp lớn.
    const gate = page
      .locator(".destination-row")
      .filter({ hasText: "Thanh Vân Sơn" });
    await expect(gate).toHaveCount(1);
    await gate.click();
    await expect(page.locator(".location-heading")).toContainText(
      "Thanh Vân Sơn",
      { timeout: 25000 },
    );
    // Quái của bản đồ mới phải được publish vào client (không chỉ là địa hình).
    await page.waitForTimeout(4000);
    await page.getByRole("button", { name: "Thiết lập", exact: true }).click();
    const publishRow = page.locator(".diagnostics-row p", { hasText: "Gửi" });
    await expect(publishRow).toContainText("entity");
    const text = await publishRow.innerText();
    const published = /Gửi (\d+)\/(\d+) entity/.exec(text)!;
    expect(Number(published[1])).toBeGreaterThan(1);
    expect(Number(published[2])).toBeGreaterThan(Number(published[1]));
    await page
      .getByRole("button", { name: "Đóng cửa sổ", exact: true })
      .click();
    await page.screenshot({
      path: `artifacts/thanhvanson-${width}.png`,
    });
    const before = await save(page);
    expect(before.mapId).toBe("thanhvanson");
    expect(before.visitedMaps).toContain("thanhvanson");
    await context.setOffline(true);
    await page.reload();
    await enterCharacter(page);
    await expect(page.locator(".world-viewport canvas")).toBeVisible();
    await expect(page.locator(".location-heading")).toContainText(
      "Thanh Vân Sơn",
      { timeout: 20000 },
    );
    const restored = await save(page);
    expect(restored.mapId).toBe("thanhvanson");
    expect(restored.quests).toEqual(before.quests);
    expect(errors).toEqual([]);
  });
