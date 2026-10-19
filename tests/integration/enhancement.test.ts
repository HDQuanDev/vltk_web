import { describe, expect, it } from "vitest";
import {
  GameWorld,
  addItem,
  createGame,
} from "../../packages/game-core/src/index";
import { enhancementRules } from "../../packages/game-content/src/index";
import { validateSave } from "../../packages/game-storage/src/index";
import type {
  GameCommand,
  GameEvent,
  ItemInstance,
} from "../../packages/game-protocol/src/index";

/**
 * Cường hóa +15 có RNG authority. Bài kiểm thử giữ mô phỏng ở trạng thái pause
 * và tự tăng tick cho hết hồi chiêu, nên chỉ đo giao dịch cường hóa, không đo
 * combat hay spawn.
 */
function setup(seed = 4242) {
  const w = new GameWorld(createGame("Thợ Rèn", "wudang", "enhance-v3", seed));
  w.player.x = 18;
  w.player.y = 12;
  w.state.paused = true;
  w.state.gold = 500000;
  addItem(w.state, "ore", 99);
  addItem(w.state, "ward-stone", 20);
  return w;
}
let sequence = 0;
const send = (w: GameWorld, command: GameCommand) => {
  w.dispatch({
    protocolVersion: 1,
    sequence: ++sequence,
    actorId: w.player.id,
    command,
  });
  w.state.tick += 11;
  return w.drainEvents();
};
const weapon = (w: GameWorld) => w.state.equipment.weapon;
const oreCount = (w: GameWorld) =>
  w.state.inventory.find((i) => i.definitionId === "ore")?.quantity ?? 0;
const wardCount = (w: GameWorld) =>
  w.state.inventory.find((i) => i.definitionId === "ward-stone")?.quantity ?? 0;
const failureText = (events: GameEvent[]) =>
  events.find((e) => e.type === "equipment" && e.success === false);
describe("cường hóa tới +15", () => {
  it("an toàn tới mốc safeLevel: luôn thành công và không mất cấp", () => {
    const w = setup(),
      id = weapon(w).id;
    for (let level = 0; level < enhancementRules.safeLevel; level++) {
      const events = send(w, { type: "enhance", instanceId: id });
      expect(weapon(w).enhancement).toBe(level + 1);
      expect(failureText(events)).toBeUndefined();
    }
    expect(w.state.enhanceLog).toHaveLength(enhancementRules.safeLevel);
    expect(w.state.enhanceLog!.every((record) => record.success)).toBe(true);
  });

  it("vượt mốc an toàn: RNG authority tạo cả thành công và thất bại, không vượt trần", () => {
    const w = setup(),
      id = weapon(w).id;
    weapon(w).enhancement = 14;
    for (let attempt = 0; attempt < 30; attempt++)
      send(w, { type: "enhance", instanceId: id });
    const log = w.state.enhanceLog!;
    expect(log.some((record) => record.success)).toBe(true);
    expect(log.some((record) => !record.success)).toBe(true);
    for (const record of log) {
      expect(record.to).toBeLessThanOrEqual(enhancementRules.maxLevel);
      expect(record.to).toBeGreaterThanOrEqual(0);
      if (record.success) expect(record.to).toBe(record.from + 1);
      else
        expect(record.to).toBe(
          Math.max(0, record.from - (record.from >= 13 ? 2 : 1)),
        );
    }
    expect(weapon(w).enhancement).toBeLessThanOrEqual(
      enhancementRules.maxLevel,
    );
  });

  it("Đá Hộ Mệnh tiêu hao khi bật, chặn mất cấp, và bị từ chối khi không có đá", () => {
    const w = setup(),
      id = weapon(w).id;
    weapon(w).enhancement = 13;
    const ward = wardCount(w);
    let attempts = 0;
    for (let round = 0; round < 12; round++) {
      const before = wardCount(w);
      // Giữ cấp và nguyên liệu cố định để mỗi vòng đều là một lần đập hợp lệ.
      weapon(w).enhancement = 13;
      addItem(w.state, "ore", 50);
      send(w, { type: "enhance", instanceId: id, protect: true });
      attempts++;
      expect(wardCount(w)).toBe(before - 1);
      const record = w.state.enhanceLog!.at(-1)!;
      if (!record.success) expect(record.to).toBe(record.from);
      else expect(record.to).toBe(record.from + 1);
    }
    expect(wardCount(w)).toBe(ward - attempts);
    // Hết đá thì lệnh bị từ chối nguyên tử.
    const inventory = w.state.inventory
      .filter((i) => i.definitionId !== "ward-stone")
      .map((i) => i.id);
    w.state.inventory = w.state.inventory.filter((i) =>
      inventory.includes(i.id),
    );
    const gold = w.state.gold,
      level = weapon(w).enhancement,
      events = send(w, { type: "enhance", instanceId: id, protect: true });
    expect(events.some((e) => e.type === "error")).toBe(true);
    expect(w.state.gold).toBe(gold);
    expect(weapon(w).enhancement).toBe(level);
  });

  it("chi phí mỗi lần đập gồm bạc, Huyền Thiết và phí bảo vệ; thiếu thì nguyên tử", () => {
    const w = setup(),
      id = weapon(w).id;
    weapon(w).enhancement = 6;
    const gold = w.state.gold,
      ore = oreCount(w),
      ward = wardCount(w);
    send(w, { type: "enhance", instanceId: id, protect: true });
    expect(w.state.gold).toBe(
      gold -
        (enhancementRules.baseGold +
          6 * enhancementRules.goldPerLevel +
          enhancementRules.protectionGold),
    );
    expect(oreCount(w)).toBe(ore - (enhancementRules.baseOre + 6));
    expect(wardCount(w)).toBe(ward - 1);

    const before = w.snapshot();
    w.state.gold = 0;
    const events = send(w, { type: "enhance", instanceId: id });
    expect(events.some((e) => e.type === "error")).toBe(true);
    expect(w.state.equipment).toEqual(before.equipment);
    expect(w.state.inventory).toEqual(before.inventory);
  });

  it("đạt trần +15 thì từ chối và không trừ phí", () => {
    const w = setup(),
      id = weapon(w).id;
    weapon(w).enhancement = enhancementRules.maxLevel;
    const gold = w.state.gold,
      ore = oreCount(w),
      events = send(w, { type: "enhance", instanceId: id });
    expect(events.some((e) => e.type === "error")).toBe(true);
    expect(w.state.gold).toBe(gold);
    expect(oreCount(w)).toBe(ore);
    expect(weapon(w).enhancement).toBe(enhancementRules.maxLevel);
  });

  it("log giới hạn 20 dòng, giữ qua save/load, save chấp nhận +15", () => {
    const w = setup(),
      id = weapon(w).id;
    weapon(w).enhancement = 9;
    for (let attempt = 0; attempt < 40; attempt++) {
      addItem(w.state, "ore", 20);
      send(w, { type: "enhance", instanceId: id, protect: true });
      weapon(w).enhancement = 9;
    }
    expect(w.state.enhanceLog).toHaveLength(20);
    weapon(w).enhancement = enhancementRules.maxLevel;
    const saved = w.snapshot();
    const validated = validateSave(saved);
    expect(validated.equipment.weapon.enhancement).toBe(
      enhancementRules.maxLevel,
    );
    expect(validated.enhanceLog).toEqual(saved.enhanceLog);
    const restored = new GameWorld(validated);
    expect(restored.snapshot()).toEqual(saved);
    expect(restored.state.enhanceLog).toHaveLength(20);
  });

  it("replay xác định: cùng save và cùng lệnh cho cùng kết quả cường hóa", () => {
    const w = setup(),
      id = weapon(w).id;
    weapon(w).enhancement = 12;
    send(w, { type: "enhance", instanceId: id });
    const saved = w.snapshot();
    const run = () => {
      const world = new GameWorld(saved);
      world.state.paused = true;
      world.player.x = 18;
      world.player.y = 12;
      for (let attempt = 0; attempt < 8; attempt++) {
        send(world, { type: "enhance", instanceId: id, protect: true });
        world.state.gold = 500000;
        addItem(world.state, "ore", 99);
        addItem(world.state, "ward-stone", 5);
      }
      return world;
    };
    const a = run(),
      b = run();
    expect(a.snapshot()).toEqual(b.snapshot());
    expect(a.state.rngState).toBe(b.state.rngState);
    expect(
      (a.state.enhanceLog ?? []).map((r) => `${r.from}:${r.to}:${r.success}`),
    ).toEqual(
      (b.state.enhanceLog ?? []).map((r) => `${r.from}:${r.to}:${r.success}`),
    );
  });

  it("Đá Hộ Mệnh là vật phẩm có nguồn mua ở thợ rèn và dùng được", () => {
    const w = setup(),
      id = weapon(w).id;
    weapon(w).enhancement = 10;
    const stone: ItemInstance = w.state.inventory.find(
      (i) => i.definitionId === enhancementRules.protectionItemId,
    )!;
    expect(stone).toBeDefined();
    send(w, { type: "lockItem", instanceId: stone.id, locked: true });
    const events = send(w, { type: "enhance", instanceId: id, protect: true });
    expect(events.some((e) => e.type === "error")).toBe(true);
    expect(w.state.enhanceLog).toHaveLength(0);
  });
});
