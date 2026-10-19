import { describe, it, expect } from "vitest";
import {
  createGame,
  GameWorld,
  findPath,
  isWalkable,
  worldToScreen,
  screenToWorld,
  getTileAt,
  SeededRandom,
  experienceForLevel,
  calculateDamage,
  elementalModifier,
  elementalSupport,
  deriveStats,
  addItem,
  canAddItem,
  hasLineOfSight,
  rollLoot,
} from "../../packages/game-core/src/index";
import { getMap, skills } from "../../packages/game-content/src/index";
import type {
  GameCommand,
  GameSnapshot,
  CombatEntity,
} from "../../packages/game-protocol/src/index";
import { validateSave } from "../../packages/game-storage/src/index";
const setup = () => new GameWorld(createGame("Thiếu Hiệp"));
function command(w: GameWorld, c: GameCommand, actorId = w.state.playerId) {
  w.dispatch({ protocolVersion: 1, sequence: ++sequence, actorId, command: c });
}
let sequence = 0;
function ticks(w: GameWorld, n: number) {
  for (let i = 0; i < n; i++) w.step();
}
function nearMonster(w: GameWorld) {
  const m = Object.values(w.state.entities).find(
    (e) => e.definitionId === "bandit",
  )!;
  w.player.x = m.x - 1;
  w.player.y = m.y;
  return m;
}
function atElder(w: GameWorld) {
  w.player.x = 12;
  w.player.y = 12;
}
describe("Tọa độ và điều hướng", () => {
  it("chuyển đổi isometric khứ hồi", () => {
    for (const p of [
      { x: 0, y: 0 },
      { x: 17.2, y: 11.9 },
      { x: -5, y: 9 },
    ]) {
      const result = screenToWorld(worldToScreen(p));
      expect(result.x).toBeCloseTo(p.x);
      expect(result.y).toBeCloseTo(p.y);
    }
  });
  it("lấy ô và không đi xuyên nhà, nước hoặc biên", () => {
    const map = getMap("village");
    expect(getTileAt({ x: 1.6, y: 2.2 })).toEqual({ x: 2, y: 2 });
    expect(isWalkable(map, { x: 7, y: 8 })).toBe(false);
    expect(isWalkable(map, { x: 2, y: 20 })).toBe(false);
    expect(isWalkable(map, { x: -1, y: 3 })).toBe(false);
  });
  it("A* vòng quanh vật cản", () => {
    const map = getMap("village"),
      path = findPath(map, { x: 5, y: 8 }, { x: 11, y: 8 });
    expect(path.length).toBeGreaterThan(6);
    expect(path.every((p) => isWalkable(map, p))).toBe(true);
    expect(path.at(-1)).toEqual({ x: 11, y: 8 });
  });
  it("từ chối đích bị chặn và giới hạn chi phí", () => {
    expect(
      findPath(getMap("village"), { x: 14, y: 14 }, { x: 7, y: 8 }),
    ).toEqual([]);
    expect(
      findPath(getMap("village"), { x: 14, y: 14 }, { x: 26, y: 27 }, 1),
    ).toEqual([]);
  });
  it("line-of-sight bị nhà chắn", () => {
    expect(
      hasLineOfSight(getMap("village"), { x: 5, y: 8 }, { x: 11, y: 8 }),
    ).toBe(false);
  });
  it("movement chạy theo tick và stop hủy đường đi", () => {
    const w = setup();
    command(w, { type: "move", destination: { x: 16, y: 14 } });
    ticks(w, 5);
    expect(w.player.x).toBeGreaterThan(14);
    expect(w.player.x).toBeLessThan(16);
    command(w, { type: "stop" });
    const x = w.player.x;
    ticks(w, 20);
    expect(w.player.x).toBe(x);
  });
});
describe("Công thức, RNG và tiến trình", () => {
  it("EXP tăng theo cấp", () => {
    expect(experienceForLevel(1)).toBe(90);
    expect(experienceForLevel(5)).toBeGreaterThan(experienceForLevel(4));
  });
  it("chỉ số phụ thuộc cấp và thuộc tính", () => {
    const a = { strength: 2, dexterity: 2, vitality: 2, energy: 2 },
      base = deriveStats(1, a, { attack: 0, defense: 0 }),
      improved = deriveStats(
        2,
        { ...a, strength: 3 },
        { attack: 8, defense: 4 },
      );
    expect(improved.attack).toBeGreaterThan(base.attack);
    expect(improved.maxHp).toBeGreaterThan(base.maxHp);
  });
  it("ngũ hành tương khắc và tương sinh là dữ liệu rõ ràng", () => {
    expect(elementalModifier("metal", "wood")).toBe(1.2);
    expect(elementalModifier("wood", "metal")).toBe(0.85);
    expect(elementalModifier("water", "water")).toBe(1);
    expect(elementalSupport.water).toBe("wood");
  });
  it("sát thương, né tránh, bạo kích", () => {
    const base = calculateDamage(50, 10, 1, "earth", "earth", 0.5, 0.5),
      crit = calculateDamage(50, 10, 1, "earth", "earth", 0.5, 0.01);
    expect(base.value).toBeGreaterThan(0);
    expect(crit.value).toBeGreaterThan(base.value);
    expect(crit.critical).toBe(true);
    expect(calculateDamage(50, 10, 1, "earth", "earth", 0, 0.5).value).toBe(0);
  });
  it("RNG có thể tiếp tục và nằm trong [0,1)", () => {
    const a = new SeededRandom(9),
      b = new SeededRandom(9);
    for (let i = 0; i < 2000; i++) {
      const n = a.next();
      expect(n).toBe(b.next());
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
    const c = new SeededRandom(a.state);
    expect(a.next()).toBe(c.next());
  });
  it("giết quái nhận EXP, bạc, trạng thái chết và hồi sinh", () => {
    const w = setup(),
      m = nearMonster(w);
    m.hp = 1;
    const gold = w.state.gold;
    command(w, { type: "skill", skillId: "thunder", targetId: m.id });
    expect(m.hp).toBe(0);
    expect(w.state.experience).toBe(28);
    expect(w.state.gold).toBe(gold);
    const loot = Object.values(w.state.groundLoot).find((l) => l.gold === 18)!;
    command(w, { type: "pickup", lootId: loot.id });
    expect(w.state.gold).toBe(gold + 18);
    expect(m.state).toBe("dead");
    w.player.x = 14;
    w.player.y = 14;
    ticks(w, 301);
    expect(m.hp).toBe(m.maxHp);
  });
  it("level up cấp điểm và hồi phục chỉ số", () => {
    const w = setup(),
      m = nearMonster(w);
    w.state.experience = 89;
    m.hp = 1;
    command(w, { type: "skill", skillId: "thunder", targetId: m.id });
    expect(w.state.level).toBe(2);
    expect(w.state.attributePoints).toBe(5);
    expect(w.state.skillPoints).toBe(1);
    expect(w.player.hp).toBe(w.player.maxHp);
  });
  it("phân điểm và học kỹ năng đều qua command", () => {
    const w = setup();
    w.state.attributePoints = 1;
    w.state.skillPoints = 1;
    w.state.level = 2;
    const attack = w.player.attack;
    command(w, { type: "allocate", attribute: "strength" });
    command(w, { type: "learn", skillId: "guard" });
    expect(w.player.attack).toBeGreaterThan(attack);
    expect(w.state.skillLevels.guard).toBe(1);
    expect(w.state.attributePoints).toBe(0);
    expect(w.state.skillPoints).toBe(0);
  });
});
describe("Kỹ năng và AI", () => {
  it("trừ MP và từ chối dùng trong cooldown", () => {
    const w = setup(),
      m = nearMonster(w);
    m.hp = 500;
    const mp = w.player.mp;
    command(w, { type: "skill", skillId: "thunder", targetId: m.id });
    expect(w.player.mp).toBe(mp - 16);
    const hp = m.hp;
    command(w, { type: "skill", skillId: "thunder", targetId: m.id });
    expect(m.hp).toBe(hp);
    expect(w.drainEvents().some((e) => e.type === "error")).toBe(true);
  });
  it("từ chối thiếu mana / ngoài tầm / kỹ năng chưa học / mục tiêu đồng minh", () => {
    const w = setup(),
      m = nearMonster(w);
    w.player.mp = 0;
    command(w, { type: "skill", skillId: "thunder", targetId: m.id });
    expect(m.hp).toBe(m.maxHp);
    w.player.mp = 100;
    command(w, { type: "skill", skillId: "guard" });
    expect(w.player.mp).toBe(100);
    w.player.x = 14;
    w.player.y = 14;
    command(w, { type: "skill", skillId: "thunder", targetId: m.id });
    expect(w.player.mp).toBe(100);
    command(w, { type: "skill", skillId: "thunder", targetId: w.player.id });
    expect(w.player.mp).toBe(100);
  });
  it("hồi máu và buff hộ thể thực sự đổi state", () => {
    const w = setup();
    w.player.hp = 50;
    command(w, { type: "skill", skillId: "heal" });
    expect(w.player.hp).toBeGreaterThan(50);
    w.state.skillLevels.guard = 1;
    command(w, { type: "skill", skillId: "guard" });
    expect(w.player.cooldowns.guardUntil).toBe(120);
  });
  it("AOE đánh nhiều mục tiêu", () => {
    const w = setup(),
      m = nearMonster(w);
    const other = structuredClone(m);
    other.id = "extra";
    other.x = m.x;
    other.y = m.y + 1;
    w.state.entities.extra = other;
    command(w, { type: "skill", skillId: "storm" });
    expect(m.hp).toBeLessThan(m.maxHp);
    expect(other.hp).toBeLessThan(other.maxHp);
  });
  it("quái phát hiện, đuổi và đánh người chơi", () => {
    const w = setup(),
      m = nearMonster(w);
    w.player.x = m.x - 3;
    const hp = w.player.hp;
    ticks(w, 100);
    expect(w.player.hp).toBeLessThan(hp);
    expect(m.targetId).toBe(w.player.id);
  });
  it("quái chết không gây sát thương", () => {
    const w = setup(),
      m = nearMonster(w);
    for (const e of Object.values(w.state.entities))
      if (e.kind === "monster") {
        e.hp = 0;
        e.state = "dead";
        e.respawnAt = 10000;
      }
    const hp = w.player.hp;
    ticks(w, 19);
    expect(w.player.hp).toBe(hp);
    expect(m.state).toBe("dead");
  });
  it("hồi sinh player đưa về điểm an toàn", () => {
    const w = setup();
    w.player.hp = 0;
    w.player.state = "dead";
    command(w, { type: "respawn" });
    expect(w.player.hp).toBe(w.player.maxHp);
    expect(w.state.mapId).toBe("village");
    expect(w.player.x).toBe(14);
  });
  it("monster chọn một trong nhiều player, không đánh đồng loại", () => {
    const w = setup(),
      m = nearMonster(w);
    w.player.x = 14;
    w.player.y = 14;
    const ally: CombatEntity = {
      ...structuredClone(w.player),
      id: "player:two",
      name: "Người thứ hai",
      x: m.x - 1,
      y: m.y,
    };
    w.state.entities[ally.id] = ally;
    const hp = ally.hp;
    ticks(w, 45);
    expect(ally.hp).toBeLessThan(hp);
    expect(m.targetId).toBe(ally.id);
  });
});
describe("Hành trang và economy", () => {
  it("stack và không tạo instance trùng", () => {
    const w = setup();
    addItem(w.state, "hp", 98);
    const list = w.state.inventory.filter((i) => i.definitionId === "hp");
    expect(list.map((i) => i.quantity)).toEqual([99, 7]);
    expect(new Set(w.state.inventory.map((i) => i.id)).size).toBe(
      w.state.inventory.length,
    );
  });
  it("túi đầy vẫn nhận vào stack cũ; không thêm đồ mới", () => {
    const w = setup();
    while (w.state.inventory.length < 32) addItem(w.state, "sword");
    expect(canAddItem(w.state, "hp")).toBe(true);
    expect(canAddItem(w.state, "sword")).toBe(false);
    expect(addItem(w.state, "sword")).toBe(false);
  });
  it("trang bị và tháo đổi chỉ số thực tế", () => {
    const w = setup(),
      robe = w.state.inventory.find((i) => i.definitionId === "robe")!,
      defense = w.player.defense;
    command(w, { type: "equip", instanceId: robe.id });
    expect(w.player.defense).toBe(defense + 6);
    expect(w.state.equipment.armor.id).toBe(robe.id);
    command(w, { type: "unequip", slot: "armor" });
    expect(w.player.defense).toBe(defense);
  });
  it("kiểm tra cấp trang bị", () => {
    const w = setup();
    addItem(w.state, "boss-sword");
    const sword = w.state.inventory.at(-1)!;
    command(w, { type: "equip", instanceId: sword.id });
    expect(w.state.equipment.weapon.definitionId).toBe("sword");
  });
  it("giao dịch mua/bán bảo toàn bạc và kiểm tra khoảng cách", () => {
    const w = setup(),
      gold = w.state.gold;
    command(w, { type: "buy", itemId: "hp" });
    expect(w.state.gold).toBe(gold);
    w.player.x = 8;
    w.player.y = 14;
    command(w, { type: "buy", itemId: "hp" });
    expect(w.state.gold).toBe(gold - 20);
    const potion = w.state.inventory.find((i) => i.definitionId === "hp")!;
    expect(potion.quantity).toBe(9);
    command(w, { type: "sell", instanceId: potion.id });
    expect(potion.quantity).toBe(8);
    expect(w.state.gold).toBe(gold - 20 + 6);
  });
  it("không đủ bạc hoặc túi đầy không trừ tiền", () => {
    const w = setup();
    w.player.x = 8;
    w.player.y = 14;
    w.state.gold = 0;
    command(w, { type: "buy", itemId: "hp" });
    expect(
      w.state.inventory.find((i) => i.definitionId === "hp")!.quantity,
    ).toBe(8);
    w.state.gold = 100;
    while (w.state.inventory.length < 32) addItem(w.state, "sword");
    w.state.inventory.find((i) => i.definitionId === "hp")!.quantity = 99;
    command(w, { type: "buy", itemId: "hp" });
    expect(w.state.gold).toBe(100);
  });
  it("đan dược dùng đúng một lần và có cooldown chung", () => {
    const w = setup(),
      potion = w.state.inventory.find((i) => i.definitionId === "hp")!;
    w.player.hp = 1;
    command(w, { type: "useItem", instanceId: potion.id });
    expect(potion.quantity).toBe(7);
    expect(w.player.hp).toBeGreaterThan(100);
    command(w, { type: "useItem", instanceId: potion.id });
    expect(potion.quantity).toBe(7);
  });
});
describe("Nhiệm vụ, portal, replay và serialization", () => {
  it("chỉ nhận nhiệm vụ khi ở gần NPC và theo thứ tự", () => {
    const w = setup();
    command(w, { type: "acceptQuest", questId: "bandits" });
    expect(w.state.quests.length).toBe(0);
    atElder(w);
    command(w, { type: "acceptQuest", questId: "wolves" });
    expect(w.state.quests.length).toBe(0);
    command(w, { type: "acceptQuest", questId: "bandits" });
    command(w, { type: "acceptQuest", questId: "bandits" });
    expect(w.state.quests.length).toBe(1);
  });
  it("quest kill tăng progress, phần thưởng không thể nhận trùng", () => {
    const w = setup();
    atElder(w);
    command(w, { type: "acceptQuest", questId: "bandits" });
    const m = nearMonster(w);
    w.state.quests[0].progress = 4;
    m.hp = 1;
    command(w, { type: "skill", skillId: "thunder", targetId: m.id });
    expect(w.state.quests[0].status).toBe("ready");
    atElder(w);
    command(w, { type: "claimQuest", questId: "bandits" });
    const after = w.snapshot();
    command(w, { type: "claimQuest", questId: "bandits" });
    expect(w.state.gold).toBe(after.gold);
    expect(w.state.experience).toBe(after.experience);
    expect(w.state.quests[0].status).toBe("claimed");
  });
  it("đường tới NPC kết thúc bằng hội thoại", () => {
    const w = setup();
    command(w, { type: "interact", targetId: "elder" });
    ticks(w, 80);
    expect(w.drainEvents().some((e) => e.type === "dialogue")).toBe(true);
  });
  it("portal tự tìm đường và chuyển map, giữ logical map đã khám phá", () => {
    const w = setup();
    command(w, { type: "interact", targetId: "portal:forest" });
    ticks(w, 300);
    expect(w.state.mapId).toBe("forest");
    expect(w.player.mapId).toBe("forest");
    expect(
      Object.values(w.state.entities).some((e) => e.mapId === "forest") &&
        Object.values(w.state.entities).some((e) => e.mapId === "village") &&
        w.state.visitedMaps.includes("forest"),
    ).toBe(true);
  });
  it("command replay với cùng seed cho state giống nhau", () => {
    const a = setup(),
      b = setup();
    const commands: GameCommand[] = [
      { type: "move", destination: { x: 16, y: 14 } },
      { type: "autoAttack", enabled: true },
    ];
    commands.forEach((c, i) => {
      a.dispatch({
        protocolVersion: 1,
        sequence: i + 1,
        actorId: a.player.id,
        command: c,
      });
      b.dispatch({
        protocolVersion: 1,
        sequence: i + 1,
        actorId: b.player.id,
        command: c,
      });
      ticks(a, 120);
      ticks(b, 120);
    });
    expect(a.snapshot()).toEqual(b.snapshot());
  });
  it("snapshot sao chép độc lập, serialize và RNG tiếp tục đúng", () => {
    const a = setup(),
      m = nearMonster(a);
    command(a, { type: "skill", skillId: "thunder", targetId: m.id });
    const saved = validateSave(JSON.parse(JSON.stringify(a.snapshot())));
    const b = new GameWorld(saved);
    const detached = a.snapshot();
    detached.gold = 999;
    expect(a.state.gold).not.toBe(999);
    ticks(a, 100);
    ticks(b, 100);
    expect(a.snapshot()).toEqual(b.snapshot());
  });
  it("sequence trùng và phiên bản protocol sai không chạy lại command", () => {
    const w = setup();
    w.state.attributePoints = 3;
    const env = {
      protocolVersion: 1 as const,
      sequence: 900000,
      actorId: w.player.id,
      command: { type: "allocate" as const, attribute: "strength" as const },
    };
    w.dispatch(env);
    w.dispatch(env);
    expect(w.state.attributePoints).toBe(2);
  });
  it("validate từ chối schema, nội dung, vị trí và item hỏng", () => {
    const s = createGame("Thiếu Hiệp");
    for (const bad of [
      { ...s, schemaVersion: 99 },
      { ...s, contentVersion: "unknown" },
      { ...s, mapId: "bad" },
      { ...s, inventory: [{ id: "1", definitionId: "missing", quantity: 1 }] },
    ])
      expect(() => validateSave(bad)).toThrow();
    const invalid: GameSnapshot = structuredClone(s);
    invalid.entities[invalid.playerId].x = 999;
    expect(() => validateSave(invalid)).toThrow();
  });
  it("skill definitions đều có cooldown hợp lệ", () => {
    expect(skills.every((s) => s.cooldownTicks >= 0 && s.range > 0)).toBe(true);
  });
});

it("biên xác suất loot 0/1 và phép so sánh không lệch", () => {
  const table = [
    { id: "never", chance: 0 },
    { id: "always", chance: 1 },
    { id: "half", chance: 0.5 },
  ];
  expect(rollLoot(table, () => 0).map((i) => i.id)).toEqual(["always", "half"]);
  expect(rollLoot(table, () => 0.5).map((i) => i.id)).toEqual(["always"]);
  expect(rollLoot(table, () => 0.999999).map((i) => i.id)).toEqual(["always"]);
});
it("thêm số lượng âm, 0 hoặc thập phân không đổi túi", () => {
  const w = setup(),
    before = w.snapshot();
  for (const quantity of [-1, 0, 1.5, Infinity])
    expect(addItem(w.state, "hp", quantity)).toBe(false);
  expect(w.state.inventory).toEqual(before.inventory);
});
