import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import {
  createGame,
  GameWorld,
  addItem,
  isWalkable,
  distance,
} from "../../packages/game-core/src/index";
import {
  characterNameError,
  characterNameKey,
  createLocalCharacterId,
  type GameCommand,
  type GroundLoot,
} from "../../packages/game-protocol/src/index";
import { getMap } from "../../packages/game-content/src/index";
import {
  SaveRepository,
  validateSave,
} from "../../packages/game-storage/src/index";

function setup() {
  const w = new GameWorld(
    createGame("Kiếm Khách", "wudang", "loot-test", 71227),
  );
  let sequence = 0;
  const send = (command: GameCommand, actorId = w.player.id) =>
    w.dispatch({ protocolVersion: 1, sequence: ++sequence, actorId, command });
  return { w, send };
}
function drop(w: GameWorld, changes: Partial<GroundLoot> = {}) {
  const loot: GroundLoot = {
    id: `loot:${w.state.nextWorldId++}`,
    x: 14,
    y: 14,
    mapId: "village",
    ownerId: w.player.id,
    item: {
      id: `${w.state.characterId}:item:${w.state.nextId++}`,
      definitionId: "sword",
      quantity: 1,
    },
    gold: 0,
    createdAt: w.state.tick,
    expiresAt: w.state.tick + 12000,
    ...changes,
  };
  w.state.groundLoot[loot.id] = loot;
  return loot;
}
describe("Nhân vật local", () => {
  it("chuẩn hóa Unicode, khoảng trắng, hoa/thường và từ chối tên rỗng/ký tự ẩn", () => {
    expect(characterNameKey("  Độc   Cô ")).toBe(
      characterNameKey("độc cô".normalize("NFD")),
    );
    for (const name of [
      " ",
      "A",
      "<script>",
      "Kiếm\u200bHiệp",
      "❤️",
      "a".repeat(19),
    ])
      expect(characterNameError(name)).toBeTruthy();
    expect(characterNameError("Thiếu Hiệp 01")).toBeNull();
    expect(createLocalCharacterId()).not.toBe(createLocalCharacterId());
  });
  it("5 slot nguyên tử, chống trùng tên chuẩn hóa, nhân vật độc lập và xóa giữ archive", async () => {
    const repo = new SaveRepository();
    await repo.create(createGame("  Độc Cô  ", "wudang", "slot-first"));
    await expect(
      repo.create(
        createGame("độc cô".normalize("NFD"), "emei", "slot-duplicate"),
      ),
    ).rejects.toThrow("sử dụng");
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, (_, i) =>
        repo.create(createGame(`Hiệp Khách ${i}`, "shaolin", `slot-${i}`)),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(4);
    const records = await repo.list();
    expect(records).toHaveLength(5);
    const ids = records.flatMap((r) =>
      [...r.snapshot.inventory, ...Object.values(r.snapshot.equipment)].map(
        (i) => i.id,
      ),
    );
    expect(new Set(ids).size).toBe(ids.length);
    const first = (await repo.load("slot-first"))!;
    first.gold = 300;
    await repo.save(first);
    await repo.delete("slot-first");
    expect(await repo.load("slot-first")).toBeNull();
    const archive = (await repo.archives("slot-first")).find((a) =>
      a.reason.includes("xóa"),
    );
    expect(validateSave(archive!.snapshot).name).toBe("Độc Cô");
    const archivedGold = (await repo.archives("slot-first")).map(
      (a) => validateSave(a.snapshot).gold,
    );
    expect(archivedGold).toContain(180);
    expect(archivedGold).toContain(300);
    await repo.create(createGame("Danh Xưng Mới", "emei", "slot-reused"));
    expect(await repo.list()).toHaveLength(5);
    await expect(
      repo.import(createGame("Nhân Vật Sáu", "wudang", "slot-import-overflow")),
    ).rejects.toThrow("Đã đủ 5");
    await expect(
      repo.save(createGame("Nhân Vật Sáu", "wudang", "slot-save-overflow")),
    ).rejects.toThrow("Đã đủ 5");
    for (const record of await repo.list())
      await repo.delete(record.characterId);
  });
});
describe("Ground loot authoritative", () => {
  it("giết quái chỉ cộng EXP, bạc và đồ phải nhặt từ đất; spam pickup không nhân đôi", () => {
    const { w, send } = setup();
    const m = Object.values(w.state.entities).find(
      (e) => e.kind === "monster",
    )!;
    w.player.x = m.x - 1;
    w.player.y = m.y;
    m.hp = 1;
    send({ type: "skill", skillId: "thunder", targetId: m.id });
    expect(m.hp).toBe(0);
    expect(w.state.experience).toBe(28);
    expect(w.state.gold).toBe(180);
    const loot = Object.values(w.state.groundLoot).find((l) => l.gold > 0)!;
    expect(loot.ownerId).toBe(w.player.id);
    send({ type: "pickup", lootId: loot.id });
    send({ type: "pickup", lootId: loot.id });
    expect(w.state.gold).toBe(198);
    expect(w.state.groundLoot[loot.id]).toBeUndefined();
  });
  it("pickup giữ item instance, chống actor khác và sai map", () => {
    const { w, send } = setup(),
      loot = drop(w);
    const other = w.addPlayer(createGame("Người Khác", "emei", "loot-other"));
    send({ type: "pickup", lootId: loot.id }, other);
    expect(w.state.groundLoot[loot.id]).toBeDefined();
    loot.mapId = "forest";
    send({ type: "pickup", lootId: loot.id });
    expect(w.state.groundLoot[loot.id]).toBeDefined();
    loot.mapId = "village";
    send({ type: "pickup", lootId: loot.id });
    expect(w.state.inventory.find((i) => i.id === loot.item!.id)).toEqual(
      loot.item,
    );
    expect(w.state.actors[other].inventory).toHaveLength(3);
  });
  it("túi đầy không xóa đồ; stack còn chỗ vẫn nhặt được", () => {
    const { w, send } = setup();
    while (w.state.inventory.length < 32) addItem(w.state, "sword");
    const weapon = drop(w);
    send({ type: "pickup", lootId: weapon.id });
    expect(w.state.groundLoot[weapon.id]).toBeDefined();
    const potion = drop(w, {
      item: { id: "ground:potion", definitionId: "hp", quantity: 2 },
    });
    send({ type: "pickup", lootId: potion.id });
    expect(w.state.inventory[0].quantity).toBe(10);
    expect(w.state.groundLoot[potion.id]).toBeUndefined();
  });
  it("tiếp cận loot ngoài tầm bằng đường đi, hết hạn không thể nhặt", () => {
    const { w, send } = setup(),
      loot = drop(w, { x: 18, y: 14 });
    send({ type: "pickup", lootId: loot.id });
    expect(w.state.pendingInteraction).toBe(`pickup:${loot.id}`);
    for (let i = 0; i < 100 && w.state.groundLoot[loot.id]; i++) w.step();
    expect(w.state.groundLoot[loot.id]).toBeUndefined();
    const expiring = drop(w, {
      expiresAt: w.state.tick + 1,
      createdAt: w.state.tick,
    });
    w.step();
    send({ type: "pickup", lootId: expiring.id });
    expect(w.state.groundLoot[expiring.id]).toBeUndefined();
  });
  it("auto pickup lọc rarity, thu bạc, giữ bãi farm và dừng khi túi đầy", () => {
    const { w, send } = setup();
    const common = drop(w, {
      item: { id: "ground:common", definitionId: "hp", quantity: 1 },
    });
    const rare = drop(w, {
      item: { id: "ground:rare", definitionId: "boots", quantity: 1 },
    });
    const gold = drop(w, { item: null, gold: 20 });
    send({
      type: "configureAuto",
      settings: { pickup: true, lootRarity: "rare" },
    });
    send({ type: "autoAttack", enabled: true });
    for (let i = 0; i < 20; i++) w.step();
    expect(w.state.groundLoot[common.id]).toBeDefined();
    expect(w.state.groundLoot[rare.id]).toBeUndefined();
    expect(w.state.groundLoot[gold.id]).toBeUndefined();
    expect(w.state.gold).toBe(200);
    expect(distance(w.player, w.player.farmAnchor!)).toBeLessThan(1);
    while (w.state.inventory.length < 32) addItem(w.state, "sword");
    drop(w, {
      item: { id: "ground:full", definitionId: "boots", quantity: 1 },
    });
    for (let i = 0; i < 10; i++) w.step();
    expect(w.player.autoAttack).toBe(false);
    expect(w.state.groundLoot["loot:4"]).toBeDefined();
  });
  it("save/load đồ dưới đất và playtime, migration v0.3 giữ nguyên bản nguồn", async () => {
    const { w } = setup();
    drop(w);
    w.step();
    const restored = validateSave(JSON.parse(JSON.stringify(w.snapshot())));
    expect(restored.groundLoot).toEqual(w.state.groundLoot);
    expect(restored.playedTicks).toBe(1);
    const old: Partial<ReturnType<typeof w.snapshot>> = w.snapshot();
    delete old.groundLoot;
    delete old.playedTicks;
    const upgraded = validateSave({ ...old, contentVersion: "0.3.0" });
    expect(upgraded.groundLoot).toEqual({});
    expect(upgraded.playedTicks).toBe(0);
    expect(upgraded.inventory).toEqual(w.state.inventory);
    const repo = new SaveRepository();
    await repo.import({ ...old, contentVersion: "0.3.0" });
    expect(
      (await repo.archives(w.state.characterId)).some(
        (r) =>
          (r.snapshot as { contentVersion: string }).contentVersion === "0.3.0",
      ),
    ).toBe(true);
  });
  it("từ chối loot trùng instance, owner không hợp lệ hoặc gói chứa cả bạc và item", () => {
    const { w } = setup(),
      loot = drop(w);
    loot.item!.id = w.state.inventory[0].id;
    expect(() => validateSave(w.snapshot())).toThrow();
    loot.item!.id = "new:item";
    loot.ownerId = "unknown";
    expect(() => validateSave(w.snapshot())).toThrow();
    loot.ownerId = w.player.id;
    loot.gold = 1;
    expect(() => validateSave(w.snapshot())).toThrow();
  });
});
describe("Steering fixed tick", () => {
  it("di chuyển liên tục không dùng A*, stop và input hết hạn không trôi", () => {
    const { w, send } = setup();
    const start = { x: w.player.x, y: w.player.y };
    send({ type: "steer", direction: { x: 1, y: 0 } });
    for (let i = 0; i < 6; i++) w.step();
    expect(w.player.x - start.x).toBeCloseTo((3.4 * 6) / 20);
    expect(w.player.path).toEqual([]);
    w.step();
    const x = w.player.x;
    for (let i = 0; i < 20; i++) w.step();
    expect(w.player.x).toBe(x);
    send({ type: "steer", direction: { x: 0, y: 1 } });
    w.step();
    send({ type: "stop" });
    const y = w.player.y;
    w.step();
    expect(w.player.y).toBe(y);
  });
  it("chuẩn hóa đường chéo, collision và snapshot replay cùng seed", () => {
    const a = setup(),
      b = setup();
    for (let i = 0; i < 50; i++) {
      if (i % 4 === 0)
        for (const { send } of [a, b])
          send({ type: "steer", direction: { x: 1, y: 1 } });
      a.w.step();
      b.w.step();
      expect(isWalkable(getMap(a.w.player.mapId), a.w.player)).toBe(true);
    }
    expect(a.w.snapshot()).toEqual(b.w.snapshot());
    expect(distance({ x: 14, y: 14 }, a.w.player)).toBeLessThanOrEqual(
      (3.4 * 50) / 20 + 0.001,
    );
  });
});
