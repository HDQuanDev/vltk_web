// Kiểm chứng bộ hiển thị 3D (Three.js) chạy song song với bản Phaser 2D.
//
//   MODE=3d|2d node scripts/verify-renderer-3d.mjs
//
// - Mở game bằng pref `renderMode` ("3d" hoặc "2d").
// - Chụp ảnh khung hình, đọc diagnostics (fps, objects, textures, chunks).
// - Đo draw calls / triangle / texture của cảnh làng (CHƯA dựng cảnh ≥15 quái + 5 NPC).
// - Đổi map qua cổng 2 vòng để kiểm tra rò bộ nhớ texture.
// Ảnh + số đo ghi vào artifacts/renderer-3d/<mode>/.
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, writeFile } from "node:fs/promises";

const mode = process.env.MODE ?? "3d";
const folder = `artifacts/renderer-3d/${mode}`;
await mkdir(folder, { recursive: true });

// Bản điện thoại tầm trung: viewport nhỏ + DPR 2 + 4 CPU chậm.
const mobile = process.env.MOBILE === "1";
const viewport = mobile ? { width: 844, height: 390 } : { width: 1366, height: 768 };

const app = await createServer({
  configFile: "apps/web/vite.config.ts",
  server: { port: 5255, strictPort: false },
});
await app.listen();
const base = app.resolvedUrls.local[0].replace(/\/$/, "");

const browser = await chromium.launch({
  headless: true,
  args: [
    "--enable-unsafe-swiftshader",
    ...(mobile ? ["--disable-gpu-vsync"] : []),
  ],
});
const errors = [];
const report = { mode, mobile, errors, steps: {} };

const open = async (prefs) => {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
  });
  await context.addInitScript((patch) => {
    const key = "kiem-hiep-client-v1";
    let current = {};
    try {
      current = JSON.parse(localStorage.getItem(key) ?? "{}");
    } catch {
      current = {};
    }
    localStorage.setItem(key, JSON.stringify({ ...current, ...patch }));
  }, prefs);
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  return { context, page };
};

const enter = async (page, name) => {
  await page.goto(base);
  await page.locator(".character-lobby").waitFor();
  await page
    .getByRole("textbox", { name: "Tên nhân vật", exact: true })
    .fill(name);
  await page
    .getByRole("button", { name: "Tạo nhân vật và vào game", exact: true })
    .click();
  await page.locator(".world-viewport canvas").waitFor();
  await page.waitForTimeout(2000);
};

const openSettings = async (page) => {
  // Đóng mọi modal đang mở (hội thoại NPC chặn nút HUD).
  const backdrop = page.locator(".modal-backdrop");
  if (await backdrop.count()) {
    const close = page
      .getByRole("button", { name: "Đóng cửa sổ", exact: true })
      .first();
    if (await close.count()) await close.click();
    else await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }
  await page.getByRole("button", { name: "Thiết lập", exact: true }).first().click();
};
const closePanel = async (page) => {
  const button = page.getByRole("button", {
    name: "Đóng cửa sổ",
    exact: true,
  });
  if (await button.count()) await button.click();
};

const readDiagnostics = async (page) => {
  // Dòng chẩn đoán nằm cuối panel Thiết lập → đọc toàn bộ panel rồi tìm dòng.
  const text = await page.evaluate(() => {
    const p = document.querySelector(".game-panel");
    return p ? p.textContent ?? "" : "";
  });
  const row = text.split("\n").find((l) => l.includes("FPS")) ?? text;
  return {
    text: row,
    fps: Number(/([\d.]+) FPS/.exec(row)?.[1] ?? NaN),
    renderMs: Number(/CPU render ([\d.]+)ms/.exec(row)?.[1] ?? NaN),
    objects: Number(/(\d+) objects/.exec(row)?.[1] ?? NaN),
    textures: Number(/(\d+) textures/.exec(row)?.[1] ?? NaN),
    renderer: /· (WebGL|Canvas|ThreeJS) ·/.exec(row)?.[1] ?? "",
    chunks: /(\d+)\/(\d+) chunks/.exec(row)?.slice(1, 3) ?? [],
    terrainMiB: Number(/terrain CPU ([\d.]+) MiB/.exec(row)?.[1] ?? 0),
    vfx: Number(/(\d+) VFX/.exec(row)?.[1] ?? 0),
  };
};

/** Số draw call của renderer WebGL (chỉ có ở bản 3D). */
const readDrawCalls = (page) =>
  page.evaluate(() => {
    const canvas = document.querySelector(".world-viewport canvas");
    if (!canvas) return null;
    // three giữ renderer trong closure; đo gián tiếp qua WebGL info hook toàn cục
    return window.__threeRendererInfo?.() ?? null;
  });

try {
  const { context, page } = await open({
    renderMode: mode,
    quality: mobile ? "medium" : "high",
  });
  try {
    await enter(page, `Kiem 3D ${mode}`);
    await page.waitForTimeout(2500);
    // Bản 2D không cần ảnh (repo đã có ảnh 2D ở `artifacts/`); bản 3D thì có.
    if (mode === "3d")
      await page.screenshot({ path: `${folder}/01-village.png` });
    await openSettings(page);
    await page.waitForTimeout(1200);
    const first = await readDiagnostics(page);
    await closePanel(page);
    report.steps.village = first;

    // Chụp lại sau khi atlas nạp xong.
    await page.waitForTimeout(4000);
    if (mode === "3d")
      await page.screenshot({ path: `${folder}/02-village-atlas.png` });
    await openSettings(page);
    await page.waitForTimeout(1200);
    report.steps.villageAtlas = await readDiagnostics(page);
    await closePanel(page);

    // Đo trong 5 giây.
    await openSettings(page);
    const samples = [];
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(1000);
      samples.push(await readDiagnostics(page));
    }
    await closePanel(page);
    const ok = samples.filter((s) => Number.isFinite(s.fps));
    report.steps.perf = {
      samples: ok.length,
      fpsAvg: +(
        ok.reduce((a, b) => a + b.fps, 0) / Math.max(1, ok.length)
      ).toFixed(2),
      renderMsAvg: +(
        ok.reduce((a, b) => a + b.renderMs, 0) / Math.max(1, ok.length)
      ).toFixed(3),
    };
    report.steps.drawCalls = await readDrawCalls(page);

    // Đổi map qua cổng để kiểm tra rò bộ nhớ texture.
    const textureCounts = [];
    for (let round = 0; round < 4; round++) {
      const target = round % 2 === 0 ? "Thanh Trúc Lâm" : "Tân Thủ Thôn";
      await page.keyboard.press("m");
      const row = page
        .locator(".destination-row", { hasText: target })
        .first();
      if (await row.count()) await row.click();
      await page.waitForTimeout(3500);
      // Chỉ chụp ảnh đầu vòng đổi map (ảnh các vòng sau tốn dung lượng mà
      // không thêm thông tin so với báo cáo số đo).
      if (round === 0) await page.screenshot({ path: `${folder}/10-map-0.png` });
      await openSettings(page);
      await page.waitForTimeout(1000);
      const row2 = await readDiagnostics(page);
      const gpu = await page.evaluate(() => window.__threeRendererInfo?.() ?? null);
      await closePanel(page);
      textureCounts.push({
        round,
        textures: row2.textures,
        gpuTextures: gpu?.textures ?? null,
        geometries: gpu?.geometries ?? null,
        objects: row2.objects,
        chunks: row2.chunks,
        terrainMiB: row2.terrainMiB,
      });
    }
    report.steps.mapChange = textureCounts;
  } finally {
    await context.close();
  }
} finally {
  await browser.close();
  await app.close();
}

await writeFile(
  `${folder}/report.json`,
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
