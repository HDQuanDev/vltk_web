import { test, expect, type Page } from "@playwright/test";
import { enterCharacter } from "./helpers/characters";

async function start(page: Page) {
  await page.goto("/");
  await enterCharacter(page);
  await expect(page.locator(".world-viewport canvas")).toBeVisible();
}

test.describe("HUD Rework & Functional Accessibility", () => {
  for (const viewport of [
    { width: 1720, height: 860, name: "desktop-wide" },
    { width: 1366, height: 768, name: "desktop-laptop" },
    { width: 1024, height: 768, name: "tablet" },
    { width: 844, height: 390, name: "mobile-landscape" },
    { width: 390, height: 844, name: "mobile-portrait" },
  ]) {
    test(`HUD quick access and menu layout at ${viewport.width}×${viewport.height} (${viewport.name})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await start(page);

      // 1. Verify Player HUD is visible
      const playerHud = page.locator(".player-hud");
      await expect(playerHud).toBeVisible();

      // 2. Verify Minimap is visible
      const minimap = page.locator(".minimap-panel");
      await expect(minimap).toBeVisible();

      // 3. Verify HUD Quick Access toolbar is present
      const quickToolbar = page.locator(".hud-quick-access");
      await expect(quickToolbar).toBeVisible();

      // If mobile portrait or collapsed, expand if needed
      const quickToggle = page.locator(".hud-quick-toggle");
      if ((await quickToggle.isVisible()) && (await quickToolbar.evaluate((el) => el.classList.contains("collapsed")))) {
        await quickToggle.click();
      }

      // 4. Verify all 6 Quick Access buttons exist
      const quickActions = [
        { key: "character", label: "Nhân vật", dialogName: "Nhân vật" },
        { key: "inventory", label: "Hành trang", dialogName: "Hành trang" },
        { key: "skills", label: "Võ học", dialogName: "Võ học" },
        { key: "quests", label: "Nhiệm vụ", dialogName: "Nhiệm vụ" },
        { key: "map", label: "Bản đồ", dialogName: "Bản đồ thế giới" },
        { key: "warehouse", label: "Kho đồ", dialogName: "Kho đồ" },
      ];

      for (const action of quickActions) {
        const btn = page.locator(`[data-quick-action="${action.key}"]`);
        await expect(btn).toBeVisible();
      }

      // Capture screenshot of normal gameplay HUD
      await page.screenshot({
        path: `artifacts/hud-review/${viewport.name}-normal.png`,
      });

      // 5. Test Quick Access button interaction: open Hành trang directly
      const invBtn = page.locator('[data-quick-action="inventory"]');
      await invBtn.click();
      await expect(page.getByRole("dialog", { name: "Hành trang" })).toBeVisible();
      await expect(invBtn).toHaveClass(/active/);

      // Close dialog
      await page.getByRole("button", { name: "Đóng cửa sổ" }).click();
      await expect(page.getByRole("dialog", { name: "Hành trang" })).toHaveCount(0);
      await expect(invBtn).not.toHaveClass(/active/);

      // 6. Test Quick Access button interaction: open Võ học directly
      const skillsBtn = page.locator('[data-quick-action="skills"]');
      await skillsBtn.click();
      await expect(page.getByRole("dialog", { name: "Võ học" })).toBeVisible();
      await expect(skillsBtn).toHaveClass(/active/);
      await page.getByRole("button", { name: "Đóng cửa sổ" }).click();
      await expect(page.getByRole("dialog", { name: "Võ học" })).toHaveCount(0);

      // 7. Open 3-bar menu (Menu ba gạch)
      const menuBtn = page.getByRole("button", { name: "Mở menu", exact: true });
      await menuBtn.click();
      const menu = page.locator(".mobile-menu");
      await expect(menu).toBeVisible();

      // Verify all 4 required groups exist
      await expect(menu.locator('.menu-group[aria-label="Nhân vật và vật phẩm"]')).toBeVisible();
      await expect(menu.locator('.menu-group[aria-label="Chiến đấu và phát triển"]')).toBeVisible();
      await expect(menu.locator('.menu-group[aria-label="Khám phá và thông tin"]')).toBeVisible();
      await expect(menu.locator('.menu-group[aria-label="Hệ thống"]')).toBeVisible();

      // Check group titles
      await expect(menu.getByText("Nhân vật & Vật phẩm")).toBeVisible();
      await expect(menu.getByText("Chiến đấu & Phát triển")).toBeVisible();
      await expect(menu.getByText("Khám phá & Thông tin")).toBeVisible();
      await expect(menu.getByText("Hệ thống")).toBeVisible();

      // 8. CRITICAL: Check that menu does NOT overlap the minimap
      const menuBox = await menu.boundingBox();
      const minimapBox = await minimap.boundingBox();
      expect(menuBox).not.toBeNull();
      expect(minimapBox).not.toBeNull();

      if (menuBox && minimapBox) {
        // Either menu is to the left of minimap OR below minimap
        const toTheLeft = menuBox.x + menuBox.width <= minimapBox.x + 2;
        const below = menuBox.y >= minimapBox.y + minimapBox.height - 2;
        expect(
          toTheLeft || below,
          `Menu (x:${menuBox.x}, y:${menuBox.y}, w:${menuBox.width}, h:${menuBox.height}) must not cover minimap (x:${minimapBox.x}, y:${minimapBox.y}, w:${minimapBox.width}, h:${minimapBox.height})`,
        ).toBe(true);
      }

      // Capture screenshot of opened menu
      await page.screenshot({
        path: `artifacts/hud-review/${viewport.name}-menu-open.png`,
      });

      // 9. Verify clicking an item inside menu opens the dialog and closes menu
      await menu.getByRole("button", { name: "Công xưởng", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "Công xưởng" })).toBeVisible();
      await expect(menu).toHaveCount(0);
      await page.getByRole("button", { name: "Đóng cửa sổ" }).click();
    });
  }
});
