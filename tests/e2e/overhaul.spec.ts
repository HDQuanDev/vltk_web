import legacy02 from "../fixtures/v0.2-save.json" with { type: "json" };
import { test, expect, type Page } from "@playwright/test";
import { enterCharacter } from "./helpers/characters";
import { writeFile } from "node:fs/promises";
import type { GameSnapshot } from "../../packages/game-protocol/src/index";
async function start(page: Page) {
  await page.goto("/");
  await enterCharacter(page);
  await expect(page.locator(".world-viewport canvas")).toBeVisible();
}
async function saved(page: Page): Promise<GameSnapshot> {
  await page.locator(".save-state").click();
  await expect(page.locator(".save-state")).toContainText("Đã lưu");
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("kiem-hiep-web");
      r.onsuccess = () => resolve(r.result);
    });
    const records = await new Promise<
      { snapshot: GameSnapshot; savedAt: number }[]
    >((resolve) => {
      const r = db.transaction("saves").objectStore("saves").getAll();
      r.onsuccess = () => resolve(r.result);
    });
    db.close();
    return records.sort((a, b) => b.savedAt - a.savedAt)[0].snapshot;
  });
}
for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 932, height: 430 },
  { width: 844, height: 390 },
  { width: 390, height: 844 },
])
  test(`full viewport / overlay ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await start(page);
    expect(
      await page.locator("header.topbar, footer.bottom-dock").count(),
    ).toBe(0);
    const world = await page.locator(".world-viewport").boundingBox();
    expect(world).toMatchObject({
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height,
    });
    const before = await page.locator(".minimap-panel").boundingBox();
    await page.getByRole("button", { name: "Thu phóng bản đồ nhỏ" }).click();
    const after = await page.locator(".minimap-panel").boundingBox();
    expect(after!.width).toBeGreaterThan(before!.width);
    await page.getByRole("button", { name: "Thu phóng bản đồ nhỏ" }).click();
    await saved(page);
    await expect(page.locator(".save-notice")).toBeVisible();
    await expect(page.locator(".save-notice")).toHaveCount(0, {
      timeout: 3500,
    });
    await page.screenshot({
      path: `artifacts/overhaul-${viewport.width}x${viewport.height}.png`,
    });
  });
test("multitouch: giữ joystick và dùng kỹ năng, cancel dừng đúng pointer", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 932, height: 430 });
  await start(page);
  const initial = await saved(page),
    j = (await page.locator(".joystick").boundingBox())!,
    skill = (await page
      .locator(".mobile-skills")
      .getByRole("button", { name: "Thanh Tâm Quyết", exact: true })
      .boundingBox())!;
  const cdp = await context.newCDPSession(page),
    finger = { x: j.x + j.width / 2 + 23, y: j.y + j.height / 2, id: 1 };
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [finger],
  });
  await page.waitForTimeout(250);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      finger,
      { x: skill.x + skill.width / 2, y: skill.y + skill.height / 2, id: 2 },
    ],
  });
  await page.waitForTimeout(100);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [finger],
  });
  await page.waitForTimeout(350);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  const after = await saved(page);
  expect(after.entities[after.playerId].mp).toBeLessThan(
    initial.entities[initial.playerId].mp,
  );
  expect(after.entities[after.playerId].x).toBeGreaterThan(
    initial.entities[initial.playerId].x,
  );
  expect(after.entities[after.playerId].path).toHaveLength(0);
  await cdp.detach();
});
for (const width of [1366, 932])
  test(`hành trình mới không grant: cổng → NPC → khảo sát → thưởng → offline ${width}`, async ({
    page,
    context,
  }) => {
    test.setTimeout(75000);
    await page.setViewportSize({ width, height: width === 932 ? 430 : 768 });
    await start(page);
    await page.keyboard.press("m");
    await page
      .getByRole("button", { name: /Thanh Sơn Ngoại Vực Tự tìm đường/ })
      .click();
    await expect(page.locator(".minimap-header")).toContainText(
      "Thanh Sơn Ngoại Vực",
      { timeout: 15000 },
    );
    await page.keyboard.press("j");
    const quest = page
      .locator(".quest-detail")
      .filter({ hasText: "Qua đèo Trúc Ảnh" });
    await quest.getByRole("button", { name: /Gặp Lục tuần sơn/ }).click();
    await expect(
      page.getByRole("dialog", { name: "Lục tuần sơn", exact: true }),
    ).toBeVisible();
    await page
      .locator(".npc-quest")
      .filter({ hasText: "Qua đèo Trúc Ảnh" })
      .getByRole("button", { name: "Nhận nhiệm vụ", exact: true })
      .click();
    await page.getByRole("button", { name: "Đóng cửa sổ" }).click();
    await page.keyboard.press("j");
    await quest.getByRole("button", { name: "Theo dõi mục tiêu" }).click();
    await expect(page.locator(".console-messages")).toContainText(
      "Nhiệm vụ Qua đèo Trúc Ảnh đã hoàn thành",
      { timeout: 20000 },
    );
    await page.keyboard.press("j");
    await quest.getByRole("button", { name: "Trở về nhận thưởng" }).click();
    await expect(
      page.getByRole("dialog", { name: "Lục tuần sơn", exact: true }),
    ).toBeVisible({ timeout: 20000 });
    await page
      .locator(".npc-quest")
      .filter({ hasText: "Qua đèo Trúc Ảnh" })
      .getByRole("button", { name: "Nhận phần thưởng", exact: true })
      .click();
    await page.getByRole("button", { name: "Đóng cửa sổ" }).click();
    const before = await saved(page);
    expect(before.quests.find((q) => q.id === "highland-route")?.status).toBe(
      "claimed",
    );
    expect(before.gold).toBeGreaterThanOrEqual(235);
    await expect(page.locator(".offline-status")).toContainText(
      "Sẵn sàng offline",
      { timeout: 15000 },
    );
    await page.reload();
    await enterCharacter(page);
    await expect(page.locator(".world-viewport canvas")).toBeVisible();
    await context.setOffline(true);
    await page.reload();
    await enterCharacter(page);
    await expect(page.locator(".world-viewport canvas")).toBeVisible();
    const after = await saved(page);
    expect(after.quests).toEqual(before.quests);
    expect(after.mapId).toBe("highlands");
    await page.getByRole("button", { name: "Thiết lập", exact: true }).click();
    await expect(page.locator(".diagnostics-row")).toContainText("chunks");
    await page.screenshot({ path: `artifacts/highlands-${width}.png` });
    await context.setOffline(false);
  });
test("client quality/audio preferences giữ sau reload và không sửa RPG state", async ({
  page,
}) => {
  await start(page);
  const before = await saved(page);
  await page.getByRole("button", { name: "Thiết lập", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Chất lượng dựng hình" })
    .selectOption("low");
  await page.getByLabel("Giảm chuyển động / tắt rung camera").check();
  await page
    .getByRole("combobox", { name: "Chế độ joystick" })
    .selectOption("floating");
  await page
    .getByRole("slider", { name: "Âm lượng Tổng", exact: true })
    .fill("0.35");
  await page.getByRole("button", { name: "Thử âm thanh" }).click();
  await expect(page.locator(".panel-settings")).toContainText("Audio running");
  await page.reload();
  await enterCharacter(page);
  await expect(page.locator(".world-viewport canvas")).toBeVisible();
  await page.getByRole("button", { name: "Thiết lập", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Chất lượng dựng hình" }),
  ).toHaveValue("low");
  await expect(
    page.getByRole("slider", { name: "Âm lượng Tổng", exact: true }),
  ).toHaveValue("0.35");
  await expect(
    page.getByRole("combobox", { name: "Chế độ joystick" }),
  ).toHaveValue("floating");
  await page.getByRole("button", { name: "Đóng cửa sổ" }).click();
  const after = await saved(page);
  expect(after.inventory).toEqual(before.inventory);
  expect(after.gold).toBe(before.gold);
  expect(after.attributes).toEqual(before.attributes);
});
test("props alpha: kiểm tra pixel trong browser thật", async ({ page }) => {
  await start(page);
  const alpha = await page.evaluate(async () => {
    const rows = [];
    for (const id of ["house", "tree", "cherry", "bamboo"]) {
      const img = new Image();
      img.src = `/assets/overhaul/${id}-v1.png`;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext("2d")!;
      g.drawImage(img, 0, 0);
      const p = g.getImageData(0, 0, c.width, c.height).data;
      let clear = 0,
        solid = 0;
      for (let i = 3; i < p.length; i += 4) {
        if (p[i] === 0) clear++;
        if (p[i] > 200) solid++;
      }
      rows.push({
        id,
        width: c.width,
        height: c.height,
        clear: clear / (p.length / 4),
        solid: solid / (p.length / 4),
        corner: p[3],
      });
    }
    return rows;
  });
  for (const a of alpha) {
    expect(a.clear).toBeGreaterThan(0.2);
    expect(a.solid).toBeGreaterThan(0.1);
    expect(a.corner).toBe(0);
  }
  await writeFile(
    "artifacts/alpha-browser.json",
    JSON.stringify(alpha, null, 2),
  );
});

test("file v0.2 import qua UI giữ enhancement/gems/warehouse/profession", async ({
  page,
}) => {
  await start(page);
  await page.locator('input[type="file"]').setInputFiles({
    name: "v02.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(legacy02)),
  });
  await page.getByRole("button", { name: "Xác nhận nhập" }).click();
  await expect(page.locator(".player-name strong")).toHaveText(legacy02.name);
  const restored = await saved(page);
  expect(restored.contentVersion).toBe("0.5.0");
  expect(restored.equipment).toEqual(legacy02.equipment);
  expect(restored.warehouse).toEqual(legacy02.warehouse);
  expect(restored.professionXp).toEqual(legacy02.professionXp);
  expect(restored.gold).toBe(legacy02.gold);
});
