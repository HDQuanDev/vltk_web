// Đo + chụp đối chiếu cho bộ hiệu ứng "giả 3D": chu kỳ ngày/đêm, đèn lồng,
// sương chiều sâu, tiền cảnh parallax, camera nhìn trước.
// Dùng save tổng hợp nhập qua UI thật (không thêm hook debug).
//
//   RUN=before|after PHASE=shots,perf,mapchange PREFS='{"depthFog":false}' \
//     node scripts/capture-daynight-effects.mjs
//
// Ảnh + số đo ghi vào artifacts/daynight-effects/<RUN>/<LABEL>/.
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";

const run = process.env.RUN ?? "after";
const label = process.env.LABEL ?? "default";
const phases = (process.env.PHASE ?? "shots,perf,mapchange").split(",");
const prefsPatch = JSON.parse(process.env.PREFS ?? "{}");
const folder = `artifacts/daynight-effects/${run}/${label}`;
await mkdir(folder, { recursive: true });

// Bốn mốc worldClock: day = (timeTicks % 24000) / 24000.
const ALL_TIMES = [
  ["01-midday", 6000],
  ["02-dusk", 12000],
  ["03-midnight", 18000],
  ["04-dawn", 24000],
];
// TIME=03-midnight để chỉ chụp một mốc (dùng khi kiểm tra từng công tắc).
const TIMES = ALL_TIMES.filter(
  ([name]) => !process.env.TIME || name === process.env.TIME,
);

const ssr = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: "custom",
});
const { createGame } = await ssr.ssrLoadModule(
  "/packages/game-core/src/index.ts",
);
const { validateSave } = await ssr.ssrLoadModule(
  "/packages/game-storage/src/index.ts",
);
const LAST_TICKS = TIMES[TIMES.length - 1][1];
// PHASE=compare: chỉ so ảnh giữa hai thư mục (A và B), không mở trình duyệt.
const compareOnly = phases.includes("compare");
const readFolder = async (dir) => {
  const out = new Map();
  let files = [];
  try {
    files = await readdir(dir);
  } catch {
    return out;
  }
  for (const file of files.filter((f) => f.endsWith(".png")))
    out.set(file, decodePng(await readFile(`${dir}/${file}`)));
  return out;
};
if (compareOnly) {
  const a = await readFolder(process.env.A ?? "");
  const b = await readFolder(process.env.B ?? "");
  const diffs = {};
  for (const [file, image] of a) {
    const other = b.get(file);
    if (other)
      diffs[file] = {
        ...compare(image, other),
        aBrightness: +meanBrightness(image).toFixed(2),
        bBrightness: +meanBrightness(other).toFixed(2),
      };
  }
  await writeFile(
    `${folder}/diff.json`,
    JSON.stringify({ a: process.env.A, b: process.env.B, diffs }, null, 2) +
      "\n",
  );
  console.log(JSON.stringify({ a: process.env.A, b: process.env.B, diffs }));
  process.exit(0);
}
// Tên nhân vật ≤18 ký tự và không được trùng bản lưu đang có, nên mỗi lần nhập
// dùng một fixture mới.
let fixtureIndex = 0;
const fixtureFor = (timeTicks, mapId = "village") => {
  const state = createGame(
    `Ký Ức ${++fixtureIndex}`,
    "wudang",
    `daynight-${fixtureIndex}`,
    4242 + timeTicks,
  );
  state.worldClock.timeTicks = timeTicks;
  if (mapId !== state.mapId) {
    state.mapId = mapId;
    const spawn = { village: { x: 14, y: 14 }, forest: { x: 5, y: 5 } }[mapId];
    Object.assign(state.entities[state.playerId], { ...spawn, mapId });
  }
  validateSave(state);
  return state;
};
await ssr.close();

// --- PNG đọc/so sánh: Playwright trả PNG 8-bit RGBA, tự giải mã để lấy số đo.
function decodePng(buffer) {
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (pos < buffer.length) {
    const length = buffer.readUInt32BE(pos);
    const type = buffer.subarray(pos + 4, pos + 8).toString("ascii");
    const data = buffer.subarray(pos + 8, pos + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + length;
  }
  if (bitDepth !== 8) throw new Error(`bitDepth ${bitDepth} không hỗ trợ`);
  const channels = { 6: 4, 2: 3, 0: 1 }[colorType];
  if (!channels) throw new Error(`colorType ${colorType} không hỗ trợ`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const cur = Buffer.from(
      raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)),
    );
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? cur[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let v = cur[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 0xff;
    }
    cur.copy(out, y * stride);
    prev = cur;
  }
  return { width, height, channels, data: out };
}
const shots = new Map();
async function shot(page, folder, name) {
  const buffer = await page.screenshot();
  await writeFile(`${folder}/${name}.png`, buffer);
  shots.set(name, decodePng(buffer));
  return buffer;
}
function compare(a, b, step = 2) {
  let total = 0;
  let sum = 0;
  let changed = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < a.height; y += step)
    for (let x = 0; x < a.width; x += step) {
      const ia = (y * a.width + x) * a.channels;
      const ib = (y * b.width + x) * b.channels;
      const d = Math.max(
        Math.abs(a.data[ia] - b.data[ib]),
        Math.abs(a.data[ia + 1] - b.data[ib + 1]),
        Math.abs(a.data[ia + 2] - b.data[ib + 2]),
      );
      total++;
      sum += d;
      if (d > 8) {
        changed++;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  return {
    meanAbsDiff: +(sum / total).toFixed(3),
    changedRatio: +(changed / total).toFixed(4),
    box: maxX < 0 ? null : [minX, minY, maxX, maxY],
  };
}

/** Độ sáng trung bình (0–255) — dùng để so mốc ngày/đêm một cách khách quan. */
function meanBrightness(image) {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < image.data.length; i += image.channels * 4) {
    sum += (image.data[i] + image.data[i + 1] + image.data[i + 2]) / 3;
    count++;
  }
  return sum / count;
}

// --- Trình duyệt
const app = await createServer({
  configFile: "apps/web/vite.config.ts",
  server: { port: 5242, strictPort: false },
});
await app.listen();
const base = app.resolvedUrls.local[0].replace(/\/$/, "");
const browser = await chromium.launch({
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const errors = [];
const diagnostics = [];
const open = async (prefs = {}) => {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
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
  await page.waitForTimeout(1200);
};
const importSave = async (page, state) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: "daynight-fixture.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(state)),
  });
  await page
    .getByRole("button", { name: "Xác nhận nhập", exact: true })
    .click();
  await page.waitForFunction(
    (name) =>
      document.querySelector(".player-name strong")?.textContent === name,
    state.name,
    { timeout: 30000 },
  );
  await page.locator(".world-viewport canvas").waitFor();
};
const settings = async (page) =>
  page.getByRole("button", { name: "Thiết lập", exact: true }).click();
const closePanel = async (page) => {
  const button = page.getByRole("button", {
    name: "Đóng cửa sổ",
    exact: true,
  });
  if (await button.count()) await button.click();
};
const readDiagnostics = async (page) => {
  const text = await page.locator(".diagnostics-row").first().innerText();
  const fps = Number(/([\d.]+) FPS/.exec(text)?.[1] ?? NaN);
  const renderMs = Number(/CPU render ([\d.]+)ms/.exec(text)?.[1] ?? NaN);
  const objects = Number(/(\d+) objects/.exec(text)?.[1] ?? NaN);
  const renderer = /· (WebGL|Canvas) ·/.exec(text)?.[1] ?? "";
  return { text, fps, renderMs, objects, renderer };
};
const summary = (rows) => {
  const ok = rows.filter((r) => Number.isFinite(r.fps));
  const avg = (list) =>
    list.reduce((a, b) => a + b, 0) / Math.max(1, list.length);
  return {
    samples: ok.length,
    fps: +avg(ok.map((r) => r.fps)).toFixed(2),
    renderMs: +avg(ok.map((r) => r.renderMs)).toFixed(3),
    objects: +avg(ok.map((r) => r.objects)).toFixed(1),
    renderer: ok[0]?.renderer ?? "",
  };
};
const report = {
  run,
  label,
  prefsPatch,
  phases,
  times: {},
  perf: {},
  maps: {},
  errors,
};
let index = 0;
try {
  if (phases.includes("shots")) {
    for (const [name, ticks] of TIMES) {
      const { context, page } = await open(prefsPatch);
      try {
        await enter(page, `Khách ${++index}`);
        await importSave(page, fixtureFor(ticks));
        // Chờ vài frame để mọi renderer chạy ổn định trước khi chụp.
        await page.waitForTimeout(2500);
        await shot(page, folder, name);
        report.times[name] = {
          timeTicks: ticks,
          clock: (await page.locator(".minimap-footer").innerText())
            .split("\n")
            .pop(),
        };
      } finally {
        await context.close();
      }
    }
  }
  if (phases.includes("perf")) {
    for (const quality of ["high", "low"]) {
      const { context, page } = await open({ ...prefsPatch, quality });
      try {
        await enter(page, `Đo ${quality}`);
        await importSave(page, fixtureFor(LAST_TICKS));
        await page.waitForTimeout(2000);
        await settings(page);
        const standing = [];
        for (let i = 0; i < 30; i++) {
          await page.waitForTimeout(1000);
          standing.push(await readDiagnostics(page));
        }
        await closePanel(page);
        const moving = [];
        for (let i = 0; i < 4; i++) {
          const box = await page
            .locator(".world-viewport canvas")
            .boundingBox();
          await page.mouse.click(
            box.x + box.width * (i % 2 ? 0.32 : 0.68),
            box.y + box.height * (i % 2 ? 0.28 : 0.72),
          );
          await page.waitForTimeout(300);
          await settings(page);
          for (let j = 0; j < 5; j++) {
            await page.waitForTimeout(1000);
            moving.push(await readDiagnostics(page));
          }
          await closePanel(page);
        }
        report.maps[quality] = summary(moving).objects;
        report.perf[quality] = {
          standing: summary(standing),
          moving: summary(moving),
        };
        diagnostics.push({ quality, qualityFresh: quality });
      } finally {
        await context.close();
      }
    }
  }
  if (phases.includes("mapchange")) {
    const { context, page } = await open(prefsPatch);
    try {
      await enter(page, "Đổi map");
      await importSave(page, fixtureFor(LAST_TICKS));
      await page.waitForTimeout(2500);
      const counts = [];
      const measure = async (step) => {
        await settings(page);
        await page.waitForTimeout(1200);
        const row = await readDiagnostics(page);
        counts.push({
          step,
          objects: row.objects,
          entities: /· (\d+) entity map hiện tại/.exec(row.text)?.[1] ?? "",
          textures: /(\d+) textures/.exec(row.text)?.[1] ?? "",
        });
        await closePanel(page);
      };
      await measure("1-village");
      for (const [step, portal] of [
        ["2-forest", "Thanh Trúc Lâm"],
        ["3-village", "Tân Thủ Thôn"],
        ["4-forest", "Thanh Trúc Lâm"],
        ["5-village", "Tân Thủ Thôn"],
      ]) {
        await page.keyboard.press("m");
        const row = page
          .locator(".destination-row", { hasText: portal })
          .first();
        await row.waitFor();
        await row.click();
        await page.waitForTimeout(12000);
        await measure(step);
      }
      report.maps.changes = counts;
    } finally {
      await context.close();
    }
  }
  for (const [name, decoded] of shots) {
    report.times[name] ??= {};
    report.times[name].pixels = {
      width: decoded.width,
      height: decoded.height,
      brightness: +meanBrightness(decoded).toFixed(2),
    };
  }
  await writeFile(
    `${folder}/report-${phases.join("-")}.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  if (errors.length) throw new Error("Lỗi trang:\n" + errors.join("\n"));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  await app.close();
}
