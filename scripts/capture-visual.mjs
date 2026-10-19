// Browser captures use importable synthetic saves, never production debug hooks.
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.VISUAL_URL ?? "http://localhost:5174";
const folder = process.env.VISUAL_DIR ?? "artifacts/visual-after";
await mkdir(folder, { recursive: true });
const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: "custom",
});
const { createGame, addItem, GameWorld } = await vite.ssrLoadModule(
  "/packages/game-core/src/index.ts",
);
const { getMap } = await vite.ssrLoadModule(
  "/packages/game-content/src/index.ts",
);
const state = createGame("Vân Du Khách", "wudang", "visual-fixture", 71227);
state.gold = 8000;
state.entities[state.playerId].x = 18;
state.entities[state.playerId].y = 12;
for (const [id, n] of [
  ["ore", 30],
  ["wood", 20],
  ["jade-gem", 2],
  ["ward-stone", 2],
  ["pine-blade", 1],
  ["cloud-spear", 1],
  ["thunder-saber", 1],
  ["thunder-helm", 1],
  ["jade-pendant", 1],
  ["jade-fan", 1],
  ["cloud-blade", 1],
  ["cloud-silk", 3],
  ["beast-hide", 2],
  ["jade-ore", 5],
  ["storm-iron", 4],
  ["amber-gem", 1],
])
  addItem(state, id, n);
let failureFixture;
for (let seed = 1; seed < 1000000; seed += 7919) {
  const sample = createGame(
    "Luyện Khí Thất Bại",
    "wudang",
    "visual-failure",
    seed,
  );
  sample.paused = true;
  sample.gold = 50000;
  sample.equipment.weapon.enhancement = 14;
  Object.assign(sample.entities[sample.playerId], { x: 18, y: 12 });
  addItem(sample, "ore", 99);
  const world = new GameWorld(structuredClone(sample));
  world.dispatch({
    protocolVersion: 1,
    sequence: 1,
    actorId: sample.playerId,
    command: { type: "enhance", instanceId: sample.equipment.weapon.id },
  });
  if (world.state.enhanceLog?.at(-1)?.success === false) {
    failureFixture = sample;
    break;
  }
}
if (!failureFixture) throw new Error("No deterministic failure fixture found");
const combat = createGame("Hiệp Khách", "wudang", "visual-combat", 71227),
  enemy = Object.values(combat.entities).find((e) => e.kind === "monster");
Object.assign(combat.entities[combat.playerId], { x: enemy.x - 1, y: enemy.y });
enemy.nextAttack = 999999;
enemy.hp = enemy.maxHp;
const { validateSave } = await vite.ssrLoadModule(
  "/packages/game-storage/src/index.ts",
);
for (const fixture of [state, combat, failureFixture]) validateSave(fixture);
await vite.close();
const browser = await chromium.launch({ headless: true });
const results = [];
for (const [width, height] of [
  [1920, 1080],
  [1366, 768],
  [932, 430],
  [844, 390],
  [1180, 820],
].filter(
  ([w]) =>
    !process.env.VISUAL_WIDTHS ||
    process.env.VISUAL_WIDTHS.split(",").includes(String(w)),
)) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.setDefaultTimeout(15000);
  const errors = [],
    screens = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400 && r.url().includes("/assets/"))
      errors.push(`${r.status()} ${r.url()}`);
  });
  const shot = async (name) => {
    await page.waitForTimeout(160);
    await page.screenshot({ path: `${folder}/${name}-${width}.png` });
    screens.push({
      name,
      ...(await page.evaluate(() => ({
        pageOverflow:
          document.documentElement.scrollWidth > innerWidth ||
          document.documentElement.scrollHeight > innerHeight,
        dialogsWithinViewport: [
          ...document.querySelectorAll("[role=dialog]"),
        ].every((e) => {
          const r = e.getBoundingClientRect();
          return (
            r.x >= 0 &&
            r.y >= 0 &&
            r.right <= innerWidth &&
            r.bottom <= innerHeight
          );
        }),
      }))),
    });
  };
  const close = async () => {
    const b = page.getByRole("button", { name: "Đóng cửa sổ", exact: true });
    if (await b.count()) await b.click();
  };
  const open = async (name) => {
    await close();
    await page.getByRole("button", { name: "Mở menu", exact: true }).click();
    await page
      .locator(".mobile-menu")
      .getByRole("button", { name, exact: true })
      .click();
  };
  const load = async (s) => {
    await page.locator('input[type="file"]').setInputFiles({
      name: "visual-fixture.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(s)),
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
    await page.waitForTimeout(800);
  };
  await page.goto(base);
  await page
    .getByRole("textbox", { name: "Tên nhân vật", exact: true })
    .fill("Tân Thiếu Hiệp");
  await shot("creation");
  await page.getByLabel("Ngoại hình", { exact: true }).selectOption("female");
  await shot("creation-female");
  await page
    .getByRole("button", { name: "Tạo nhân vật và vào game", exact: true })
    .click();
  await page.locator(".world-viewport canvas").waitFor();
  await page.waitForTimeout(1800);
  await shot("hud");
  if (width < 1000) {
    await page.locator(".tracker-heading").click();
    await page.locator(".quest-objective").click();
  } else
    await page
      .getByRole("button", { name: "Đến gặp Lão trưởng thôn", exact: true })
      .click();
  await page
    .getByRole("dialog", { name: "Lão trưởng thôn", exact: true })
    .waitFor();
  await shot("dialogue");
  await close();
  await load(state);
  for (const [name, file] of [
    ["Hành trang", "inventory"],
    ["Nhân vật", "equipment"],
    ["Võ học", "skills"],
    ["Nhiệm vụ", "quests"],
    ["Bản đồ", "map"],
    ["Thiết lập", "settings"],
  ]) {
    await open(name);
    if (name === "Hành trang") {
      await shot(file);
      await page
        .getByRole("button", { name: "Đạo Bào Thanh Vân", exact: true })
        .click();
      await shot("item-detail");
      if (width > 1000) {
        await page.mouse.move(0, 0);
        await page
          .getByRole("button", { name: "Đạo Bào Thanh Vân", exact: true })
          .hover();
        await shot("item-tooltip");
        await page.mouse.move(0, 0);
      }
      await page
        .getByRole("button", { name: "Công xưởng", exact: true })
        .click();
      await shot("crafting");
      await page
        .getByRole("button", { name: "Cường hóa", exact: true })
        .click();
      await shot("enhancement");
      await page
        .getByRole("button", { name: "Cường hóa +1", exact: true })
        .click();
      await page.waitForTimeout(700);
      await shot("enhancement-result");
      await page
        .getByRole("button", { name: "Khảm ngọc", exact: true })
        .click();
      await shot("gems");
    } else await shot(file);
  }
  await open("Hành trang");
  await page.getByRole("button", { name: "Kho đồ", exact: true }).click();
  await shot("warehouse");
  await close();
  await open("Hành trang");
  await page.getByRole("button", { name: "Đến dược sư", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Diệp dược sư", exact: true })
    .waitFor();
  await shot("shop");
  await close();
  const mountain = structuredClone(state);
  mountain.mapId = "thanhvanson";
  const spawn = getMap("thanhvanson").spawn;
  Object.assign(mountain.entities[mountain.playerId], {
    mapId: mountain.mapId,
    x: spawn.x,
    y: spawn.y,
    spawn,
    path: [],
  });
  await load(mountain);
  await page.waitForTimeout(1400);
  await shot("thanhvanson");
  await load(combat);
  await page
    .getByRole("button", { name: "Thiên Địa Vô Cực", exact: true })
    .click();
  await shot("combat");
  const loot = structuredClone(combat);
  loot.entities[enemy.id].hp = 1;
  await load(loot);
  await page
    .getByRole("button", { name: "Thiên Địa Vô Cực", exact: true })
    .click();
  await page.locator(".ground-loot-list button").first().waitFor();
  await shot("ground-loot");
  await load(failureFixture);
  await open("Công xưởng");
  await page.getByRole("button", { name: "Cường hóa", exact: true }).click();
  await page
    .getByRole("button", { name: "Cường hóa +15", exact: true })
    .click();
  await page.locator(".forge-failure").waitFor();
  await shot("enhancement-failure");
  await close();
  await page.reload();
  await page.locator(".character-lobby").waitFor();
  await shot("selection");
  results.push({
    width,
    height,
    errors,
    screens,
    fixture: true,
    pageScroll: await page.evaluate(() => ({
      x: document.documentElement.scrollWidth > innerWidth,
      y: document.documentElement.scrollHeight > innerHeight,
    })),
  });
  await page.close();
}
await browser.close();
await writeFile(
  `${folder}/capture-report.json`,
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results));
