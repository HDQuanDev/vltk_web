// Ảnh kiểm tra bộ art giao diện + môi trường sau khi thay (Bước 5 của brief).
// Dùng save tổng hợp nhập qua UI thật; không thêm hook debug.
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, readdir, writeFile } from "node:fs/promises";
const folder = process.env.ART_DIR ?? "artifacts/art-refresh";
await mkdir(folder, { recursive: true });
const ssr = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: "custom",
});
const { createGame, addItem } = await ssr.ssrLoadModule(
  "/packages/game-core/src/index.ts",
);
const { npcs } = await ssr.ssrLoadModule(
  "/packages/game-content/src/index.ts",
);
const { validateSave } = await ssr.ssrLoadModule(
  "/packages/game-storage/src/index.ts",
);
const state = createGame("Thợ Khách", "wudang", "art-refresh", 71227);
state.gold = 8000;
const merchant = npcs.find((n) => n.id === "merchant");
Object.assign(state.entities[state.playerId], {
  x: merchant.x,
  y: merchant.y,
});
for (const [id, n] of [
  ["ore", 12],
  ["wood", 12],
  ["herb", 6],
  ["jade-ore", 4],
  ["storm-iron", 4],
  ["cloud-silk", 3],
  ["beast-hide", 2],
  ["jade-gem", 2],
  ["amber-gem", 2],
  ["ward-stone", 2],
  ["enhance-stone", 2],
  ["hp", 5],
  ["mp", 5],
  ["elixir", 1],
  ["revive-pill", 1],
  ["sword", 1],
  ["robe", 1],
  ["boots", 1],
  ["jade-fan", 1],
  ["bamboo-hat", 1],
  ["jade-crown", 1],
  ["scale-mail", 1],
  ["cloud-blade", 1],
  ["dragon-seal", 1],
  ["jade-pendant", 1],
  ["cloud-ring", 1],
  ["wolf-fang", 1],
])
  addItem(state, id, n);
validateSave(state);
await ssr.close();
const app = await createServer({
  configFile: "apps/web/vite.config.ts",
  server: { port: 5241, strictPort: false },
});
await app.listen();
const base = app.resolvedUrls.local[0].replace(/\/$/, "");
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1366, height: 768 },
});
const page = await context.newPage();
page.setDefaultTimeout(20000);
const errors = [];
const loaded = new Map();
const shots = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  const url = r.url().replace(base, "");
  if (url.startsWith("/assets/interface/") || url.startsWith("/assets/overhaul/"))
    loaded.set(url, r.status());
  else if (r.status() >= 400) errors.push(`${r.status()} ${url}`);
});
const shot = async (name) => {
  await page.waitForTimeout(220);
  await page.screenshot({ path: `${folder}/${name}.png` });
  shots.push(name);
};
/** Đếm icon ảnh (painted) và icon SVG dự phòng đang hiển thị. */
const iconStats = () =>
  page.evaluate(() => ({
    painted: document.querySelectorAll("img.painted-icon").length,
    svgFallback: document.querySelectorAll("svg.art-icon").length,
    paintedSrcMissing: [...document.querySelectorAll("img.painted-icon")].filter(
      (i) => !i.getAttribute("src")?.startsWith("/assets/interface/"),
    ).length,
    broken: [...document.querySelectorAll("img.painted-icon")].filter(
      (i) => !i.complete || i.naturalWidth === 0,
    ).length,
  }));
const close = async () => {
  const button = page.getByRole("button", {
    name: "Đóng cửa sổ",
    exact: true,
  });
  if (await button.count()) await button.click();
};
const openPanel = async (key, label) => {
  await close();
  await page.keyboard.press(key);
  if (label) await page.waitForTimeout(150);
};
try {
  await page.goto(base);
  await page.waitForTimeout(2000);
  await shot("01-lobby");
  // Tên nhân vật tạo ban đầu phải khác tên trong fixture, nếu không import báo trùng.
  await page
    .getByRole("textbox", { name: "Tên nhân vật", exact: true })
    .fill("Khách");
  await page
    .getByRole("button", { name: "Tạo nhân vật và vào game", exact: true })
    .click();
  await page.locator(".world-viewport canvas").waitFor();
  await page.waitForTimeout(1500);
  await page.locator('input[type="file"]').setInputFiles({
    name: "art-fixture.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(state)),
  });
  await page.getByRole("button", { name: "Xác nhận nhập", exact: true }).click();
  // Chờ HUD đổi sang nhân vật của fixture thay vì chờ overlay import tự ẩn
  // (PWA dev có thể còn toast "Đang chuẩn bị cache").
  await page.waitForFunction(
    (name) =>
      document.querySelector(".player-name strong")?.textContent === name,
    state.name,
    { timeout: 20000 },
  );
  await page.locator(".world-viewport canvas").waitFor();
  await page.waitForTimeout(2500);
  await shot("02-world");
  const stats = {};
  // Hành trang: toàn bộ icon vật phẩm.
  await openPanel("i");
  await page.waitForTimeout(400);
  await shot("03-inventory");
  stats.inventory = await iconStats();
  const firstItem = page.locator(".inventory-grid button").first();
  if (await firstItem.count()) {
    await firstItem.hover();
    await page.waitForTimeout(200);
    await shot("04-item-tooltip");
  }
  // Shop qua hội thoại dược sư.
  await page
    .getByRole("button", { name: "Đến dược sư", exact: true })
    .click();
  await page.locator(".merchant-counter").waitFor();
  await shot("05-shop");
  stats.shop = await iconStats();
  stats.shopPortrait = await page
    .locator(".dialogue-scene img")
    .getAttribute("src");
  await close();
  // Công xưởng.
  await openPanel("i");
  await page.getByRole("button", { name: "Công xưởng", exact: true }).click();
  await page.waitForTimeout(400);
  await shot("06-workshop");
  stats.workshop = await iconStats();
  await close();
  // Kho đồ.
  await openPanel("i");
  await page.getByRole("button", { name: "Kho đồ", exact: true }).click();
  await page.waitForTimeout(400);
  await shot("07-storage");
  stats.storage = await iconStats();
  await close();
  // Võ học (SectSkills).
  await openPanel("k");
  await page.waitForTimeout(400);
  await shot("08-skills");
  stats.skills = await iconStats();
  await close();
  // Nhân vật / trang bị.
  await openPanel("c");
  await page.waitForTimeout(400);
  await shot("09-character");
  stats.character = await iconStats();
  await close();
  // Kiểm tra đủ file trên đĩa trả 200, kể cả icon chưa xuất hiện trong các màn này.
  const interfaceFiles = (
    await readdir("apps/web/public/assets/interface")
  ).filter((file) => file.endsWith(".png"));
  const environmentFiles = (
    await readdir("apps/web/public/assets/overhaul")
  ).filter((file) => file.endsWith(".png"));
  const notServed = [];
  for (const [dir, files] of [
    ["interface", interfaceFiles],
    ["overhaul", environmentFiles],
  ])
    for (const file of files) {
      const res = await page.request.get(`${base}/assets/${dir}/${file}`);
      if (res.status() !== 200) notServed.push(`${dir}/${file}=${res.status()}`);
    }
  if (notServed.length)
    throw new Error("File art không trả 200: " + notServed.join(", "));
  const report = {
    base,
    viewport: [1366, 768],
    shots,
    iconStats: stats,
    interfaceFiles,
    environmentFiles,
    interfaceAssetsLoaded: [...loaded].filter(([u]) => u.startsWith("/assets/interface/")),
    environmentAssetsLoaded: [...loaded].filter(([u]) => u.startsWith("/assets/overhaul/")),
    errors,
  };
  await writeFile(
    `${folder}/capture-report.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  const bad = [...loaded].filter(([, status]) => status >= 400);
  if (bad.length) throw new Error("Asset lỗi: " + bad.join(", "));
  const icons = interfaceFiles;
  for (const env of ["house", "tree", "cherry", "bamboo", "ground"])
    if (![...loaded.keys()].some((u) => u.includes(`${env}-v1.png`)))
      throw new Error("Chưa nạp art môi trường: " + env);
  const broken = Object.entries(stats).filter(
    ([, s]) => typeof s === "object" && "broken" in s && s.broken > 0,
  );
  if (broken.length)
    throw new Error(
      "Có icon không tải được trong UI: " +
        broken.map(([k, s]) => `${k}(${s.broken})`).join(", "),
    );
  const fallbackHeavy = Object.entries(stats).filter(
    ([, s]) => s.painted === 0 || s.svgFallback > s.painted,
  );
  if (fallbackHeavy.length)
    throw new Error(
      "Icon đang rơi về SVG dự phòng: " +
        fallbackHeavy.map(([k, s]) => `${k}(${s.painted}/${s.svgFallback})`).join(", "),
    );
  if (errors.length) throw new Error("Lỗi trang:\n" + errors.join("\n"));
  console.log(
    JSON.stringify({
      shots,
      interfaceFiles: icons.length,
      env: [...loaded.keys()].filter((u) => u.startsWith("/assets/overhaul/")),
      iconStats: stats,
      errors: errors.length,
    }),
  );
} finally {
  await browser.close();
  await app.close();
}
