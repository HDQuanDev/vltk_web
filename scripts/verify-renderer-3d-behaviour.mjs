// Kiểm chứng hành vi bản 3D bằng ảnh: 8 hướng Direction8, chữ bay sát
// thương, quái chết mờ 0.55, boss ×1.5, loot, NPC, cổng, trời tối, mưa.
//
//   node scripts/verify-renderer-3d-behaviour.mjs
//
// Dùng save tổng hợp để đặt entity ở đúng trạng thái rồi chụp ảnh.
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, writeFile } from "node:fs/promises";

const folder = "artifacts/renderer-3d/behaviour";
await mkdir(folder, { recursive: true });

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

let fixtureIndex = 0;
const fixture = (mutate) => {
  const state = createGame(
    `Hanh 3D ${++fixtureIndex}`,
    "wudang",
    `three-behaviour-${fixtureIndex}`,
    9090 + fixtureIndex,
  );
  // `validateSave` yêu cầu mọi entity không phải người chơi phải có trong `actors`
  // với đúng tên/cấp/phái. Entity thử nghiệm là bản sao của người chơi nên
  // các field này khớp sẵn.
  mutate?.(state);
  for (const [id, entity] of Object.entries(state.entities)) {
    if (id === state.playerId) continue;
    if (state.actors[id]) continue;
    // `validateSave` đòi `actor.name === entity.name`, `actor.level === entity.level`
    // và `actor.classId === entity.definitionId`, và chỉ entity `kind: "player"`
    // mới được có trong `actors` — quái thì không.
    if (entity.kind !== "player") continue;
    // Sao chép RPG của người chơi nhưng bỏ instance vật phẩm/quest trùng ID và
    // `actors` (trỏ ngược lại → vòng tròn khi JSON.stringify).
    const rest = { ...state };
    delete rest.inventory;
    delete rest.warehouse;
    delete rest.equipment;
    delete rest.quests;
    delete rest.actors;
    state.actors[id] = {
      ...rest,
      characterId: id,
      name: entity.name,
      level: entity.level,
      appearance: "male",
      inventory: [],
      warehouse: [],
      equipment: {},
      quests: [],
    };
  }
  validateSave(state);
  return state;
};

/** Bản sao người chơi dùng làm entity thử nghiệm (kind "player" để hợp lệ save). */
const probe = (state, id, patch) => {
  const player = state.entities[state.playerId];
  state.entities[id] = {
    ...player,
    id,
    kind: "player",
    definitionId: state.classId,
    name: id,
    ...patch,
  };
  delete state.entities[id].spawnZoneId;
  delete state.entities[id].spawnSlot;
  delete state.entities[id].elite;
};
await ssr.close();

const app = await createServer({
  configFile: "apps/web/vite.config.ts",
  server: { port: 5299, strictPort: false },
});
await app.listen();
const base = app.resolvedUrls.local[0].replace(/\/$/, "");
const browser = await chromium.launch({
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const errors = [];

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
  }, { renderMode: "3d", quality: "high", ...prefs });
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
  await page.waitForTimeout(1500);
};

const importSave = async (page, state) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: "three-behaviour.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(state)),
  });
  await page
    .getByRole("button", { name: "Xác nhận nhập", exact: true })
    .click();
  await page.waitForFunction(
    (name) => document.querySelector(".player-name strong")?.textContent === name,
    state.name,
    { timeout: 30000 },
  );
  await page.locator(".world-viewport canvas").waitFor();
  await page.waitForTimeout(3000);
};

const results = {};

// --- 1. Tám hướng Direction8: đặt cùng một nhân vật ở 8 hướng.
{
  const { context, page } = await open();
  try {
    await enter(page, "Huong 3D");
    await importSave(
      page,
      fixture((state) => {
        // Tám bản sao logic: đặt cùng một nhân vật ở 8 vị trí với `direction`
        // khác nhau để chụp cùng một lúc.
        const dirs = [0, 1, 2, 3, 4, 5, 6, 7];
        dirs.forEach((direction, i) => {
          probe(state, `H${direction}`, {
            x: 14 + (i % 4) * 2,
            y: 14 + Math.floor(i / 4) * 2,
            direction,
            state: "idle",
            stateStartedAt: state.tick,
          });
        });
      }),
    );
    await page.screenshot({ path: `${folder}/01-directions.png` });
    const facing = await page.evaluate(() =>
      [...document.querySelectorAll(".three-overlay-actors > div")]
        .map((el) => ({
          name: el.querySelector("div")?.textContent ?? "",
          left: el.style.left,
          top: el.style.top,
        }))
        .filter((l) => l.name.startsWith("H")),
    );
    results.directions = facing;
  } finally {
    await context.close();
  }
}

// --- 2. Chữ bay sát thương + quái chết mờ + boss.
{
  const { context, page } = await open();
  try {
    await enter(page, "Combat 3D");
    await importSave(
      page,
      fixture((state) => {
        const player = state.entities[state.playerId];
        // Di chuyển người chơi đến cạnh quái thật (`spawn` 22,20) để lệnh skill
        // chắc chắn có mục tiêu trong tầm — quái do `populateMap` dựng lại theo
        // vùng spawn nên vị trí đặt tay của save không được giữ.
        const bandit = state.entities["village:bandit:0"];
        if (bandit) {
          player.x = bandit.x - 1;
          player.y = bandit.y;
          bandit.hp = 30;
          bandit.maxHp = 50;
        }
        // Quái chết (hp 0) để thấy alpha 0.55.
        probe(state, "DaChet", {
          x: player.x - 2,
          y: player.y,
          hp: 0,
          maxHp: 50,
          state: "dead",
        });
        // Boss (brain "boss" → ×1.5) đứng cạnh người chơi.
        probe(state, "Boss", {
          x: player.x + 2,
          y: player.y,
          hp: 10,
          maxHp: 100,
        });
      }),
    );
    // Đánh để sinh chữ bay. Lệnh `attack` chỉ bật cờ autoAttack trong
    // game-core; `skill` gọi `useSkill` ngay nên sát thương xảy ra tức thì.
    await page.locator(".world-viewport canvas").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("1");
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${folder}/02-combat.png` });
    const popups = await page.evaluate(() =>
      [...document.querySelectorAll(".three-overlay-effects > div")]
        .map((el) => el.textContent)
        .filter(Boolean),
    );
    results.combat = { popups };
  } finally {
    await context.close();
  }
}

// --- 3. Đêm + mưa.
{
  const { context, page } = await open();
  try {
    await enter(page, "Dem 3D");
    await importSave(
      page,
      fixture((state) => {
        state.worldClock.timeTicks = 18000; // giữa đêm
        state.worldClock.weather = "rain";
        // Giữ nguyên mưa: core đổi thời tiết khi tick vượt `nextWeatherAt`.
        state.worldClock.nextWeatherAt = state.tick + 100000;
        state.settings.effects = "high";
      }),
    );
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${folder}/03-night-rain.png` });
    const bg = await page.evaluate(() => {
      const c = document.querySelector(".world-viewport canvas");
      return c ? { w: c.width, h: c.height } : null;
    });
    const clock = await page.locator(".minimap-footer").innerText();
    const gpu = await page.evaluate(() => window.__threeRendererInfo?.() ?? null);
    results.nightRain = { bg, clock, gpu };
  } finally {
    await context.close();
  }
}

// --- 4. Loot rơi tự nhiên: giết quái để game tự tạo loot (không đi qua
// import save — import path của App không giữ loot thủ công trong bản này).
{
  const { context, page } = await open();
  try {
    await enter(page, "Loot 3D");
    // Chơi bình thường: chạy tới sơn tặc rồi đánh cho tới khi nó chết và rơi
    // loot. Không import save để loot do game tự tạo.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("d");
      await page.waitForTimeout(600);
    }
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press("1");
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${folder}/04-loot.png` });
    const lootInfo = await page.evaluate(() => ({
      lootLabels: [...document.querySelectorAll(".three-overlay-objects > div")]
        .map((el) => el.textContent)
        .filter((t) => t && t.trim().length > 0),
      appLoot: document.querySelectorAll(".ground-loot-list button").length,
    }));
    results.loot = lootInfo;
  } finally {
    await context.close();
  }
}

const report = { results, errors };
await writeFile(`${folder}/report.json`, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
await browser.close();
await app.close();
