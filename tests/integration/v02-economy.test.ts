import { describe, it, expect } from "vitest";
import {
  createGame,
  GameWorld,
  addItem,
  itemBonuses,
} from "../../packages/game-core/src/index";
import {
  resourceNodes,
  enhancementRules,
} from "../../packages/game-content/src/index";
import { validateSave } from "../../packages/game-storage/src/index";
import type { GameCommand } from "../../packages/game-protocol/src/index";
function setup() {
  const w = new GameWorld(createGame("Thợ Rèn", "wudang", "economy-v2"));
  w.player.x = 18;
  w.player.y = 12;
  w.state.gold = 10000;
  addItem(w.state, "ore", 99);
  addItem(w.state, "wood", 99);
  addItem(w.state, "herb", 99);
  return w;
}
let sequence = 0;
const send = (w: GameWorld, command: GameCommand) =>
  w.dispatch({
    protocolVersion: 1,
    sequence: ++sequence,
    actorId: w.player.id,
    command,
  });
describe("Kinh tế / chế tạo / cường hóa / kho", () => {
  it("cường hóa trừ đúng nguyên liệu/bạc và thay công kích, từ chối nguyên tử khi thiếu", () => {
    const w = setup(),
      id = w.state.equipment.weapon.id,
      attack = w.player.attack,
      gold = w.state.gold,
      ore = w.state.inventory.find((i) => i.definitionId === "ore")!.quantity;
    send(w, { type: "enhance", instanceId: id });
    expect(w.state.equipment.weapon.enhancement).toBe(1);
    expect(w.state.gold).toBe(gold - enhancementRules.baseGold);
    expect(
      w.state.inventory.find((i) => i.definitionId === "ore")!.quantity,
    ).toBe(ore - 1);
    expect(w.player.attack).toBeGreaterThan(attack);
    w.state.gold = 0;
    const before = w.snapshot();
    send(w, { type: "enhance", instanceId: id });
    expect(w.state.inventory).toEqual(before.inventory);
    expect(w.state.equipment).toEqual(before.equipment);
    expect(w.state.gold).toBe(0);
  });
  it("vật phẩm khóa không bán hoặc bị tiêu hao trong công thức", () => {
    const w = setup(),
      ore = w.state.inventory.find((i) => i.definitionId === "ore")!;
    send(w, { type: "lockItem", instanceId: ore.id, locked: true });
    const before = w.snapshot();
    send(w, { type: "sell", instanceId: ore.id });
    send(w, { type: "craft", recipeId: "forge-sword" });
    expect(w.state.gold).toBe(before.gold);
    expect(w.state.inventory).toEqual(before.inventory);
  });
  it("công thức chỉ commit khi đủ mọi điều kiện và cấp nghề tăng theo XP", () => {
    const w = setup();
    const gold = w.state.gold;
    send(w, { type: "craft", recipeId: "forge-sword" });
    expect(w.state.inventory.some((i) => i.definitionId === "sword")).toBe(
      true,
    );
    expect(w.state.gold).toBe(gold - 60);
    expect(w.state.professionXp.weaponsmith).toBe(25);
    expect(new Set(w.state.inventory.map((i) => i.id)).size).toBe(
      w.state.inventory.length,
    );
    const saved = validateSave(w.snapshot());
    expect(saved.inventory).toEqual(w.state.inventory);
    w.player.x = 14;
    w.player.y = 14;
    const before = w.snapshot();
    send(w, { type: "craft", recipeId: "forge-sword" });
    expect(w.state.inventory).toEqual(before.inventory);
    expect(w.state.gold).toBe(before.gold);
  });
  it("túi đầy nhưng vật liệu dùng hết giải phóng ô thì chế tạo hợp lệ; thất bại không mất vật liệu", () => {
    const w = setup();
    w.state.inventory = [];
    addItem(w.state, "ore", 3);
    addItem(w.state, "wood", 2);
    while (w.state.inventory.length < 32) addItem(w.state, "sword");
    send(w, { type: "craft", recipeId: "forge-sword" });
    expect(w.state.inventory).toHaveLength(31);
    expect(
      w.state.inventory.filter((i) => i.definitionId === "sword"),
    ).toHaveLength(31);
    const full = setup();
    while (full.state.inventory.length < 32) addItem(full.state, "sword");
    const before = full.snapshot();
    send(full, { type: "craft", recipeId: "forge-sword" });
    expect(full.state.inventory).toEqual(before.inventory);
    expect(full.state.gold).toBe(before.gold);
    expect(full.state.professionXp).toEqual(before.professionXp);
  });
  it("khảm/tháo ngọc bảo toàn instance, stats và chi phí; không nhân đôi khi bấm lại", () => {
    const w = setup(),
      id = w.state.equipment.weapon.id;
    addItem(w.state, "jade-gem");
    const gem = w.state.inventory.find((i) => i.definitionId === "jade-gem")!,
      gold = w.state.gold,
      attack = w.player.attack;
    send(w, { type: "socket", instanceId: id, gemInstanceId: gem.id });
    expect(w.state.equipment.weapon.gems).toEqual(["jade-gem"]);
    expect(w.player.attack).toBe(attack + 4);
    expect(w.state.gold).toBe(gold - 40);
    send(w, { type: "socket", instanceId: id, gemInstanceId: gem.id });
    expect(w.state.gold).toBe(gold - 40);
    send(w, { type: "removeGem", instanceId: id, socket: 0 });
    expect(w.player.attack).toBe(attack);
    expect(w.state.gold).toBe(gold - 140);
    expect(
      w.state.inventory
        .filter((i) => i.definitionId === "jade-gem")
        .reduce((n, i) => n + i.quantity, 0),
    ).toBe(1);
    send(w, { type: "removeGem", instanceId: id, socket: 0 });
    expect(w.state.gold).toBe(gold - 140);
  });
  it("giới hạn số ô ngọc dựa trên cấp cường hóa", () => {
    const w = setup(),
      id = w.state.equipment.weapon.id;
    addItem(w.state, "jade-gem", 3);
    const gem = w.state.inventory.find((i) => i.definitionId === "jade-gem")!;
    send(w, { type: "socket", instanceId: id, gemInstanceId: gem.id });
    const gold = w.state.gold;
    send(w, { type: "socket", instanceId: id, gemInstanceId: gem.id });
    expect(w.state.gold).toBe(gold);
    for (let i = 0; i < 3; i++) {
      send(w, { type: "enhance", instanceId: id });
      for (let t = 0; t < 10; t++) w.step();
    }
    send(w, { type: "socket", instanceId: id, gemInstanceId: gem.id });
    expect(w.state.equipment.weapon.gems).toHaveLength(2);
    expect(itemBonuses(w.state.equipment.weapon).attack).toBeGreaterThan(16);
  });
  it("gửi/rút kho giữ metadata, yêu cầu gần NPC và không nhân đôi vật phẩm", () => {
    const w = setup(),
      robe = w.state.inventory.find((i) => i.definitionId === "robe")!;
    robe.enhancement = 3;
    robe.gems = ["jade-gem"];
    send(w, { type: "deposit", instanceId: robe.id });
    expect(w.state.warehouse).toHaveLength(0);
    w.player.x = 12;
    w.player.y = 12;
    send(w, { type: "deposit", instanceId: robe.id });
    send(w, { type: "deposit", instanceId: robe.id });
    expect(w.state.warehouse).toHaveLength(1);
    expect(w.state.inventory.some((i) => i.id === robe.id)).toBe(false);
    const saved = validateSave(w.snapshot()),
      restored = new GameWorld(saved);
    send(restored, { type: "withdraw", instanceId: robe.id });
    expect(restored.state.warehouse).toHaveLength(0);
    expect(
      restored.state.inventory.find((i) => i.id === robe.id)?.gems,
    ).toEqual(["jade-gem"]);
  });
  it("thu thập, nghề, quest collect, cooldown tài nguyên và pause đều dùng game clock", () => {
    const w = setup();
    w.player.x = 8;
    w.player.y = 14;
    send(w, { type: "acceptQuest", questId: "herbalist" });
    const node = resourceNodes.find((n) => n.id === "village-herb")!;
    w.player.x = node.x;
    w.player.y = node.y;
    send(w, { type: "gather", nodeId: node.id });
    expect(w.state.professionXp.herbalism).toBe(15);
    expect(w.state.quests[0].progress).toBe(2);
    const count = w.state.inventory
      .filter((i) => i.definitionId === "herb")
      .reduce((n, i) => n + i.quantity, 0);
    send(w, { type: "gather", nodeId: node.id });
    expect(
      w.state.inventory
        .filter((i) => i.definitionId === "herb")
        .reduce((n, i) => n + i.quantity, 0),
    ).toBe(count);
    send(w, { type: "pause", paused: true });
    for (let i = 0; i < node.respawnTicks; i++) w.step();
    expect(w.state.tick).toBe(0);
    send(w, { type: "pause", paused: false });
    for (let i = 0; i <= node.respawnTicks; i++) {
      w.step();
      if (i % 20 === 0) w.drainEvents();
    }
    send(w, { type: "gather", nodeId: node.id });
    expect(w.state.quests[0].status).toBe("ready");
  });
  it("quest tuần hoàn chỉ mở lại sau đúng thời hạn; reward không lặp trong cùng lượt", () => {
    const w = setup();
    w.player.x = 12;
    w.player.y = 12;
    w.state.quests = [
      { id: "bandits", status: "claimed", progress: 5 },
      { id: "daily-bandits", status: "ready", progress: 8 },
    ];
    send(w, { type: "claimQuest", questId: "daily-bandits" });
    const gold = w.state.gold;
    send(w, { type: "claimQuest", questId: "daily-bandits" });
    send(w, { type: "acceptQuest", questId: "daily-bandits" });
    expect(w.state.gold).toBe(gold);
    expect(w.state.quests[1].status).toBe("claimed");
    w.state.tick = 24000;
    send(w, { type: "acceptQuest", questId: "daily-bandits" });
    expect(w.state.quests[1].status).toBe("active");
    expect(w.state.quests[1].progress).toBe(0);
    expect(w.state.quests[1].completions).toBe(1);
  });
});
