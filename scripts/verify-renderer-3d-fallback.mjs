// Kiểm chứng fallback: ép lỗi WebGL → game phải tự rơi về bản 2D kèm onError.
//
//   node scripts/verify-renderer-3d-fallback.mjs
//
// Cách ép lỗi: chặn `HTMLCanvasElement.prototype.getContext` cho "webgl" trước
// khi app khởi tạo, để `new THREE.WebGLRenderer()` ném lỗi.
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, writeFile } from "node:fs/promises";

const folder = "artifacts/renderer-3d/fallback";
await mkdir(folder, { recursive: true });

const app = await createServer({
  configFile: "apps/web/vite.config.ts",
  server: { port: 5288, strictPort: false },
});
await app.listen();
const base = app.resolvedUrls.local[0].replace(/\/$/, "");
const browser = await chromium.launch({
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
await context.addInitScript(() => {
  const key = "kiem-hiep-client-v1";
  let current = {};
  try {
    current = JSON.parse(localStorage.getItem(key) ?? "{}");
  } catch {
    current = {};
  }
  localStorage.setItem(
    key,
    JSON.stringify({ ...current, renderMode: "3d" }),
  );
  // Chặn WebGL: three sẽ ném lỗi khi dựng renderer.
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    if (String(type).includes("webgl")) {
      throw new Error("WebGL bị chặn (kiểm chứng fallback)");
    }
    return original.call(this, type, ...rest);
  };
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(base);
await page.locator(".character-lobby").waitFor();
await page
  .getByRole("textbox", { name: "Tên nhân vật", exact: true })
  .fill("Fallback 3D");
await page
  .getByRole("button", { name: "Tạo nhân vật và vào game", exact: true })
  .click();
await page.waitForTimeout(4000);
const result = await page.evaluate(() => ({
  // Bản 2D dùng canvas Phaser; bản 3D dùng canvas WebGL.
  canvases: document.querySelectorAll(".world-viewport canvas").length,
  errorText:
    document.querySelector(".boot-screen p")?.textContent ??
    document.querySelector(".boot-screen")?.textContent ??
    "",
  visible: !!document.querySelector(".world-viewport"),
  // Pref phải tự hạ về "2d" để lần bootGame kế tiếp không lặp lại lỗi 3D.
  renderMode: JSON.parse(
    localStorage.getItem("kiem-hiep-client-v1") ?? "{}",
  ).renderMode,
}));
await page.screenshot({ path: `${folder}/01-fallback.png` });
const report = { result, errors };
await writeFile(`${folder}/report.json`, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
await browser.close();
await app.close();
