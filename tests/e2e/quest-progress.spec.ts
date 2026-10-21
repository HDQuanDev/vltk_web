import { test, expect, type Page } from "@playwright/test";
import { enterCharacter } from "./helpers/characters";
import { createGame } from "../../packages/game-core/src/index";
import type { GameSnapshot } from "../../packages/game-protocol/src/index";

/**
 * Hồi quy E2E cho lỗi QA "hệ thống nhiệm vụ không tăng tiến độ".
 *
 * QA chơi ở màn ngang thấp (844x390): khung hội thoại đẩy nút "Nhận nhiệm vụ"
 * ra ngoài vùng nhìn nên nhiệm vụ không bao giờ được nhận, và mọi tiến độ
 * đều đứng ở 0. Test dưới đây chốt lại đúng kịch bản đó.
 */

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

/** Nút chỉ bấm được khi nằm trọn trong khung cuộn của panel. */
async function isFullyVisible(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { found: false, fullyVisible: false, visibleHeight: 0 };
    const box = el.getBoundingClientRect();
    let parent = el.parentElement,
      visible = 0;
    while (parent) {
      const style = getComputedStyle(parent);
      if (
        style.overflowY === "auto" ||
        style.overflowY === "scroll" ||
        style.overflow === "auto" ||
        style.overflow === "scroll"
      ) {
        const p = parent.getBoundingClientRect();
        visible = Math.max(
          0,
          Math.min(box.bottom, p.bottom) - Math.max(box.top, p.top),
        );
        break;
      }
      parent = parent.parentElement;
    }
    return {
      found: true,
      fullyVisible: visible >= box.height - 0.5,
      visibleHeight: visible,
    };
  }, selector);
}

/** Ở màn ngang thấp khung theo dõi mặc định thu gọn: mở ra để thấy bước. */
async function expandTracker(page: Page) {
  const tracker = page.locator(".quest-tracker");
  if (await tracker.evaluate((el) => el.classList.contains("collapsed")))
    await page
      .getByRole("button", { name: "Hành trình giang hồ", exact: true })
      .click();
  await expect(page.locator(".quest-tracker .quest-objective")).toBeVisible();
}

test.describe("nhiệm vụ trên màn ngang thấp (844x390)", () => {
  test.setTimeout(120000);

  test("nút Nhận nhiệm vụ nằm trọn trong khung, nhận được NV01 và tiến độ tăng", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await start(page);

    // Ở màn ngang thấp khung theo dõi mặc định thu gọn: mở ra để người
    // chơi (và test) thấy được bước nhiệm vụ hiện tại.
    await expandTracker(page);

    // Bước đầu tiên của quest chưa nhận phải là "Gặp Lão trưởng thôn".
    const tracker = page.locator(".quest-tracker .quest-objective");
    await expect(tracker).toContainText("Gặp Lão trưởng thôn");

    // Mở panel Nhiệm vụ và bấm "Gặp Lão trưởng thôn" để tới hội thoại.
    // Mở panel Nhiệm vụ và bấm "Gặp Lão trưởng thôn" để tới hội thoại.
    await page.keyboard.press("j");
    await page
      .locator(".quest-detail")
      .filter({ hasText: "Bình yên thôn nhỏ" })
      .getByRole("button", { name: /Gặp Lão trưởng thôn/ })
      .click();
    const dialog = page.getByRole("dialog", { name: "Lão trưởng thôn", exact: true });
    await expect(dialog).toBeVisible({ timeout: 20000 });
    // Bằng chứng gốc rễ: nút "Nhận nhiệm vụ" phải nằm trọn trong vùng
    // cuộn của panel hội thoại, nếu không người chơi không bấm được.
    const acceptButton = dialog
      .locator(".npc-quest")
      .filter({ hasText: "Bình yên thôn nhỏ" })
      .getByRole("button", { name: "Nhận nhiệm vụ", exact: true });
    await expect(acceptButton).toBeVisible();
    const visibility = await isFullyVisible(
      page,
      '.panel-dialogue .npc-quest button.gold-button',
    );
    expect(visibility.found).toBe(true);
    expect(visibility.fullyVisible).toBe(true);

    // Bước hội thoại đã hoàn thành: khung theo dõi chuyển sang bước
    // "Nhận nhiệm vụ" thay vì đứng ở "Nói chuyện với trưởng thôn".
    await expect(tracker).toContainText("Nhận nhiệm vụ: Bình yên thôn nhỏ");
    await acceptButton.click();
    await expect(page.locator(".console-messages")).toContainText(
      "Đã nhận nhiệm vụ: Bình yên thôn nhỏ",
    );
    await page.getByRole("button", { name: "Đóng cửa sổ" }).click();

    // Khung theo dõi bên trái phải hiện tiến độ 0/5.
    await expect(tracker).toHaveAttribute("data-quest-id", "bandits");
    await expect(tracker).toHaveAttribute("data-quest-progress", "0/5");

    // Panel Nhiệm vụ và khung theo dõi phải đọc cùng một nguồn.
    await page.keyboard.press("j");
    const panelQuest = page
      .locator(".quest-detail")
      .filter({ hasText: "Bình yên thôn nhỏ" });
    await expect(panelQuest).toHaveAttribute("data-quest-progress", "0/5");
    await expect(panelQuest).toHaveAttribute("data-quest-status", "active");
    await expect(tracker).toHaveAttribute("data-quest-progress", "0/5");
    await page.keyboard.press("j");
  });

  test("tiến độ tăng khi hạ quái, có thông báo nổi, panel và khung theo dõi khớp nhau", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await start(page);

    // Nạp trạng thái NV01 đã nhận, đứng cạnh Sơn tặc để hạ thật.
    const s = createGame("Kiếm Khách", "wudang", "combat-browser", 71227);
    s.quests.push({
      id: "bandits",
      status: "active",
      progress: 0,
      completions: 0,
    });
    const m = Object.values(s.entities).find(
      (e) => e.kind === "monster" && e.definitionId === "bandit",
    )!;
    s.entities[s.playerId].x = m.x - 1;
    s.entities[s.playerId].y = m.y;
    m.hp = 1;
    await importState(page, s);

    await expandTracker(page);
    const tracker = page.locator(".quest-tracker .quest-objective");
    await expect(tracker).toHaveAttribute("data-quest-progress", "0/5");

    // Hotbar mặc định của Đường Môn: Thiên Địa Vô Cực (thunder).
    await page
      .getByRole("button", { name: "Thiên Địa Vô Cực", exact: true })
      .click();

    // Thông báo nổi dạng "Sơn tặc 1/5".
    await expect(page.locator(".toast", { hasText: "Sơn tặc 1/5" })).toHaveCount(1, {
      timeout: 15000,
    });
    // Dòng log hệ thống cũng ghi lại tiến độ.
    await expect(page.locator(".console-messages")).toContainText("Sơn tặc 1/5");

    // Khung theo dõi và panel Nhiệm vụ phải hiện cùng con số.
    await expect(tracker).toHaveAttribute("data-quest-progress", "1/5");
    await page.keyboard.press("j");
    const panelQuest = page
      .locator(".quest-detail")
      .filter({ hasText: "Bình yên thôn nhỏ" });
    await expect(panelQuest).toHaveAttribute("data-quest-progress", "1/5");
    await page.getByRole("button", { name: "Đóng cửa sổ" }).click();

    // Tiến độ phải được ghi vào bản lưu.
    const after = await saved(page);
    expect(after.quests.find((q) => q.id === "bandits")?.progress).toBe(1);
  });

  test("tiến độ giữ nguyên sau khi tải lại trang", async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await start(page);

    const s = createGame("Kiếm Khách", "wudang", "combat-browser", 71227);
    s.quests.push({
      id: "bandits",
      status: "active",
      progress: 2,
      completions: 0,
    });
    await importState(page, s);
    await expandTracker(page);
    const tracker = page.locator(".quest-tracker .quest-objective");
    await expect(tracker).toHaveAttribute("data-quest-progress", "2/5");

    const stored = await saved(page);
    expect(stored.quests.find((q) => q.id === "bandits")?.progress).toBe(2);

    await page.reload();
    await enterCharacter(page);
    await expect(page.locator(".world-viewport canvas")).toBeVisible();
    await expandTracker(page);
    await expect(
      page.locator(".quest-tracker .quest-objective"),
    ).toHaveAttribute("data-quest-progress", "2/5", { timeout: 20000 });
  });
});
