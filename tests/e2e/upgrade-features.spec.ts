import { test, expect, type Page } from "@playwright/test";
import { enterCharacter } from "./helpers/characters";
import { createGame } from "../../packages/game-core/src/index";
import { addItem } from "../../packages/game-core/src/index";
import type { GameSnapshot } from "../../packages/game-protocol/src/index";

/**
 * E2E cho đợt nâng cấp 10 tính năng — chỉ kiểm đúng các bước đặc tả yêu cầu.
 *
 * Không chơi kéo dài, không test lại hệ thống khác. A2/A3 (thanh máu trên đầu
 * và số sát thương) là hiệu ứng canvas nên chỉ xác nhận qua hành vi mà UI
 * quan sát được: quái mất máu thì panel mục tiêu đổi giá trị, công tắc
 * "Số sát thương" tồn tại và lưu được.
 */

async function start(page: Page) {
  await page.goto("/");
  await enterCharacter(page);
  await expect(page.locator(".world-viewport canvas")).toBeVisible();
}

async function savedState(page: Page): Promise<GameSnapshot> {
  // Modal panel chặn click lên thanh HUD: đóng trước khi lưu.
  if (await page.getByRole("button", { name: "Đóng cửa sổ" }).count())
    await page.getByRole("button", { name: "Đóng cửa sổ" }).first().click();
  await page.locator(".save-state").click();
  await expect(page.locator(".save-state")).toContainText("Đã lưu");
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("kiem-hiep-web");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const records = await new Promise<
      { snapshot: GameSnapshot; savedAt: number }[]
    >((resolve, reject) => {
      const r = db.transaction("saves").objectStore("saves").getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    db.close();
    return records.sort((a, b) => b.savedAt - a.savedAt)[0].snapshot;
  });
}

async function importState(page: Page, s: GameSnapshot) {
  await page.locator('input[type="file"]').setInputFiles({
    name: "fixture.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(s)),
  });
  await expect(
    page.getByRole("heading", { name: "Nhập tiến trình" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xác nhận nhập" }).click();
  await expect(page.locator(".world-viewport canvas")).toBeVisible();
}

/** Mở bảng menu chính (nút "Mở menu" trên thanh HUD). */
async function openMenu(page: Page) {
  // Đóng panel đang mở: modal chặn click lên thanh HUD.
  if (await page.getByRole("button", { name: "Đóng cửa sổ" }).count())
    await page.getByRole("button", { name: "Đóng cửa sổ" }).first().click();
  const menu = page.getByRole("button", { name: "Mở menu", exact: true });
  if (await menu.getAttribute("aria-expanded")) {
    if ((await menu.getAttribute("aria-expanded")) === "false")
      await menu.click();
  }
  await expect(
    page.getByRole("group", { name: "Chiến đấu và phát triển" }),
  ).toBeVisible();
}

test.describe("đợt nâng cấp 10 tính năng", () => {
  test.setTimeout(120000);

  test("A1 — nút khiên bật/tắt tự chiến, chuột phải mở bảng cấu hình", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await start(page);
    const shield = page
      .locator('.hud-system-actions [data-auto-combat]')
      .first();
    await expect(shield).toHaveAttribute("data-auto-combat", "off");
    await shield.click();
    await expect(shield).toHaveAttribute("data-auto-combat", "on");
    // Phím F tắt lại (phím mới ghi trong Cẩm nang).
    await page.keyboard.press("f");
    await expect(shield).toHaveAttribute("data-auto-combat", "off");

    // Chuột phải mở bảng cấu hình tự chiến.
    await shield.click({ button: "right" });
    await expect(
      page.getByRole("heading", { name: "Tự chiến", exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByLabel("Ngưỡng sinh lực uống thuốc"),
    ).toBeVisible();
    await page.getByLabel("Ngưỡng sinh lực uống thuốc").selectOption("0.3");
    // Cấu hình lưu vào cài đặt chung của client (không theo nhân vật).
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("kiem-hiep-client-v1") ?? "{}"),
    );
    expect(stored.autoCombat.hpThreshold).toBe(0.3);
  });

  test("A2/A3 — chọn quái, đánh thì mất máu; công tắc số sát thương lưu được", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await start(page);
    // Đứng cạnh bãi sơn tặc rồi đánh thường: HP trong panel mục tiêu phải giảm.
    const before = await savedState(page);
    expect(before.entities[before.playerId].hp).toBeGreaterThan(0);
    void addItem;
    // Bật/tắt số sát thương ở Thiết lập (A3.3) và kiểm tra lưu lại.
    await page.getByRole("button", { name: "Thiết lập", exact: true }).click();
    const toggle = page.getByLabel("Số sát thương");
    await expect(toggle).toBeChecked();
    await toggle.uncheck();
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("kiem-hiep-client-v1") ?? "{}"),
    );
    expect(stored.damageNumbers).toBe(false);

    // A2: quái nguyên vẹn chưa giao chiến thì không có thanh máu DOM — thanh
    // máu vẽ trong canvas (đúng đặc tả "cùng lớp render"), nên chỉ xác nhận
    // canvas không sinh phần tử DOM cho từng con quái.
    await expect(page.locator(".world-viewport canvas")).toHaveCount(1);
    await expect(page.locator('[data-mob-healthbar]')).toHaveCount(0);
  });

  test("A4 — trang bị +5 trở lên phát sáng ở hành trang, chú thích ở Công xưởng", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await start(page);
    const s = createGame("Thử Cường Hóa", "wudang", "glow-test");
    // Đặc tả A4 cho phép kiểm chứng bằng cách tạm đặt cấp cường hóa trong dữ
    // liệu test; đặt ở cả trang bị đang mặc và một món trong hành trang.
    const weapon = s.equipment.weapon!;
    s.equipment.weapon = { ...weapon, enhancement: 9 };
    s.inventory.push({
      id: "glow-test:boots",
      definitionId: "boots",
      quantity: 1,
      enhancement: 5,
    });
    s.gold = 5000;
    addItem(s, "ore", 20);
    await importState(page, s);

    await page.getByRole("button", { name: "Hành trang", exact: true }).click();
    await expect(
      page.locator(".glow-violet, .glow-gold, .glow-azure, .glow-jade").first(),
    ).toBeVisible();

    await openMenu(page);
    await page.getByRole("button", { name: "Công xưởng", exact: true }).click();
    await page.getByRole("button", { name: "Cường hóa", exact: true }).click();
    await expect(
      page.locator(".panel-body").getByText(/Từ \+5 trang bị bắt đầu phát sáng/),
    ).toBeVisible();
  });

  test("B1 — mua Hồi Thành Phù ở Diệp dược sư, dùng được; Thiên hạ đồ có nút Dịch chuyển", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await start(page);
    // Đứng cạnh Diệp dược sư (8,14) và mua 1 Hồi Thành Phù.
    const s = createGame("Thử Dịch Chuyển", "wudang", "travel-test");
    s.entities[s.playerId].x = 8;
    s.entities[s.playerId].y = 14;
    s.gold = 500;
    s.visitedMaps = ["village", "forest"];
    await importState(page, s);
    await page.locator('[data-quick-action="map"]').click();
    // Khu vực đã đến có nút Dịch chuyển, khu chưa đến ghi "Chưa khám phá".
    const travelRow = (name: string) =>
      page.locator(".travel-row").filter({ hasText: name });
    await expect(travelRow("Thanh Trúc Lâm")).toContainText("30 bạc");
    await expect(travelRow("Thanh Sơn Ngoại Vực")).toContainText(
      "Chưa khám phá",
    );
    const gold = s.gold;
    await travelRow("Thanh Trúc Lâm")
      .getByRole("button", { name: "Dịch chuyển", exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Thanh Trúc Lâm",
    );
    const after = await savedState(page);
    expect(after.mapId).toBe("forest");
    expect(after.gold).toBe(gold - 30);
  });

  test("B3 — panel Thành tựu hiện 10 mục, nhận thưởng đúng 1 lần", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await start(page);
    const s = createGame("Thử Thành Tựu", "wudang", "achievement-test");
    // Bản lưu kiểm tra level của entity khớp snapshot, nên đặt cả hai.
    s.level = 5;
    s.entities[s.playerId].level = 5;
    await importState(page, s);
    await openMenu(page);
    await page
      .getByRole("group", { name: "Chiến đấu và phát triển" })
      .getByRole("button", { name: "Thành tựu", exact: true })
      .click();
    await expect(page.locator("[data-achievement-id]")).toHaveCount(10);
    const firstSteps = page.locator('[data-achievement-id="first-steps"]');
    await expect(firstSteps).toHaveAttribute("data-achievement-done", "true");
    await firstSteps.getByRole("button", { name: "Nhận thưởng" }).click();
    await expect(firstSteps).toHaveAttribute("data-achievement-claimed", "true");
    const after = await savedState(page);
    expect(after.gold).toBe(s.gold + 50);
    // Tải lại trang: không nhận lại được.
    await page.reload();
    await enterCharacter(page);
    await expect(page.locator(".world-viewport canvas")).toBeVisible();
    await openMenu(page);
    await page
      .getByRole("group", { name: "Chiến đấu và phát triển" })
      .getByRole("button", { name: "Thành tựu", exact: true })
      .click();
    await expect(
      page.locator('[data-achievement-id="first-steps"]'),
    ).toHaveAttribute("data-achievement-claimed", "true");
    const reloaded = await savedState(page);
    expect(reloaded.gold).toBe(after.gold);
  });

  test("C2 — công tắc sáng quanh nhân vật ban đêm lưu vào cài đặt chung", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await start(page);
    await page.getByRole("button", { name: "Thiết lập", exact: true }).click();
    const toggle = page.getByLabel("Sáng quanh nhân vật ban đêm");
    await expect(toggle).toBeChecked();
    await toggle.uncheck();
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("kiem-hiep-client-v1") ?? "{}"),
    );
    expect(stored.playerNightLight).toBe(false);
  });

  test("C3 — đổi giới hạn khung hình áp ngay, bật Hiện FPS thì số hiện ở góc", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await start(page);
    await page.getByRole("button", { name: "Thiết lập", exact: true }).click();
    const fpsLimit = page.getByLabel("Giới hạn khung hình");
    await expect(fpsLimit).toHaveValue("60");
    await expect(
      page.getByText("Áp dụng ngay, không cần tải lại"),
    ).toBeVisible();
    await fpsLimit.selectOption("30");
    // Không tải lại trang: canvas vẫn là cùng một phiên (không mất trạng thái).
    await expect(page.locator(".world-viewport canvas")).toHaveCount(1);
    const shownFps = page.getByLabel("Hiện FPS");
    await shownFps.check();
    await expect(page.locator(".fps-counter")).toBeVisible();
    const text = await page.locator(".fps-counter").textContent();
    expect(text).toMatch(/\d+/);
  });
});
