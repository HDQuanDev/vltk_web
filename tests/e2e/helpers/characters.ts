import { expect, type Page } from "@playwright/test";
export async function enterCharacter(page: Page) {
  await expect(page.locator(".character-lobby")).toBeVisible();
  const enter = page.getByRole("button", { name: "Vào game", exact: true });
  if (await enter.count()) await enter.click();
  else {
    await page
      .getByRole("textbox", { name: "Tên nhân vật", exact: true })
      .fill("Vô Danh");
    await page
      .getByRole("button", { name: "Tạo nhân vật và vào game", exact: true })
      .click();
  }
  await expect(page.locator(".world-viewport canvas")).toBeVisible();
}
