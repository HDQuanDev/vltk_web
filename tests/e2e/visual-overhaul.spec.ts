import { test, expect, type Page } from "@playwright/test";
import { createGame, addItem } from "../../packages/game-core/src/index";
import { getItem, npcs } from "../../packages/game-content/src/index";
import type { GameSnapshot } from "../../packages/game-protocol/src/index";
import { enterCharacter } from "./helpers/characters";
async function load(page: Page, state: GameSnapshot) {
  await page.locator("input[type=file]").setInputFiles({
    name: "visual-test.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(state)),
  });
  await page
    .getByRole("button", { name: "Xác nhận nhập", exact: true })
    .click();
  await expect(page.locator(".import-confirm")).toHaveCount(0);
  await expect(page.locator(".player-name strong")).toHaveText(state.name);
}
async function open(page: Page, name: string) {
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await page
    .locator(".mobile-menu")
    .getByRole("button", { name, exact: true })
    .click();
}
async function saved(page: Page): Promise<GameSnapshot> {
  await page.locator(".save-state").click();
  await expect(page.locator(".save-state")).toContainText("Đã lưu");
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("kiem-hiep-web");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const rows = await new Promise<
      { snapshot: GameSnapshot; savedAt: number }[]
    >((resolve, reject) => {
      const r = db.transaction("saves").objectStore("saves").getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    db.close();
    return rows.sort((a, b) => b.savedAt - a.savedAt)[0].snapshot;
  });
}
for (const viewport of [
  { width: 1366, height: 768 },
  { width: 844, height: 390 },
]) {
  test(`item grid, tooltip, compare and focus ${viewport.width}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await enterCharacter(page);
    const state = createGame(
      "Khách Giám Định",
      "wudang",
      `art-${viewport.width}`,
    );
    for (const id of [
      "boss-sword",
      "cloud-spear",
      "thunder-saber",
      "jade-fan",
      "thunder-helm",
      "jade-pendant",
      "wood",
      "ore",
    ])
      addItem(state, id);
    await load(page, state);
    await open(page, "Hành trang");
    const slots = page.locator(".inventory-grid > .item-slot");
    const a = (await slots.nth(0).boundingBox())!,
      b = (await slots.nth(8).boundingBox())!;
    expect(b.y).toBeGreaterThanOrEqual(a.y + a.height + 4);
    await page
      .getByRole("button", { name: "Huyền Thiên Kiếm", exact: true })
      .click();
    await expect(page.locator(".item-comparison")).toContainText(
      "So với Thanh Phong Kiếm",
    );
    await expect(page.locator(".item-comparison")).toContainText("▲ +24");
    if (viewport.width > 1000) {
      await page.mouse.move(0, 0);
      await page
        .getByRole("button", { name: "Huyền Thiên Kiếm", exact: true })
        .hover();
      await expect(page.getByRole("tooltip")).toBeVisible();
      const tip = (await page.getByRole("tooltip").boundingBox())!;
      expect(tip.x + tip.width).toBeLessThanOrEqual(viewport.width);
      expect(tip.y + tip.height).toBeLessThanOrEqual(viewport.height);
    }
    const dialog = page.getByRole("dialog", {
      name: "Hành trang",
      exact: true,
    });
    await dialog
      .getByRole("button", { name: "Đóng cửa sổ", exact: true })
      .focus();
    await page.keyboard.press("Shift+Tab");
    expect(
      await page.evaluate(
        () => !!document.activeElement?.closest("[role=dialog]"),
      ),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });
  test(`forge skip and reload never repeat a transaction ${viewport.width}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await enterCharacter(page);
    const state = createGame(
      "Thợ Luyện Khí",
      "wudang",
      `forge-art-${viewport.width}`,
    );
    state.gold = 5000;
    Object.assign(state.entities[state.playerId], { x: 18, y: 12 });
    addItem(state, "ore", 20);
    await load(page, state);
    await open(page, "Công xưởng");
    await page.getByRole("button", { name: "Cường hóa", exact: true }).click();
    const action = page.getByRole("button", {
      name: "Cường hóa +1",
      exact: true,
    });
    const bounds = (await action.boundingBox())!;
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
    await action.click();
    const skip = page.getByRole("button", {
      name: "Bỏ qua diễn hoạt",
      exact: true,
    });
    if (await skip.isVisible()) await skip.click();
    await expect(page.locator(".enhance-log")).toContainText("thành công");
    await page
      .getByRole("button", { name: "Đóng cửa sổ", exact: true })
      .click();
    const before = await saved(page);
    expect(before.gold).toBe(4950);
    expect(before.enhanceLog).toHaveLength(1);
    expect(before.equipment.weapon.enhancement).toBe(1);
    await page.reload();
    await enterCharacter(page);
    await open(page, "Công xưởng");
    await page.getByRole("button", { name: "Cường hóa", exact: true }).click();
    await expect(page.locator(".forge-scene")).toHaveClass(/forge-idle/);
    await page
      .getByRole("button", { name: "Đóng cửa sổ", exact: true })
      .click();
    const after = await saved(page);
    expect(after.gold).toBe(before.gold);
    expect(after.enhanceLog).toEqual(before.enhanceLog);
    expect(after.inventory).toEqual(before.inventory);
  });
  test(`merchant buy and sell update authority and persist ${viewport.width}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await enterCharacter(page);
    const state = createGame(
        "Khách Thảo Đường",
        "wudang",
        `shop-art-${viewport.width}`,
      ),
      merchant = npcs.find((n) => n.id === "merchant")!;
    state.gold = 1000;
    Object.assign(state.entities[state.playerId], {
      x: merchant.x,
      y: merchant.y,
    });
    await load(page, state);
    await open(page, "Hành trang");
    await page
      .getByRole("button", { name: "Đến dược sư", exact: true })
      .click();
    await expect(page.locator(".merchant-counter")).toBeVisible();
    const hp = getItem("hp");
    await page
      .getByRole("button", { name: `Mua ${hp.name}`, exact: true })
      .click();
    await expect(page.locator(".merchant-wallet")).toContainText(
      String(1000 - hp.price),
    );
    await page
      .getByRole("button", { name: "Bán từ hành trang", exact: true })
      .click();
    await page
      .getByRole("button", { name: `Bán ${hp.name}`, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Đóng cửa sổ", exact: true })
      .click();
    const before = await saved(page);
    expect(before.gold).toBe(
      1000 - hp.price + Math.max(1, Math.floor(hp.price / 3)),
    );
    expect(
      before.inventory.find((i) => i.definitionId === "hp")?.quantity,
    ).toBe(state.inventory.find((i) => i.definitionId === "hp")?.quantity);
    await page.reload();
    await enterCharacter(page);
    expect((await saved(page)).inventory).toEqual(before.inventory);
  });
}
test("reduced motion and male/female portrait identity survive reload", async ({
  page,
}) => {
  await page.goto("/");
  const male = await page.locator(".lobby-illustration").getAttribute("src");
  await page.getByLabel("Ngoại hình", { exact: true }).selectOption("female");
  expect(
    await page.locator(".lobby-illustration").getAttribute("src"),
  ).not.toBe(male);
  await page
    .getByRole("textbox", { name: "Tên nhân vật", exact: true })
    .fill("Nữ Hiệp Vân");
  await page
    .getByRole("button", { name: "Tạo nhân vật và vào game", exact: true })
    .click();
  await expect(page.locator(".avatar img")).toHaveAttribute("src", /female/);
  await open(page, "Thiết lập");
  await page
    .getByRole("checkbox", { name: "Giảm chuyển động / tắt rung camera" })
    .check();
  await expect(page.locator("html")).toHaveAttribute(
    "data-reduced-motion",
    "true",
  );
  await page.getByRole("button", { name: "Đóng cửa sổ", exact: true }).click();
  await saved(page);
  await page.reload();
  await enterCharacter(page);
  await expect(page.locator("html")).toHaveAttribute(
    "data-reduced-motion",
    "true",
  );
  await expect(page.locator(".avatar img")).toHaveAttribute("src", /female/);
});

test("compact HUD keeps the game viewport and combat controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  await enterCharacter(page);
  await page
    .getByRole("button", { name: "Thu gọn giao diện", exact: true })
    .click();
  await expect(page.locator(".minimap-panel")).toBeHidden();
  await expect(page.locator(".joystick")).toBeVisible();
  await expect(page.locator(".mobile-attack")).toBeVisible();
  await expect(page.locator(".player-hud")).toBeVisible();
  await page
    .getByRole("button", { name: "Hiện đầy đủ giao diện", exact: true })
    .click();
  await expect(page.locator(".minimap-panel")).toBeVisible();
});
for (const width of [844, 932])
  test(`character creation action stays visible without scrolling ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 390 });
    await page.goto("/");
    await page
      .getByRole("textbox", { name: "Tên nhân vật", exact: true })
      .fill("Thiếu Hiệp");
    const action = page.getByRole("button", {
      name: "Tạo nhân vật và vào game",
      exact: true,
    });
    const box = (await action.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(390);
    expect(
      await page.locator(".lobby-details").evaluate((e) => e.scrollTop),
    ).toBe(0);
  });
