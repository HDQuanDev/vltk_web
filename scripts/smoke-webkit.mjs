import { webkit } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.VISUAL_URL ?? "http://localhost:4175";
await mkdir("artifacts/visual-after/webkit", { recursive: true });
const browser = await webkit.launch({ headless: true }),
  report = [];
for (const [width, height] of [
  [1366, 768],
  [844, 390],
]) {
  const context = await browser.newContext({ viewport: { width, height } }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page
    .getByRole("textbox", { name: "Tên nhân vật", exact: true })
    .fill("WebKit Hiệp Khách");
  await page.screenshot({
    path: `artifacts/visual-after/webkit/creation-${width}.png`,
  });
  await page
    .getByRole("button", { name: "Tạo nhân vật và vào game", exact: true })
    .click();
  await page.locator(".world-viewport canvas").waitFor();
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: `artifacts/visual-after/webkit/hud-${width}.png`,
  });
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await page
    .locator(".mobile-menu")
    .getByRole("button", { name: "Hành trang", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Đạo Bào Thanh Vân", exact: true })
    .click();
  await page
    .locator(".item-details")
    .getByRole("button", { name: "Trang bị", exact: true })
    .click();
  await page.screenshot({
    path: `artifacts/visual-after/webkit/inventory-${width}.png`,
  });
  await page.getByRole("button", { name: "Đóng cửa sổ", exact: true }).click();
  await page.locator(".save-state").click();
  await page.waitForFunction(() =>
    document.querySelector(".save-state")?.textContent.includes("Đã lưu"),
  );
  await page.reload();
  await page.getByRole("button", { name: "Vào game", exact: true }).click();
  await page.locator(".world-viewport canvas").waitFor();
  report.push({
    width,
    height,
    errors,
    engine: "Playwright WebKit, not Safari or a real device",
    overflow: await page.evaluate(
      () =>
        document.documentElement.scrollWidth > innerWidth ||
        document.documentElement.scrollHeight > innerHeight,
    ),
    saveReload: true,
  });
  await context.close();
}
await browser.close();
await writeFile(
  "artifacts/visual-after/webkit/report.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report));
