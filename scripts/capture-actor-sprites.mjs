// Ảnh chụp sprite nhân vật: lưới inspector cho 21 bộ + cảnh in-game 2 phái/giới
// (save tổng hợp nhập qua UI thật, không có hook debug).
//
// Phần A/B: mỗi nhân vật được chụp hai lần trong hai context riêng — lần đầu tải
// sprite PNG, lần sau chặn 404 toàn bộ `/assets/actors/` để buộc vẽ thủ tục. Vùng
// quanh nhân vật phải khác rõ rệt, nếu không thì ảnh chỉ được tải mà không vẽ.
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
const folder = process.env.ACTOR_DIR ?? "artifacts/actor-sprites";
await mkdir(folder, { recursive: true });
const ssr = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: "custom",
});
const { createGame } = await ssr.ssrLoadModule(
  "/packages/game-core/src/index.ts",
);
const { actorSpriteManifest } = await ssr.ssrLoadModule(
  "/packages/game-content/src/index.ts",
);
const { validateSave } = await ssr.ssrLoadModule(
  "/packages/game-storage/src/index.ts",
);
// Hai nhân vật khác phái và khác giới tính, cùng seed để so sánh được.
const fixtures = [
  {
    key: "wudang-male",
    state: createGame("Vân Du", "wudang", "actor-m", 71227, "male"),
  },
  {
    key: "emei-female",
    state: createGame("Bạch Vân", "emei", "actor-f", 71227, "female"),
  },
];
for (const { state } of fixtures) validateSave(state);
await ssr.close();
const app = await createServer({
  configFile: "apps/web/vite.config.ts",
  server: { port: 5205, strictPort: false },
});
await app.listen();
const base = app.resolvedUrls.local[0].replace(/\/$/, "");
const browser = await chromium.launch({ headless: true });
const errors = [];
const assets = new Map();
const ingame = new Set();
let phase = "inspector";
const screens = [];
const inspector = [];
const owners = Object.values(actorSpriteManifest.sets).flatMap((g) =>
  Object.values(g),
);
/** Mở game trong một context sạch rồi nhập save tổng hợp qua UI. */
async function openGame({ blockActors = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    const url = r.url();
    if (url.includes("/assets/actors/")) {
      const path = url.replace(base, "");
      // Lượt bị chặn 404 là cố ý: không tính vào danh sách file lỗi.
      if (blockActors) return;
      assets.set(path, r.status());
      if (phase === "ingame") ingame.add(path);
    } else if (r.status() >= 400) errors.push(`${r.status()} ${url}`);
  });
  if (blockActors)
    await page.route("**/assets/actors/**", (route) =>
      route.fulfill({ status: 404, body: "" }),
    );
  await page.goto(base);
  await page
    .getByRole("textbox", { name: "Tên nhân vật", exact: true })
    .fill("Khách");
  await page
    .getByRole("button", { name: "Tạo nhân vật và vào game", exact: true })
    .click();
  await page.locator(".world-viewport canvas").waitFor();
  await page.waitForTimeout(1500);
  return { context, page };
}
async function importSave(page, state) {
  await page.locator('input[type="file"]').setInputFiles({
    name: "actor-fixture.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(state)),
  });
  await page
    .getByRole("button", { name: "Xác nhận nhập", exact: true })
    .click();
  await page
    .locator(".import-confirm")
    .waitFor({ state: "hidden" })
    .catch(async () => {
      throw new Error(await page.locator(".toast").innerText());
    });
  await page.locator(".world-viewport canvas").waitFor();
  await page.waitForTimeout(900);
}
const crops = [
  { label: "player", x: 683, y: 384, w: 130, h: 180 },
  { label: "control-tr", x: 1283, y: 54, w: 80, h: 80 },
  { label: "control-bl", x: 83, y: 714, w: 80, h: 80 },
];
/** Đếm pixel khác nhau giữa ảnh có sprite và ảnh bị chặn 404, theo vùng. */
function diffShots(page, spriteShot, fallbackShot) {
  return page.evaluate(
    async ({ a, b, crops }) => {
      const load = (src) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = src;
        });
      const [first, second] = await Promise.all([
        load("data:image/png;base64," + a),
        load("data:image/png;base64," + b),
      ]);
      const context = document.createElement("canvas").getContext("2d");
      context.canvas.width = first.width;
      context.canvas.height = first.height;
      const pixels = (image) => {
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        context.drawImage(image, 0, 0);
        return context.getImageData(
          0,
          0,
          context.canvas.width,
          context.canvas.height,
        ).data;
      };
      const left = pixels(first),
        right = pixels(second);
      return crops.map((crop) => {
        let differing = 0,
          total = 0;
        for (
          let y = Math.max(0, crop.y - crop.h);
          y < Math.min(context.canvas.height, crop.y + crop.h);
          y += 2
        )
          for (
            let x = Math.max(0, crop.x - crop.w);
            x < Math.min(context.canvas.width, crop.x + crop.w);
            x += 2
          ) {
            const i = (y * context.canvas.width + x) * 4;
            total++;
            if (
              Math.abs(left[i] - right[i]) +
                Math.abs(left[i + 1] - right[i + 1]) +
                Math.abs(left[i + 2] - right[i + 2]) >
              24
            )
              differing++;
          }
        return {
          label: crop.label,
          differing,
          total,
          ratio: Number((differing / Math.max(1, total)).toFixed(3)),
        };
      });
    },
    {
      a: spriteShot.toString("base64"),
      b: fallbackShot.toString("base64"),
      crops,
    },
  );
}
const diffs = [];
try {
  // 1) Inspector: 21 bộ × 13 state × 3 hướng.
  {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(25000);
    page.on("pageerror", (e) => errors.push(e.message));
    for (const owner of owners) {
      await page.goto(`${base}/actor-inspector.html?set=${owner}`);
      await page.waitForFunction(
        () => document.getElementById("status")?.dataset.ready === "52",
        null,
        { timeout: 25000 },
      );
      const missing = await page.evaluate(() =>
        Number(document.getElementById("status")?.dataset.missing),
      );
      await page.screenshot({
        path: `${folder}/inspector-${owner.replace("/", "-")}.png`,
        fullPage: true,
      });
      inspector.push({ owner, ready: 52, missing });
    }
    await context.close();
  }
  // 2) In-game: 2 nhân vật khác phái/giới + A/B với fallback thủ tục.
  phase = "ingame";
  for (const { key, state } of fixtures) {
    const { context, page } = await openGame();
    await importSave(page, state);
    const shot = await page.locator(".world-viewport canvas").screenshot();
    await writeFile(`${folder}/canvas-${key}.png`, shot);
    await page.screenshot({ path: `${folder}/ingame-${key}.png` });
    screens.push(`ingame-${key}`);
    // Đi bộ + đánh để chắc chắn runtime đổi khung theo trạng thái.
    await page.keyboard.down("d");
    await page.waitForTimeout(700);
    await page.keyboard.up("d");
    await page.keyboard.press("Space");
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${folder}/ingame-${key}-move.png` });
    screens.push(`ingame-${key}-move`);
    await context.close();
    const fallback = await openGame({ blockActors: true });
    await importSave(fallback.page, state);
    const fallbackShot = await fallback.page
      .locator(".world-viewport canvas")
      .screenshot();
    await writeFile(`${folder}/canvas-${key}-fallback.png`, fallbackShot);
    diffs.push(...(await diffShots(fallback.page, shot, fallbackShot)));
    await fallback.context.close();
  }
  const report = {
    base,
    viewport: [1366, 768],
    inspector,
    screens,
    diffs,
    actorAssetRequests: assets.size,
    ingameAssetRequests: [...ingame].sort(),
    errors,
    note: "Inspector: 21 bộ × 13 state × 3 hướng (+ cột trái lật). In-game: 2 save tổng hợp (wudang/male, emei/female) nhập qua UI thật trong context riêng; A/B so vùng quanh nhân vật với lượt chặn 404 để chứng minh sprite PNG được vẽ.",
  };
  await writeFile(
    `${folder}/capture-report.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  if (inspector.some((r) => r.missing !== 0))
    throw new Error("Inspector thiếu ảnh sprite nhân vật");
  const bad = [...assets].filter(([, status]) => status >= 400);
  if (bad.length)
    throw new Error("File sprite nhân vật lỗi: " + bad.join(", "));
  const inGame = [...ingame];
  for (const [key, prefix] of [
    ["wudang-male", "/assets/actors/wudang/male/"],
    ["emei-female", "/assets/actors/emei/female/"],
  ])
    if (!inGame.some((p) => p.startsWith(prefix)))
      throw new Error(`Trong game không tải sprite ${key}`);
  // Bắt buộc: runtime đổi khung theo hướng đi (stand + walk) cho cả hai bộ.
  for (const pattern of [/\/stand\.png$/, /\/walk-[12]\.png$/])
    if (!inGame.some((p) => pattern.test(p)))
      throw new Error("Trong game không đổi khung theo trạng thái: " + pattern);
  for (const prefix of [
    "/assets/actors/wudang/male/sprites/",
    "/assets/actors/emei/female/sprites/",
  ])
    if (!inGame.some((p) => p.startsWith(prefix)))
      throw new Error("Thiếu khung đã tải cho bộ " + prefix);
  const weak = diffs.filter((d) => d.label === "player" && d.differing < 250);
  if (weak.length)
    throw new Error(
      "Vùng nhân vật không khác fallback (sprite có thể chưa được vẽ): " +
        weak.map((d) => `${d.label}=${d.differing}`).join(", "),
    );
  if (errors.length) throw new Error("Lỗi trang:\n" + errors.join("\n"));
  console.log(
    JSON.stringify({
      screens,
      inspectorSets: inspector.length,
      actorAssetRequests: assets.size,
      ingameAssetRequests: inGame.length,
      diffs,
      errors: errors.length,
    }),
  );
} finally {
  await browser.close();
  await app.close();
}
