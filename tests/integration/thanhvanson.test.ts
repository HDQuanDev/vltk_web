import { describe, expect, it } from "vitest";
import {
  GameWorld,
  addItem,
  createGame,
  findPath,
  invalidateNavigation,
  isWalkable,
  itemBonuses,
  rollAffixes,
  spawnMonster,
} from "../../packages/game-core/src/index";
import {
  getItem,
  getMap,
  items,
  monsters,
  npcs,
  quests,
  resourceNodes,
  type MapDefinition,
} from "../../packages/game-content/src/index";
import { validateSave } from "../../packages/game-storage/src/index";
import type { GameCommand } from "../../packages/game-protocol/src/index";

const MAP = "thanhvanson";
const map = () => getMap(MAP);
/** Nhân vật đứng ở sơn môn (không có zone nào trong bán kính kích hoạt). */
function world(seed = 777) {
  const s = createGame("Vân Khách", "wudang", `tv-${seed}`, seed);
  s.mapId = MAP;
  s.visitedMaps.push(MAP);
  Object.assign(s.entities[s.playerId], {
    mapId: MAP,
    ...map().spawn,
  });
  return new GameWorld(s);
}
let sequence = 0;
const send = (w: GameWorld, command: GameCommand, actorId = w.state.playerId) =>
  w.dispatch({
    protocolVersion: 1,
    sequence: ++sequence,
    actorId,
    command,
  });
const ticks = (w: GameWorld, n: number) => {
  for (let i = 0; i < n; i++) {
    w.step();
    w.drainEvents();
  }
};
const walkableTargets = (m: MapDefinition) => [
  ...m.areas!.map((a) => [a.id, a] as const),
  ...npcs.filter((n) => n.mapId === m.id).map((n) => [n.id, n] as const),
  ...resourceNodes
    .filter((n) => n.mapId === m.id)
    .map((n) => [n.id, n] as const),
  ...m.portals.map((p) => [p.id, p] as const),
  ...(m.spawnZones ?? []).map(
    (z) =>
      [
        z.id,
        z.area.kind === "circle"
          ? { x: z.area.x, y: z.area.y }
          : z.area.points[0],
      ] as const,
  ),
];

describe("Thanh Vân Sơn — bản đồ luyện cấp lớn", () => {
  it("320×320 có rừng, sông/hồ, cầu, vách đá, POI và liên kết đều đi được", () => {
    const m = map();
    expect(m.width).toBe(320);
    expect(m.height).toBe(320);
    expect(m.props.length).toBeGreaterThan(1000);
    expect(m.water!.length).toBeGreaterThan(100);
    expect(m.bridges!.length).toBeGreaterThan(10);
    expect(m.areas!.length).toBeGreaterThanOrEqual(12);
    expect(m.spawnZones!.length).toBeGreaterThanOrEqual(10);
    expect(
      m.areas!.filter((a) => a.kind === "explore").length,
    ).toBeGreaterThanOrEqual(4);
    expect(m.areas!.some((a) => a.kind === "boss")).toBe(true);
    expect(m.props.some((p) => p.type === "house")).toBe(true);
    expect(m.props.some((p) => p.type === "rock")).toBe(true);
    invalidateNavigation(m);
    for (const [id, point] of walkableTargets(m)) {
      expect(isWalkable(m, point), `walkable ${id}`).toBe(true);
      const path = findPath(m, m.spawn, point, 8192);
      expect(path.length, `route ${id}`).toBeGreaterThan(0);
    }
    // Hai bờ sông chỉ qua được cầu: bờ đông vẫn tới được từ sơn môn.
    const east = m.areas!.find((a) => a.id === "cliff-watch")!;
    expect(findPath(m, m.spawn, east, 8192).length).toBeGreaterThan(0);
  });

  it("bãi quái mới spawn quái mới, có tinh anh và boss ở Vân Đỉnh", () => {
    const w = world(),
      camp = map().spawnZones!.find((z) => z.id === "wolf-den")!;
    Object.assign(w.player, {
      x: camp.area.kind === "circle" ? camp.area.x : camp.area.points[0].x,
      y: camp.area.kind === "circle" ? camp.area.y : camp.area.points[0].y,
    });
    ticks(w, 320);
    const monsters = Object.values(w.state.entities).filter(
      (e) => e.kind === "monster" && e.mapId === MAP,
    );
    expect(monsters.length).toBeGreaterThan(5);
    const ids = new Set(monsters.map((m) => m.definitionId));
    for (const id of ids)
      expect(["mist-wolf", "bandit-lord", "stone-ape", "venom-moth"]).toContain(
        id,
      );
    expect(monsters.some((m) => m.elite)).toBe(true);
    const summit = map().spawnZones!.find((z) => z.id === "dragon-summit")!;
    Object.assign(w.player, {
      x: summit.area.kind === "circle" ? summit.area.x : 172,
      y: summit.area.kind === "circle" ? summit.area.y : 40,
    });
    ticks(w, 200);
    const boss = Object.values(w.state.entities).find(
      (e) => e.definitionId === "cloud-beast",
    );
    expect(boss).toBeDefined();
    expect(boss!.hp).toBeGreaterThan(2000);
  });

  it("quái có skillIds thi triển kỹ năng bằng nội lực của nó", () => {
    const w = world();
    const crane = spawnMonster(
      w.state,
      "thunder-crane",
      MAP,
      w.player.x + 2,
      w.player.y,
      "test:crane",
    );
    crane.hp = crane.maxHp = 5000;
    expect(crane.maxMp).toBeGreaterThan(0);
    const before = crane.mp;
    ticks(w, 120);
    expect(crane.mp).toBeLessThan(before);
    expect(crane.cooldowns["mon-thunder-cry"]).toBeGreaterThan(0);
  });

  it("trang bị mới có ô mũ/phụ kiện và yêu cầu cấp khi mặc", () => {
    const w = world();
    addItem(w.state, "thunder-helm");
    addItem(w.state, "dragon-seal");
    const helm = w.state.inventory.find(
        (i) => i.definitionId === "thunder-helm",
      )!,
      seal = w.state.inventory.find((i) => i.definitionId === "dragon-seal")!;
    send(w, { type: "equip", instanceId: helm.id });
    expect(w.state.equipment.helmet).toBeUndefined();
    expect(getItem("thunder-helm").requiredLevel).toBe(14);
    w.state.level = 14;
    w.player.level = 14;
    send(w, { type: "equip", instanceId: helm.id });
    expect(w.state.equipment.helmet?.id).toBe(helm.id);
    w.state.level = 15;
    w.player.level = 15;
    send(w, { type: "equip", instanceId: seal.id });
    expect(w.state.equipment.accessory?.id).toBe(seal.id);
    const defense = w.player.defense;
    addItem(w.state, "wind-boots");
    const boots = w.state.inventory.find(
      (i) => i.definitionId === "wind-boots",
    )!;
    send(w, { type: "equip", instanceId: boots.id });
    expect(w.player.defense).toBeGreaterThan(defense);
    send(w, { type: "unequip", slot: "helmet" });
    expect(w.state.equipment.helmet).toBeUndefined();
  });

  it("loot cấp cao sinh phụ từ ngẫu nhiên và phụ từ thật sự tăng chỉ số", () => {
    const random = (() => {
      let state = 12345;
      return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
      };
    })();
    const mythic = rollAffixes("cloud-blade", random);
    expect(mythic).toHaveLength(2);
    expect(mythic.every((a) => a.value > 0)).toBe(true);
    expect(rollAffixes("herb", random)).toEqual([]);
    const plain = itemBonuses({
      id: "x",
      definitionId: "cloud-blade",
      quantity: 1,
    });
    const boosted = itemBonuses({
      id: "x",
      definitionId: "cloud-blade",
      quantity: 1,
      affixes: [
        { id: "sharp", stat: "attack", value: 6 },
        { id: "vital", stat: "maxHp", value: 30 },
      ],
    });
    expect(boosted.attack).toBe(plain.attack + 6);
    expect(boosted.maxHp).toBe(plain.maxHp + 30);
  });

  it("hạ boss Vân Đỉnh rơi Vân Long Kiếm kèm phụ từ", () => {
    const w = world();
    w.state.level = 16;
    w.player.level = 16;
    w.player.attack = 5000;
    const boss = spawnMonster(
      w.state,
      "cloud-beast",
      MAP,
      w.player.x + 1,
      w.player.y,
      "test:boss",
    );
    boss.hp = 1;
    send(w, { type: "skill", skillId: "slash", targetId: boss.id });
    const drop = Object.values(w.state.groundLoot).find(
      (l) => l.item?.definitionId === "cloud-blade",
    );
    expect(drop).toBeDefined();
    expect(drop!.item!.affixes).toHaveLength(2);
    send(w, { type: "pickup", lootId: drop!.id });
    const carried = w.state.inventory.find(
      (i) => i.definitionId === "cloud-blade",
    );
    expect(carried?.affixes).toHaveLength(2);
    expect(validateSave(w.snapshot()).inventory.length).toBe(
      w.state.inventory.length,
    );
  });

  it("chuỗi nhiệm vụ Thanh Vân Sơn chạy bằng hành động thật", () => {
    const w = world(),
      master = npcs.find((n) => n.id === "tv-master")!;
    Object.assign(w.player, { x: master.x, y: master.y });
    send(w, { type: "acceptQuest", questId: "tv-scout" });
    expect(w.state.quests.find((q) => q.id === "tv-scout")?.status).toBe(
      "active",
    );
    for (let i = 0; i < 6; i++) {
      const wolf = spawnMonster(
        w.state,
        "mist-wolf",
        MAP,
        w.player.x + 1,
        w.player.y,
        `test:wolf:${i}`,
      );
      wolf.hp = 1;
      w.player.attack = 4000;
      send(w, { type: "skill", skillId: "slash", targetId: wolf.id });
      ticks(w, 20);
    }
    expect(w.state.quests.find((q) => q.id === "tv-scout")?.status).toBe(
      "ready",
    );
    send(w, { type: "claimQuest", questId: "tv-scout" });
    expect(w.state.quests.find((q) => q.id === "tv-scout")?.status).toBe(
      "claimed",
    );
    expect(
      w.state.inventory.some((i) => i.definitionId === "mist-treads"),
    ).toBe(true);
    // Nhiệm vụ kế tiếp mở theo `requires` và nhận được tại đúng NPC.
    send(w, { type: "acceptQuest", questId: "tv-pass" });
    expect(w.state.quests.find((q) => q.id === "tv-pass")?.status).toBe(
      "active",
    );
    const far = npcs.find((n) => n.id === "tv-prospector")!;
    send(w, { type: "acceptQuest", questId: "tv-serpent" });
    expect(
      w.state.quests.some((q) => q.id === "tv-serpent"),
      "NPC ở xa không nhận nhiệm vụ",
    ).toBe(false);
    Object.assign(w.player, { x: far.x, y: far.y });
    send(w, { type: "acceptQuest", questId: "tv-serpent" });
    expect(w.state.quests.find((q) => q.id === "tv-serpent")?.status).toBe(
      "active",
    );
  });

  it("thu thập tài nguyên mới và giữ tiến trình qua save/load", () => {
    const w = world(),
      node = resourceNodes.find((n) => n.id === "tv-jade-vein")!;
    Object.assign(w.player, { x: node.x, y: node.y });
    send(w, { type: "gather", nodeId: node.id });
    expect(
      w.state.inventory.find((i) => i.definitionId === "jade-ore")?.quantity,
    ).toBe(node.quantity);
    expect(w.state.resources[node.id]?.harvests).toBe(1);
    const saved = w.snapshot(),
      restored = new GameWorld(saved);
    expect(restored.snapshot()).toEqual(saved);
    expect(validateSave(saved).mapId).toBe(MAP);
  });

  it("tiền tiêu mới có thợ rèn, thương nhân và kho theo `service`", () => {
    const w = world(),
      smith = npcs.find((n) => n.id === "tv-smith")!;
    w.state.gold = 20000;
    Object.assign(w.player, { x: smith.x, y: smith.y });
    send(w, { type: "buy", itemId: "ward-stone" });
    expect(w.state.inventory.some((i) => i.definitionId === "ward-stone")).toBe(
      true,
    );
    const weapon = w.state.equipment.weapon.id;
    addItem(w.state, "ore", 10);
    send(w, { type: "enhance", instanceId: weapon });
    expect(w.state.equipment.weapon.enhancement).toBe(1);
    const keeper = npcs.find((n) => n.id === "tv-quartermaster")!;
    Object.assign(w.player, { x: keeper.x, y: keeper.y });
    const stone = w.state.inventory.find(
      (i) => i.definitionId === "ward-stone",
    )!;
    send(w, { type: "deposit", instanceId: stone.id });
    expect(w.state.warehouse.some((i) => i.id === stone.id)).toBe(true);
  });

  it("nội dung mới có nguồn nhận và nơi dùng", () => {
    const newIds = [
      "pine-blade",
      "cloud-spear",
      "thunder-saber",
      "jade-fan",
      "cloud-blade",
      "bamboo-robe",
      "scale-mail",
      "jade-plate",
      "summit-robe",
      "mist-treads",
      "cliff-boots",
      "wind-boots",
      "bamboo-hat",
      "jade-crown",
      "thunder-helm",
      "jade-pendant",
      "wolf-fang",
      "cloud-ring",
      "dragon-seal",
      "hp-great",
      "mp-great",
      "antidote",
      "elixir",
      "revive-pill",
      "jade-ore",
      "cloud-silk",
      "storm-iron",
      "spirit-wood",
      "moon-herb",
      "beast-hide",
      "enhance-stone",
      "jade-gem-deep",
      "amber-gem-deep",
    ];
    for (const id of newIds)
      expect(
        items.some((i) => i.id === id),
        id,
      ).toBe(true);
    expect(new Set(items.map((i) => i.rarity)).size).toBeGreaterThanOrEqual(5);
    // Mỗi vật phẩm mới phải có nguồn: loot quái, công thức hoặc bán ở NPC.
    const looted = new Set(
      monsters.flatMap((m) => m.loot.map((l) => l.itemId)),
    );
    for (const id of newIds) {
      const item = getItem(id);
      expect(looted.has(id) || item.price > 0, `${id} thiếu nguồn nhận`).toBe(
        true,
      );
    }
    expect(quests.filter((q) => q.mapId === MAP).length).toBeGreaterThanOrEqual(
      6,
    );
  });
});
