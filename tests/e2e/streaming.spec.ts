import earned from "../fixtures/v0.5-earned-farm.json" with { type: "json" };
import { test, expect, type Page } from "@playwright/test";
import { enterCharacter } from "./helpers/characters";
import type { GameSnapshot } from "../../packages/game-protocol/src/index";
async function save(page: Page): Promise<GameSnapshot> {
  await page.locator(".save-state").click();
  await expect(page.locator(".save-state")).toContainText("Đã lưu");
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("kiem-hiep-web");
      r.onsuccess = () => resolve(r.result);
    });
    const rows = await new Promise<
      { snapshot: GameSnapshot; savedAt: number }[]
    >((resolve) => {
      const r = db.transaction("saves").objectStore("saves").getAll();
      r.onsuccess = () => resolve(r.result);
    });
    db.close();
    return rows.sort((a, b) => b.savedAt - a.savedAt)[0].snapshot;
  });
}
for (const width of [1366, 932])
  test(`large-map checkpoint → waypoint → save → offline reload ${width}`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height: width === 932 ? 430 : 768 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await enterCharacter(page);
    // This checkpoint was earned by starterJourney + 30-minute command-only farm.
    // Import is a persistence/render test, not another end-to-end progression claim.
    await page.locator('input[type="file"]').setInputFiles({
      name: "earned-farm.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(earned)),
    });
    await page
      .getByRole("button", { name: "Xác nhận nhập", exact: true })
      .click();
    await expect(page.locator(".player-name strong")).toHaveText(earned.name);
    await expect(page.locator(".world-loading")).toHaveCount(0);
    await page.keyboard.press("m");
    const map = page.getByRole("dialog", { name: "Thiên hạ đồ", exact: true });
    await expect(map).toContainText("Vân Khê Sơn Dã");
    await expect(page.locator(".destination-row")).toHaveCount(14);
    await page.getByRole("button", { name: /Trúc Lâm Tây.*Tìm đường/ }).click();
    await page.waitForTimeout(1500);
    const before = await save(page);
    expect(before.mapId).toBe("riverlands");
    expect(Object.keys(before.spawnRegions).length).toBeGreaterThan(0);
    expect(before.entities[before.playerId].autoAttack).toBe(false);
    await page.getByRole("button", { name: "Thiết lập", exact: true }).click();
    await expect(page.locator(".diagnostics-row")).toContainText("inactive");
    await expect(page.locator(".diagnostics-row")).toContainText("Kho vùng");
    // View projection: browser chỉ nhận entity của bản đồ đang chơi; dormant
    // entity của 4 bản đồ đã thăm không nằm trong payload publish.
    const publishRow = page.locator(".diagnostics-row p", {
      hasText: "Gửi",
    });
    await expect(publishRow).toContainText("dormant");
    const publishText = await publishRow.innerText();
    const published = /Gửi (\d+)\/(\d+) entity/.exec(publishText);
    expect(published).not.toBeNull();
    expect(Number(published![1])).toBeLessThan(Number(published![2]));
    expect(Number(published![2])).toBeGreaterThanOrEqual(47);
    expect(Number(/dormant (\d+)/.exec(publishText)![1])).toBeGreaterThan(0);
    await page
      .getByRole("button", { name: "Đóng cửa sổ", exact: true })
      .click();
    await page.screenshot({
      path: `artifacts/riverlands-gameplay-${width}.png`,
    });
    await expect(page.locator(".offline-status")).toContainText(
      "Sẵn sàng offline",
      { timeout: 15000 },
    );
    await context.setOffline(true);
    await page.reload();
    await enterCharacter(page);
    await expect(page.locator(".world-loading")).toHaveCount(0);
    const after = await save(page);
    expect(after.mapId).toBe("riverlands");
    expect(after.level).toBe(before.level);
    expect(after.inventory).toEqual(before.inventory);
    expect(after.quests).toEqual(before.quests);
    expect(Object.keys(after.entities).sort()).toEqual(
      Object.keys(before.entities).sort(),
    );
    expect(after.lootMetrics.rejected).toBe(0);
    expect(errors).toEqual([]);
    await context.setOffline(false);
  });
test("một slot lỗi vẫn chọn được slot lành và phục hồi riêng đúng backup", async ({
  page,
}) => {
  await page.goto("/");
  await enterCharacter(page);
  await save(page);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("kiem-hiep-web");
      r.onsuccess = () => resolve(r.result);
    });
    const original = await new Promise<Record<string, unknown>>((resolve) => {
      const r = db.transaction("saves").objectStore("saves").getAll();
      r.onsuccess = () => resolve(r.result[0]);
    });
    // Deliberately corrupt only the primary of one fixture slot; no gameplay grants.
    const snapshot = structuredClone(original.snapshot) as GameSnapshot;
    snapshot.characterId = "broken-browser";
    snapshot.name = "Nhân Vật Lỗi";
    const oldPlayerId = snapshot.playerId,
      player = snapshot.entities[oldPlayerId];
    player.id = "player:broken-browser";
    player.name = snapshot.name;
    snapshot.playerId = player.id;
    delete snapshot.entities[oldPlayerId];
    snapshot.entities[player.id] = player;
    snapshot.gold = 320;
    await new Promise<void>((resolve) => {
      const t = db.transaction(["saves", "backups"], "readwrite");
      t.objectStore("backups").put({
        ...original,
        saveId: "backup:broken-browser",
        characterId: snapshot.characterId,
        snapshot,
      });
      t.objectStore("saves").put({
        ...original,
        saveId: "save:broken-browser",
        characterId: snapshot.characterId,
        snapshot: { ...snapshot, gold: -1 },
      });
      t.oncomplete = () => resolve();
    });
    db.close();
  });
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Chọn nhân vật", exact: true }),
  ).toBeVisible();
  // Đặc tả C1.1: bản chính lỗi thì tự khôi phục từ bản dự phòng mới nhất và
  // báo mốc thời gian; slot lỗi không còn chặn danh sách nhân vật.
  await expect(page.getByLabel("Bản lưu cần khôi phục")).toHaveCount(0);
  await expect(page.locator(".toast")).toContainText("bản dự phòng");
  await expect(
    page.getByRole("button", { name: "Vào game", exact: true }),
  ).toBeEnabled();
  await page
    .locator(".lobby-roster button")
    .filter({ hasText: "Nhân Vật Lỗi" })
    .click();
  await page.getByRole("button", { name: "Vào game", exact: true }).click();
  await expect(page.locator(".player-name strong")).toHaveText("Nhân Vật Lỗi");
  expect((await save(page)).gold).toBe(320);
});
