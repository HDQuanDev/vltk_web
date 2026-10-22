import { describe, expect, it } from "vitest";
import {
  GameWorld,
  createGame,
  spawnMonster,
} from "../../packages/game-core/src/index";
import type { GameCommand } from "../../packages/game-protocol/src/index";

let sequence = 0;
const send = (w: GameWorld, c: GameCommand) =>
  w.dispatch({
    protocolVersion: 1,
    sequence: ++sequence,
    actorId: w.player.id,
    command: c,
  });

/** Thế giới Tân Thủ Thôn sạch quái, nhân vật đứng giữa quảng trường. */
function setup() {
  const state = createGame("Auto Pickup", "wudang", "auto-pickup");
  const w = new GameWorld(state);
  // Dọn quái đã spawn để test chỉ còn đúng thứ nó tạo ra.
  for (const e of Object.values(w.state.entities))
    if (e.kind === "monster") delete w.state.entities[e.id];
  w.player.x = 14;
  w.player.y = 14;
  return w;
}

/** Quái yếu đứng cạnh để tự chiến giết nhanh. */
function weakMonster(w: GameWorld, x = 16, y = 14) {
  const m = spawnMonster(w.state, "bandit", "village", x, y, "probe");
  m.hp = m.maxHp = 12;
  m.attack = 0;
  m.attackRange = 0.1;
  m.movementSpeed = 0.001;
  m.nextAttack = 99999;
  return m;
}

/** Rơi một món đồ của chính người chơi tại toạ độ cho trước. */
function dropLoot(
  w: GameWorld,
  id: string,
  x: number,
  y: number,
  item: { definitionId: string } | null = null,
) {
  w.state.groundLoot[id] = {
    id,
    mapId: w.player.mapId,
    ownerId: w.player.id,
    x,
    y,
    item: item
      ? { id: `${id}:item`, definitionId: item.definitionId, quantity: 1 }
      : null,
    gold: item ? 0 : 18,
    createdAt: w.state.tick,
    expiresAt: w.state.tick + 12000,
  } as (typeof w.state.groundLoot)[string];
  return w.state.groundLoot[id];
}

/** Chạy n tick, gom sự kiện giết quái và nhặt đồ (đường log duy nhất). */
function run(w: GameWorld, ticks: number) {
  const deaths: string[] = [],
    loots: string[] = [];
  for (let i = 0; i < ticks; i++) {
    w.step();
    for (const e of w.drainEvents()) {
      if (e.type === "death" && e.entityId !== w.player.id) deaths.push(e.text);
      if (e.type === "loot") loots.push(e.text);
    }
  }
  return { deaths, loots };
}

describe("Tự chiến: nhật ký và nhặt đồ (Lỗi 1 + 2)", () => {
  it("giết quái và nhặt đồ trong tự chiến đều phát đúng 1 dòng nhật ký", () => {
    const w = setup();
    weakMonster(w);
    send(w, { type: "configureAuto", settings: { pickup: true } } as never);
    send(w, { type: "autoAttack", enabled: true });
    const { deaths, loots } = run(w, 400);
    expect(deaths.length).toBeGreaterThan(0);
    // Dòng rơi đồ ("Đánh bại …") và dòng nhặt ("Nhặt được …") đều phải phát.
    const drops = loots.filter((t) => t.startsWith("Đánh bại ")),
      pickups = loots.filter((t) => t.startsWith("Nhặt được "));
    expect(drops.length).toBeGreaterThan(0);
    // Mỗi lần nhặt thành công có đúng 1 dòng "Nhặt được …".
    expect(pickups.filter((t) => t === "Nhặt được 18 bạc")).toHaveLength(1);
    expect(Object.keys(w.state.groundLoot)).toHaveLength(0);
  });

  it("hết mục tiêu thì chủ động đi nhặt đồ trong bán kính quét", () => {
    const w = setup();
    // Đồ rơi cách 8 ô: ngoài bán kính nhặt thụ động 3 ô, trong bán kính quét 12.
    dropLoot(w, "loot:near", 21, 14);
    send(w, { type: "configureAuto", settings: { pickup: true } } as never);
    send(w, { type: "autoAttack", enabled: true });
    // Chưa nhặt được ở tick đầu vì phải đi tới.
    w.step();
    w.drainEvents();
    expect(w.state.groundLoot["loot:near"]).toBeDefined();
    const { loots } = run(w, 400);
    expect(w.state.groundLoot["loot:near"]).toBeUndefined();
    expect(loots.some((t) => t === "Nhặt được 18 bạc")).toBe(true);
  });

  it("tắt 'Tự nhặt đồ' thì không đi nhặt, đồ nằm nguyên trên đất", () => {
    const w = setup();
    dropLoot(w, "loot:stay", 21, 14);
    send(w, { type: "configureAuto", settings: { pickup: false } } as never);
    send(w, { type: "autoAttack", enabled: true });
    const { loots } = run(w, 200);
    expect(loots).toHaveLength(0);
    expect(w.state.groundLoot["loot:stay"]).toBeDefined();
  });
});

describe("Đi ngang qua đồ rơi (Lỗi 3)", () => {
  it("đi vào bán kính nhặt là tự nhặt, có nhật ký, icon biến mất", () => {
    const w = setup();
    dropLoot(w, "loot:walk", 17, 14, { definitionId: "herb" });
    send(w, { type: "move", destination: { x: 20, y: 14 } });
    const { loots } = run(w, 200);
    expect(w.state.groundLoot["loot:walk"]).toBeUndefined();
    expect(loots).toContain("Nhặt được Linh Thảo");
  });

  it("không tự nhặt khi đang mở hội thoại/shop (tự chiến tạm dừng)", () => {
    const w = setup();
    dropLoot(w, "loot:paused", 14, 14);
    send(w, { type: "autoCombatPaused", paused: true } as never);
    run(w, 10);
    expect(w.state.groundLoot["loot:paused"]).toBeDefined();
  });

  it("bấm nhặt từ xa vẫn đi tới nhặt như trước", () => {
    const w = setup();
    dropLoot(w, "loot:far", 22, 14);
    send(w, { type: "pickup", lootId: "loot:far" });
    expect(w.player.path.length).toBeGreaterThan(0);
    const { loots } = run(w, 400);
    expect(w.state.groundLoot["loot:far"]).toBeUndefined();
    expect(loots).toContain("Nhặt được 18 bạc");
  });
});
