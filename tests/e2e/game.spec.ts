import legacy from "../fixtures/v0.1-save.json" with { type: "json" };
import { test, expect, type Page } from "@playwright/test";
import { enterCharacter } from "./helpers/characters";
import { createGame } from "../../packages/game-core/src/index";
import {
  classDefinitions,
  skills,
} from "../../packages/game-content/src/index";
import { addItem } from "../../packages/game-core/src/index";
import type { GameSnapshot } from "../../packages/game-protocol/src/index";
async function start(page: Page) {
  await page.goto("/");
  await enterCharacter(page);
  await expect(page.locator(".world-viewport canvas")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Thiết lập", exact: true }),
  ).toBeVisible();
}
async function savedState(page: Page): Promise<GameSnapshot> {
  await page.locator(".save-state").click();
  await expect(page.locator(".save-state")).toContainText("Đã lưu");
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("kiem-hiep-web");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const records = await new Promise<
      { snapshot: GameSnapshot; savedAt: number }[]
    >((resolve, reject) => {
      const r = db.transaction("saves").objectStore("saves").getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    db.close();
    return records.sort((a, b) => b.savedAt - a.savedAt)[0].snapshot;
  });
}
async function importState(page: Page, s: GameSnapshot) {
  await page.locator('input[type="file"]').setInputFiles({
    name: "fixture.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(s)),
  });
  await expect(
    page.getByRole("heading", { name: "Nhập tiến trình" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xác nhận nhập" }).click();
  await expect(page.locator(".player-name strong")).toHaveText(s.name);
  await expect(page.locator(".world-viewport canvas")).toHaveCount(1);
  await expect(page.locator(".world-viewport canvas")).toBeVisible();
  // Trả focus khỏi input file để phím tắt ("i") mở được hành trang.
  await page.evaluate(() =>
    (document.activeElement as HTMLElement | null)?.blur(),
  );
}
for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 844, height: 390 },
  { width: 932, height: 430 },
  { width: 390, height: 844 },
])
  test(`HUD và hành trang tại ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await start(page);
    // Đạo Bào Thanh Vân là thưởng NV01 nên không còn trong túi lúc tạo nhân
    // vật; cấp tường minh để kiểm tra chi tiết vật phẩm + trang bị.
    const granted = await savedState(page);
    granted.inventory.push({
      id: "e2e-grant:robe",
      definitionId: "robe",
      quantity: 1,
    });
    await importState(page, granted);
    // Chờ cảnh dựng lại xong sau khi nhập bản lưu, tránh tranh chấp với panel.
    await expect(page.locator(".world-loading")).toHaveCount(0);
    await expect(page.locator(".player-hud")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const bounds = await page.locator(".player-hud").boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    if (viewport.width < 1000) {
      const buttons = await page.locator(".mobile-skills > button").all();
      const boxes = await Promise.all(
        buttons.map((button) => button.boundingBox()),
      );
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i]!,
            b = boxes[j]!;
          expect(
            Math.hypot(
              a.x + a.width / 2 - b.x - b.width / 2,
              a.y + a.height / 2 - b.y - b.height / 2,
            ),
          ).toBeGreaterThanOrEqual((a.width + b.width) / 2 + 2);
        }
      await page.getByRole("button", { name: "Mở menu", exact: true }).click();
      await page
        .locator(".mobile-menu")
        .getByRole("button", { name: "Hành trang", exact: true })
        .click();
    } else
      await page
        .getByRole("toolbar", { name: "Truy cập nhanh" })
        .getByRole("button", { name: "Hành trang", exact: true })
        .click();
    await expect(
      page.getByRole("dialog", { name: "Hành trang", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Đạo Bào Thanh Vân", exact: true })
      .click();
    await page
      .locator(".item-details")
      .getByRole("button", { name: "Trang bị", exact: true })
      .click();
    await page.getByRole("button", { name: "Đóng cửa sổ" }).click();
    const s = await savedState(page);
    expect(s.equipment.armor.definitionId).toBe("robe");
    expect(s.entities[s.playerId].defense).toBeGreaterThan(10);
    await page.screenshot({
      path: `artifacts/game-${viewport.width}x${viewport.height}.png`,
    });
    expect(errors).toEqual([]);
  });
test("nhận nhiệm vụ, di chuyển, lưu và tải lại", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await start(page);
  await page.getByRole("button", { name: "Đến gặp Lão trưởng thôn" }).click();
  await expect(
    page.getByRole("dialog", { name: "Lão trưởng thôn", exact: true }),
  ).toBeVisible();
  await page
    .locator(".npc-quest")
    .filter({ hasText: "Bình yên thôn nhỏ" })
    .getByRole("button", { name: "Nhận nhiệm vụ", exact: true })
    .click();
  await expect(page.getByText("Đang thực hiện · 0 / 5")).toBeVisible();
  await page.getByRole("button", { name: "Đóng cửa sổ" }).click();
  await page.keyboard.down("d");
  await page.waitForTimeout(500);
  await page.keyboard.up("d");
  await page.waitForTimeout(800);
  const before = await savedState(page);
  expect(before.quests[0].id).toBe("bandits");
  expect(before.entities[before.playerId].x).not.toBe(14);
  await page.reload();
  await enterCharacter(page);
  await expect(page.locator(".world-viewport canvas")).toBeVisible();
  const after = await savedState(page);
  expect(after.characterId).toBe(before.characterId);
  expect(after.quests).toEqual(before.quests);
  expect(after.equipment).toEqual(before.equipment);
});
test("kỹ năng gây sát thương, quái chết và nhận loot/EXP thật", async ({
  page,
}) => {
  await start(page);
  const s = createGame("Kiếm Khách", "wudang", "combat-browser", 71227);
  const m = Object.values(s.entities).find((e) => e.kind === "monster")!;
  s.entities[s.playerId].x = m.x - 1;
  s.entities[s.playerId].y = m.y;
  m.hp = 1;
  await importState(page, s);
  await page
    .getByRole("button", { name: "Thiên Địa Vô Cực", exact: true })
    .click();
  await expect(page.locator(".console-messages")).toContainText(
    "Đánh bại Sơn tặc",
  );
  await page.getByRole("button", { name: "Nhặt 18 bạc", exact: true }).click();
  const after = await savedState(page);
  expect(after.gold).toBeGreaterThan(s.gold);
  expect(after.experience).toBe(28);
  expect(after.entities[m.id].hp).toBe(0);
  expect(after.entities[after.playerId].mp).toBeLessThan(
    s.entities[s.playerId].mp,
  );
});
test("joystick cảm ứng và nút kỹ năng hoạt động", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await start(page);
  const initial = await savedState(page),
    box = (await page.locator(".joystick").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2 + 28, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
  const moved = await savedState(page);
  expect(moved.entities[moved.playerId].x).toBeGreaterThan(
    initial.entities[initial.playerId].x,
  );
  await page
    .getByRole("button", { name: "Thanh Tâm Quyết", exact: true })
    .click();
  const healed = await savedState(page);
  expect(healed.entities[healed.playerId].mp).toBeLessThan(
    moved.entities[moved.playerId].mp,
  );
});
test("tạo/chọn nhiều nhân vật và xuất bản lưu hợp lệ", async ({ page }) => {
  await start(page);
  await savedState(page);
  await page.locator(".player-name button").click();
  await page.getByPlaceholder("Danh xưng của thiếu hiệp").fill("Thanh Phong");
  await page.getByRole("button", { name: "Bắt đầu hành trình" }).click();
  await expect(page.locator(".player-name strong")).toHaveText("Thanh Phong");
  await page.reload();
  await enterCharacter(page);
  await expect(page.locator(".player-name strong")).toHaveText("Thanh Phong");
  await page.getByRole("button", { name: "Thiết lập", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất bản lưu", exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toContain("Thanh Phong");
});
test("PWA: tải lại, đổi bản đồ và lưu game khi hoàn toàn offline", async ({
  page,
  context,
}) => {
  await start(page);
  await expect(page.locator(".offline-status")).toContainText(
    "Sẵn sàng offline",
    { timeout: 20000 },
  );
  await page.reload();
  await enterCharacter(page);
  await expect(page.locator(".world-viewport canvas")).toBeVisible();
  const before = await savedState(page);
  await context.setOffline(true);
  await page.reload();
  await enterCharacter(page);
  await expect(page.locator(".world-viewport canvas")).toBeVisible();
  await page.keyboard.press("m");
  await page
    .getByRole("button", { name: /Thanh Trúc Lâm Tự tìm đường/ })
    .click();
  await expect(page.locator(".location-heading h1")).toHaveText(
    "Thanh Trúc Lâm",
    { timeout: 20000 },
  );
  const after = await savedState(page);
  expect(after.mapId).toBe("forest");
  expect(after.characterId).toBe(before.characterId);
  await context.setOffline(false);
});

for (const sect of classDefinitions)
  test(`10 môn phái: bộ chiêu ${sect.name} thực thi qua HUD`, async ({
    page,
  }) => {
    await start(page);
    const s = createGame(sect.name, sect.id, `browser-${sect.id}`),
      enemy = Object.values(s.entities).find((e) => e.kind === "monster")!;
    s.entities[s.playerId].x = enemy.x - 1;
    s.entities[s.playerId].y = enemy.y;
    enemy.hp = 1;
    enemy.nextAttack = 99999;
    await importState(page, s);
    const skill = skills.find((d) => d.id === s.hotbar[0])!;
    const loot = page
        .locator(".console-messages p")
        .filter({ hasText: "Đánh bại Sơn tặc" }),
      beforeCount = await loot.count();
    await page.getByRole("button", { name: skill.name, exact: true }).click();
    await expect(loot).toHaveCount(beforeCount + 1);
    await page
      .getByRole("button", { name: "Nhặt 18 bạc", exact: true })
      .click();
    const after = await savedState(page);
    expect(after.classId).toBe(sect.id);
    expect(after.entities[enemy.id].hp).toBe(0);
    expect(after.gold).toBeGreaterThan(s.gold);
  });
test("đổi nhánh, gán chiêu và nội công được lưu sau reload", async ({
  page,
}) => {
  await start(page);
  const s = createGame("Khí Tông", "wudang", "branch-browser");
  s.level = 8;
  s.entities[s.playerId].level = 8;
  s.skillPoints = 8;
  await importState(page, s);
  await page.keyboard.press("k");
  await page.getByRole("button", { name: "Khí tông", exact: true }).click();
  const branch = classDefinitions[0].branches[1],
    passive = skills.find(
      (d) =>
        d.classId === "wudang" &&
        d.branchId === branch.id &&
        d.kind === "passive",
    )!;
  await page
    .getByRole("button", { name: `Nâng ${passive.name}`, exact: true })
    .click();
  const bound = skills.find((d) => d.id === branch.startingSkills[1])!;
  await page
    .getByRole("button", { name: `Gán ${bound.name} vào ô 2`, exact: true })
    .click();
  await page.getByRole("button", { name: "Đóng cửa sổ" }).click();
  const before = await savedState(page);
  expect(before.branchId).toBe("qi");
  expect(before.hotbar[0]).toBe(bound.id);
  expect(before.skillLevels[passive.id]).toBe(1);
  await page.reload();
  await enterCharacter(page);
  await expect(page.locator(".world-viewport canvas")).toBeVisible();
  const after = await savedState(page);
  expect(after.hotbar).toEqual(before.hotbar);
  expect(after.skillLevels).toEqual(before.skillLevels);
});
for (const viewport of [
  { width: 1366, height: 768 },
  { width: 844, height: 390 },
])
  test(`chế tạo, cường hóa, khảm và kho ${viewport.width}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await start(page);
    const s = createGame("Người Thợ", "wudang", `workshop-${viewport.width}`);
    s.gold = 3000;
    s.entities[s.playerId].x = 18;
    s.entities[s.playerId].y = 12;
    addItem(s, "ore", 20);
    addItem(s, "wood", 20);
    addItem(s, "jade-gem");
    await importState(page, s);
    const openInventory = async () => {
      if (viewport.width < 1000) {
        await page
          .getByRole("button", { name: "Mở menu", exact: true })
          .click();
        await page
          .locator(".mobile-menu")
          .getByRole("button", { name: "Hành trang", exact: true })
          .click();
      } else await page.keyboard.press("i");
    };
    await openInventory();
    await page.getByRole("button", { name: "Công xưởng", exact: true }).click();
    await page
      .locator(".recipe-row")
      .filter({ hasText: "Rèn Thanh Phong Kiếm" })
      .getByRole("button", { name: "Chế tạo", exact: true })
      .click();
    await page.getByRole("button", { name: "Cường hóa", exact: true }).click();
    await expect(
      page.locator("p.hint").filter({ hasText: "Chi phí" }),
    ).toContainText("Thành công 100%");
    await expect(page.locator(".enhance-protect")).toContainText("Đá Hộ Mệnh");
    await page
      .getByRole("button", { name: "Cường hóa +1", exact: true })
      .click();
    // Lịch sử cường hóa do core ghi lại, không phải state cục bộ của React.
    await expect(page.locator(".enhance-log li").first()).toContainText(
      "thành công",
    );
    await page.getByRole("button", { name: "Khảm ngọc", exact: true }).click();
    await page
      .getByRole("button", { name: "Khảm ngọc · 40 bạc", exact: true })
      .click();
    await page.getByRole("button", { name: "Đóng cửa sổ" }).click();
    let after = await savedState(page);
    expect(after.professionXp.weaponsmith).toBe(25);
    expect(after.equipment.weapon.enhancement).toBe(1);
    expect(after.equipment.weapon.gems).toEqual(["jade-gem"]);
    expect(after.gold).toBe(2850);
    await openInventory();
    await page.getByRole("button", { name: "Kho đồ", exact: true }).click();
    await page
      .getByRole("button", { name: "Đến thủ kho / trưởng thôn", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Lão trưởng thôn", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Đóng cửa sổ" }).click();
    await openInventory();
    await page.getByRole("button", { name: "Kho đồ", exact: true }).click();
    await page
      .getByRole("button", { name: "Gửi Thanh Phong Kiếm", exact: true })
      .click();
    await page.getByRole("button", { name: "Đóng cửa sổ" }).click();
    after = await savedState(page);
    expect(after.warehouse.some((i) => i.definitionId === "sword")).toBe(true);
    await page.reload();
    await enterCharacter(page);
    await expect(page.locator(".world-viewport canvas")).toBeVisible();
    const restored = await savedState(page);
    expect(restored.warehouse).toEqual(after.warehouse);
    expect(restored.equipment).toEqual(after.equipment);
  });

test("IndexedDB v1 thật tự migrate và giữ nguyên archive nguồn", async ({
  page,
}) => {
  await page.goto("/manifest.webmanifest");
  await page.evaluate(async (legacy) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("kiem-hiep-web", 10);
      r.onupgradeneeded = () => {
        for (const name of ["saves", "backups"]) {
          const store = r.result.createObjectStore(name, { keyPath: "saveId" });
          store.createIndex("characterId", "characterId");
          store.createIndex("savedAt", "savedAt");
        }
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("saves", "readwrite");
      tx.objectStore("saves").put({
        saveId: `save:${legacy.characterId}`,
        characterId: legacy.characterId,
        savedAt: 123,
        snapshot: legacy,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, legacy);
  await start(page);
  await expect(page.locator(".player-name strong")).toHaveText(legacy.name);
  const migrated = await savedState(page);
  expect(migrated.gold).toBe(legacy.gold);
  expect(migrated.schemaVersion).toBe(2);
  expect(migrated.quests).toEqual(legacy.quests);
  const archives = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("kiem-hiep-web");
      r.onsuccess = () => resolve(r.result);
    });
    const records = await new Promise<{ snapshot: unknown }[]>((resolve) => {
      const r = db.transaction("archives").objectStore("archives").getAll();
      r.onsuccess = () => resolve(r.result);
    });
    db.close();
    return records;
  });
  expect(
    archives.some((a) => JSON.stringify(a.snapshot) === JSON.stringify(legacy)),
  ).toBe(true);
});
test("mobile offline: chế tạo và giữ tiến trình qua hai lần reload", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await start(page);
  const s = createGame("Thợ Offline", "tangmen", "offline-craft");
  s.gold = 500;
  s.entities[s.playerId].x = 18;
  s.entities[s.playerId].y = 12;
  addItem(s, "ore", 3);
  addItem(s, "wood", 2);
  await importState(page, s);
  await savedState(page);
  await expect(page.locator(".offline-status")).toContainText(
    "Sẵn sàng offline",
    { timeout: 20000 },
  );
  await page.reload();
  await enterCharacter(page);
  await expect(page.locator(".world-viewport canvas")).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await enterCharacter(page);
  await expect(page.locator(".world-viewport canvas")).toBeVisible();
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await page
    .locator(".mobile-menu")
    .getByRole("button", { name: "Công xưởng", exact: true })
    .click();
  await page
    .locator(".recipe-row")
    .filter({ hasText: "Rèn Thanh Phong Kiếm" })
    .getByRole("button", { name: "Chế tạo", exact: true })
    .click();
  await page.getByRole("button", { name: "Đóng cửa sổ" }).click();
  const before = await savedState(page);
  expect(before.professionXp.weaponsmith).toBe(25);
  expect(before.inventory.some((i) => i.definitionId === "sword")).toBe(true);
  await page.reload();
  await enterCharacter(page);
  await expect(page.locator(".world-viewport canvas")).toBeVisible();
  const after = await savedState(page);
  expect(after.inventory).toEqual(before.inventory);
  expect(after.professionXp).toEqual(before.professionXp);
  await context.setOffline(false);
});

test("đứng gần dược sư: điều hướng từ túi/công xưởng không đóng đè hội thoại", async ({
  page,
}) => {
  await start(page);
  const s = createGame("Khách Mua Thuốc", "wudang", "near-merchant");
  s.entities[s.playerId].x = 8;
  s.entities[s.playerId].y = 14;
  await importState(page, s);
  await page.keyboard.press("i");
  await page.getByRole("button", { name: "Đến dược sư", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Diệp dược sư", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mở công xưởng", exact: true })
    .click();
  await page.getByRole("button", { name: "Đến dược sư", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Diệp dược sư", exact: true }),
  ).toBeVisible();
});
