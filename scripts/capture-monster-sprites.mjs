// Ảnh chụp sprite quái: lưới inspector + cảnh in-game từ save tổng hợp nhập qua
// UI thật. Không thêm hook debug nào vào runtime.
//
// Phần A/B: cùng một save được chụp hai lần — lần đầu tải sprite PNG bình thường,
// lần sau chặn 404 toàn bộ `/assets/monsters/` để buộc fallback vẽ thủ tục. Nếu
// vùng của từng quái khác nhau rõ rệt thì art PNG thật sự được vẽ trong game,
// không chỉ được tải về.
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
const folder = process.env.MONSTER_DIR ?? "artifacts/monster-sprites";
await mkdir(folder, { recursive: true });
const ssr = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: "custom",
});
const { createGame, spawnMonster, screenToWorld } = await ssr.ssrLoadModule(
  "/packages/game-core/src/index.ts",
);
const { monsterSpriteManifest } = await ssr.ssrLoadModule(
  "/packages/game-content/src/index.ts",
);
const { validateSave } = await ssr.ssrLoadModule(
  "/packages/game-storage/src/index.ts",
);
const state = createGame(
  "Lãng Khách Vân Du",
  "wudang",
  "monster-sprite",
  71227,
);
const player = state.entities[state.playerId];
// Toạ độ đặt quái tính theo px màn hình quanh người chơi để đủ 3 hướng nhìn.
const placements = [
  ["bandit", 0, 200],
  ["wolf", -380, 120],
  ["venom-moth", -160, -260],
  ["boss", 380, -200],
  ["cloud-beast", 300, 330],
];
for (const [id, x, y] of placements) {
  const d = screenToWorld({ x, y });
  spawnMonster(state, id, player.mapId, player.x + d.x, player.y + d.y);
}
// Quái yếu ngay cạnh để chụp khung chết; save tổng hợp, không phải gameplay.
const weak = spawnMonster(
  state,
  "bandit",
  player.mapId,
  player.x + 1.1,
  player.y + 0.6,
);
weak.hp = 1;
weak.maxHp = 1;
validateSave(state);
await ssr.close();
const app = await createServer({
  configFile: "apps/web/vite.config.ts",
  server: { port: 5199, strictPort: false },
});
await app.listen();
const base = app.resolvedUrls.local[0].replace(/\/$/, "");
const browser = await chromium.launch({ headless: true });
const errors = [];
const monsterAssets = new Map();
// Request phát sinh khi đang ở trong game: chỉ đường sprite mới gọi tới các file
// này, nên đây là bằng chứng runtime dùng PNG cho từng trạng thái.
const ingameAssets = new Set();
let phase = "inspector";
const screens = [];
const inspector = [];
// Vùng so sánh A/B tính trên ảnh canvas (không có HUD): mỗi quái một vùng, cộng
// 4 vùng đối chứng xa quái để loại trừ nhiễu toàn ảnh.
const cropSize = (id) =>
  id === "boss" || id === "cloud-beast"
    ? { w: 150, h: 190 }
    : { w: 120, h: 150 };
const crops = [
  ...placements.map(([id, x, y]) => ({
    monster: id,
    x: 683 + x,
    y: 384 + y,
    ...cropSize(id),
  })),
  { monster: "control-tr", x: 1283, y: 54, w: 90, h: 90 },
  { monster: "control-tl", x: 83, y: 54, w: 90, h: 90 },
  { monster: "control-br", x: 1283, y: 714, w: 90, h: 90 },
  { monster: "control-bl", x: 83, y: 714, w: 90, h: 90 },
];
async function enterGame(page) {
  await page.goto(base);
  await page
    .getByRole("textbox", { name: "Tên nhân vật", exact: true })
    .fill("Lãng Khách");
  await page
    .getByRole("button", { name: "Tạo nhân vật và vào game", exact: true })
    .click();
  await page.locator(".world-viewport canvas").waitFor();
  await page.waitForTimeout(1500);
  await page.locator('input[type="file"]').setInputFiles({
    name: "monster-fixture.json",
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
}
try {
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
  });
  page.setDefaultTimeout(20000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    const url = r.url();
    if (url.includes("/assets/monsters/")) {
      const path = url.replace(base, "");
      monsterAssets.set(path, r.status());
      if (phase === "ingame") ingameAssets.add(path);
    } else if (r.status() >= 400) errors.push(`${r.status()} ${url}`);
  });
  for (const id of monsterSpriteManifest.monsters) {
    await page.goto(`${base}/monster-inspector.html?monster=${id}`);
    await page.waitForFunction(
      () => document.getElementById("status")?.dataset.ready === "52",
      null,
      { timeout: 25000 },
    );
    const missing = await page.evaluate(() =>
      Number(document.getElementById("status")?.dataset.missing),
    );
    await page.screenshot({
      path: `${folder}/inspector-${id}.png`,
      fullPage: true,
    });
    inspector.push({ id, ready: 52, missing });
  }
  phase = "ingame";
  await enterGame(page);
  const shot = async (name) => {
    await page.waitForTimeout(180);
    await page.screenshot({ path: `${folder}/${name}.png` });
    screens.push(name);
  };
  // Ngay sau import: quái còn đứng yên ngoài tầm phát hiện. So sánh A/B dùng
  // ảnh canvas (không HUD) để nhiễu chỉ còn phần thế giới.
  await page.waitForTimeout(700);
  const spriteShot = await page.locator(".world-viewport canvas").screenshot();
  await writeFile(`${folder}/canvas-sprite.png`, spriteShot);
  await page.screenshot({ path: `${folder}/ingame-spawn.png` });
  screens.push("ingame-spawn");
  // Áp sát để quái đuổi theo (walk/run) và tung đòn (attack/cast/hit).
  await page.keyboard.down("d");
  await page.waitForTimeout(1100);
  await page.keyboard.up("d");
  await page.waitForTimeout(300);
  await shot("ingame-chase");
  await page.waitForTimeout(2200);
  await shot("ingame-combat");
  // Đánh quái yếu cạnh bên để chụp khung chết.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Space");
    await page.waitForTimeout(450);
  }
  await shot("ingame-dead");
  // Lượt B: chặn 404 sprite quái để buộc fallback vẽ thủ tục.
  const fallbackPage = await browser.newPage({
    viewport: { width: 1366, height: 768 },
  });
  fallbackPage.setDefaultTimeout(20000);
  fallbackPage.on("pageerror", (e) => errors.push(e.message));
  await fallbackPage.route("**/assets/monsters/**", (route) =>
    route.fulfill({ status: 404, body: "" }),
  );
  await enterGame(fallbackPage);
  await fallbackPage.waitForTimeout(700);
  const fallbackShot = await fallbackPage
    .locator(".world-viewport canvas")
    .screenshot({ path: `${folder}/ingame-fallback.png` });
  screens.push("ingame-fallback");
  const abDiff = await page.evaluate(
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
      const canvas = document.createElement("canvas");
      canvas.width = first.width;
      canvas.height = first.height;
      const context = canvas.getContext("2d");
      const pixels = (image) => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, canvas.width, canvas.height).data;
      };
      const left = pixels(first),
        right = pixels(second);
      return crops.map((crop) => {
        let differing = 0,
          total = 0;
        for (
          let y = Math.max(0, crop.y - crop.h);
          y < Math.min(canvas.height, crop.y + crop.h);
          y += 2
        )
          for (
            let x = Math.max(0, crop.x - crop.w);
            x < Math.min(canvas.width, crop.x + crop.w);
            x += 2
          ) {
            const i = (y * canvas.width + x) * 4;
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
          monster: crop.monster,
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
  await fallbackPage.close();
  const report = {
    base,
    viewport: [1366, 768],
    inspector,
    screens,
    monsterAssetRequests: monsterAssets.size,
    ingameAssetRequests: [...ingameAssets].sort(),
    abDiff,
    errors,
    note: "Ô inspector là toàn bộ 13 state × 3 hướng (+ cột trái lật). Ảnh in-game dùng save tổng hợp (5 quái + 1 quái yếu HP=1) nhập qua UI thật; không phải progression. abDiff = tỉ lệ pixel khác nhau trong vùng từng quái giữa lượt có sprite PNG và lượt bị chặn 404 (buộc vẽ thủ tục).",
  };
  await writeFile(
    `${folder}/capture-report.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  if (inspector.some((r) => r.missing !== 0))
    throw new Error("Inspector thiếu ảnh sprite");
  // 304 là hợp lệ (ảnh đã cache), chỉ >= 400 mới là thiếu/lỗi file.
  const bad = [...monsterAssets].filter(([, status]) => status >= 400);
  if (bad.length) throw new Error("File sprite quái lỗi: " + bad.join(", "));
  if (!monsterAssets.size) throw new Error("Không có request sprite quái nào");
  const inGame = [...ingameAssets];
  for (const id of ["bandit", "wolf", "venom-moth", "boss", "cloud-beast"])
    if (!inGame.some((p) => p.startsWith(`/assets/monsters/${id}/`)))
      throw new Error(`Trong game không tải sprite của ${id}`);
  for (const pattern of [
    /(walk|run)-[12]\.png$/,
    /(attack|cast|hit|die)\.png$/,
  ])
    if (!inGame.some((p) => pattern.test(p)))
      throw new Error("Trong game không đổi khung theo trạng thái: " + pattern);
  // A/B: mỗi vùng quái phải có hàng trăm pixel khác fallback thủ tục; nếu sprite
  // chỉ được tải mà không vẽ thì vùng đó gần như trùng nhau (như vùng đối chứng).
  const controls = abDiff.filter((r) => r.monster.startsWith("control-"));
  const noise = Math.max(...controls.map((r) => r.differing));
  const weakCrops = abDiff.filter(
    (r) => !r.monster.startsWith("control-") && r.differing < 250,
  );
  if (weakCrops.length)
    throw new Error(
      `Vùng quái không khác biệt so với fallback (nhiễu nền ${noise} px): ` +
        weakCrops.map((r) => `${r.monster}=${r.differing}`).join(", "),
    );
  if (errors.length) throw new Error("Lỗi trang:\n" + errors.join("\n"));
  console.log(
    JSON.stringify({
      screens,
      inspectorSets: inspector.length,
      monsterAssetRequests: monsterAssets.size,
      ingameAssetRequests: inGame.length,
      abDiff,
      errors: errors.length,
    }),
  );
} finally {
  await browser.close();
  await app.close();
}
