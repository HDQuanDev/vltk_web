import { test, expect, type Page } from "@playwright/test";

async function create(page: Page, name: string) {
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Tạo nhân vật", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".world-viewport canvas")).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Tên nhân vật", exact: true })
    .fill(name);
  const submit = await page
    .getByRole("button", { name: "Tạo nhân vật và vào game", exact: true })
    .boundingBox();
  expect(submit!.y + submit!.height).toBeLessThanOrEqual(
    page.viewportSize()!.height,
  );
  await page
    .getByRole("button", { name: "Tạo nhân vật và vào game", exact: true })
    .click();
  await expect(page.locator(".world-viewport canvas")).toBeVisible();
  await expect(page.locator(".world-loading")).toHaveCount(0);
  await expect(page.locator(".player-name strong")).toHaveText(name);
}
async function snapshot(page: Page) {
  await page.locator(".save-state").click();
  await expect(page.locator(".save-state")).toContainText("Đã lưu");
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("kiem-hiep-web");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const rows = await new Promise<
      {
        snapshot: import("../../packages/game-protocol/src/index").GameSnapshot;
        savedAt: number;
      }[]
    >((resolve, reject) => {
      const r = db.transaction("saves").objectStore("saves").getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    db.close();
    return rows.sort((a, b) => b.savedAt - a.savedAt)[0].snapshot;
  });
}
for (const width of [1366, 932])
  test(`khởi tạo → đánh quái → đồ dưới đất → nhặt → lưu/reload ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 932 ? 430 : 768 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await create(page, "Thiếu Hiệp");
    const before = await snapshot(page);
    await page.keyboard.press("Space");
    await expect(
      page.getByRole("button", { name: "Nhặt 18 bạc", exact: true }).first(),
    ).toBeVisible({ timeout: 20000 });
    const dropped = await snapshot(page);
    expect(dropped.experience).toBeGreaterThan(0);
    expect(Object.values(dropped.groundLoot).some((l) => l.gold === 18)).toBe(
      true,
    );
    expect(dropped.gold).toBe(before.gold);
    await page
      .getByRole("button", { name: "Nhặt 18 bạc", exact: true })
      .first()
      .click();
    if (width > 1000) {
      await page.getByRole("button", { name: "Mở menu", exact: true }).click();
      await page
        .getByRole("button", { name: "Nghề nghiệp", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Dừng tự chiến", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Đóng cửa sổ", exact: true })
        .click();
    } else
      await page.getByRole("button", { name: "Tự chiến", exact: true }).click();
    await page.screenshot({ path: `artifacts/ground-loot-${width}.png` });
    await expect
      .poll(async () => (await snapshot(page)).gold)
      .toBeGreaterThan(before.gold);
    const after = await snapshot(page);
    expect(after.playedTicks).toBeGreaterThan(0);
    expect(after.entities[after.playerId].autoAttack).toBe(false);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Chọn nhân vật", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".world-viewport canvas")).toHaveCount(0);
    const enter = await page
      .getByRole("button", { name: "Vào game", exact: true })
      .boundingBox();
    expect(enter!.y + enter!.height).toBeLessThanOrEqual(
      page.viewportSize()!.height,
    );
    await page.screenshot({
      path: `artifacts/character-selection-${width}.png`,
    });
    await page.getByRole("button", { name: "Vào game", exact: true }).click();
    await expect(page.locator(".player-name strong")).toHaveText("Thiếu Hiệp");
    const restored = await snapshot(page);
    expect(restored.gold).toBe(after.gold);
    expect(restored.groundLoot).toEqual(after.groundLoot);
    expect(errors).toEqual([]);
  });
test("tên Unicode lỗi rõ ràng, đổi phái giữ tên, tạo/chọn/xóa nhiều nhân vật", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Tên nhân vật", exact: true })
    .fill("<script>");
  await page
    .getByRole("button", { name: "Tạo nhân vật và vào game", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Tên chỉ gồm");
  await page
    .getByRole("textbox", { name: "Tên nhân vật", exact: true })
    .fill("Độc Cô");
  await page
    .getByRole("button", { name: "Thiếu Lâm Kim", exact: false })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Tên nhân vật", exact: true }),
  ).toHaveValue("Độc Cô");
  await page.screenshot({ path: "artifacts/character-creation.png" });
  await page
    .getByRole("button", { name: "Tạo nhân vật và vào game", exact: true })
    .click();
  await expect(page.locator(".world-viewport canvas")).toBeVisible();
  await snapshot(page);
  await page.reload();
  await page
    .getByRole("button", { name: "Tạo nhân vật mới", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Tên nhân vật", exact: true })
    .fill("độc cô");
  await page
    .getByRole("button", { name: "Tạo nhân vật và vào game", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("đã được sử dụng");
  await page
    .getByRole("textbox", { name: "Tên nhân vật", exact: true })
    .fill("Nga Mi Nữ");
  await page.getByRole("button", { name: "Nga Mi Thủy", exact: false }).click();
  await page.getByLabel("Ngoại hình", { exact: true }).selectOption("female");
  await page
    .getByRole("button", { name: "Tạo nhân vật và vào game", exact: true })
    .click();
  await expect(page.locator(".player-name strong")).toHaveText("Nga Mi Nữ");
  await snapshot(page);
  await page.reload();
  await page.getByRole("button", { name: "Xóa nhân vật", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận xóa", exact: true }).click();
  await expect(page.locator(".lobby-heading")).toContainText("1/5");
  await page.getByRole("button", { name: "Vào game", exact: true }).click();
  await expect(page.locator(".player-name strong")).toHaveText("Độc Cô");
});
test("điện thoại chặn chiều dọc, xoay ngang vào game, overlay phủ kín viewport", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Xoay ngang điện thoại" }),
  ).toBeVisible();
  await expect(page.locator(".character-lobby")).toBeHidden();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator(".orientation-guard")).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Tên nhân vật", exact: true })
    .fill("Hiệp Khách");
  await page
    .getByRole("button", { name: "Tạo nhân vật và vào game", exact: true })
    .click();
  await expect(page.locator(".world-viewport canvas")).toBeVisible();
  await page.getByRole("button", { name: "Thiết lập", exact: true }).click();
  expect(await page.locator(".modal-backdrop").boundingBox()).toEqual({
    x: 0,
    y: 0,
    width: 844,
    height: 390,
  });
  await page.getByRole("button", { name: "Đóng cửa sổ", exact: true }).click();
  const before = await snapshot(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".orientation-guard")).toBeVisible();
  await page.waitForTimeout(700);
  await page.setViewportSize({ width: 844, height: 390 });
  const after = await snapshot(page);
  expect(after.playedTicks - before.playedTicks).toBeLessThan(10);
  await context.close();
});
