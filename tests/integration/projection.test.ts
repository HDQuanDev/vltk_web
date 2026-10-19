import { describe, expect, it } from "vitest";
import {
  GameWorld,
  admitGroundLoot,
  createGame,
  projectView,
  viewScope,
  worldTotals,
} from "../../packages/game-core/src/index";
import { LocalGameSession } from "../../packages/game-session/src/index";
import { validateSave } from "../../packages/game-storage/src/index";
import { getMap } from "../../packages/game-content/src/index";
import type {
  GameSnapshot,
  GameUpdate,
} from "../../packages/game-protocol/src/index";

/** Nhân vật ở Tân Thủ Thôn nhưng đã từng tới rừng, nên rừng giữ quái dormant. */
function twoMapWorld() {
  const base = createGame("Vân Khách", "wudang", "projection-test", 90210);
  base.visitedMaps.push("forest");
  return new GameWorld(base);
}

function loot(mapId: string, id: string, ownerId: string, createdAt: number) {
  return {
    id,
    mapId,
    ownerId,
    x: getMap(mapId).spawn.x + 1,
    y: getMap(mapId).spawn.y,
    item: null,
    gold: 5,
    createdAt,
    expiresAt: createdAt + 12000,
  };
}

describe("view projection", () => {
  it("chỉ gửi bản đồ đang có người chơi, authority giữ dormant nguyên vẹn", () => {
    const w = twoMapWorld();
    const authority = Object.values(w.state.entities);
    const dormant = authority.filter((e) => e.mapId === "forest");
    expect(dormant.length).toBeGreaterThan(0);
    expect(w.state.mapId).toBe("village");

    const before = JSON.stringify(w.state);
    const view = w.viewSnapshot();

    expect(Object.keys(view.entities).length).toBeLessThan(authority.length);
    for (const entity of Object.values(view.entities))
      expect(entity.mapId).toBe("village");
    expect(Object.keys(view.entities)).toHaveLength(
      authority.filter((e) => e.mapId === "village").length,
    );
    expect(view.worldTotals).toEqual(worldTotals(w.state));
    expect(view.worldTotals!.entities).toBe(authority.length);
    expect(view.worldTotals!.monsters).toBe(
      authority.filter((e) => e.kind === "monster").length,
    );
    expect(view.worldTotals!.maps).toBe(w.state.visitedMaps.length);
    expect(JSON.stringify(w.state)).toBe(before);
    expect(validateSave(w.snapshot()).playerId).toBe(w.state.playerId);
  });

  it("view là bản sao: sửa view không đổi authority và không giữ tham chiếu", () => {
    const w = twoMapWorld();
    const view = w.viewSnapshot();
    const player = view.entities[view.playerId];
    player.hp = 1;
    player.path.push({ x: 1, y: 1 });
    view.inventory.push({
      id: "injected",
      definitionId: "hp",
      quantity: 1,
    });
    view.attributes.strength = 999;

    expect(w.state.entities[w.state.playerId].hp).toBeGreaterThan(1);
    expect(w.state.entities[w.state.playerId].path).toHaveLength(0);
    expect(w.state.inventory.some((item) => item.id === "injected")).toBe(
      false,
    );
    expect(w.state.attributes.strength).not.toBe(999);
  });

  it("player thứ hai ở bản đồ khác vẫn thuộc scope, bản đồ không có ai vẫn bị lọc", () => {
    const w = twoMapWorld();
    w.state.visitedMaps.push("camp");
    const other = createGame("Bạn Đồng Hành", "shaolin", "second-actor");
    Object.assign(other.entities[other.playerId], {
      mapId: "forest",
      ...getMap("forest").spawn,
    });
    const otherId = w.addPlayer(other);

    const scope = viewScope(w.state, w.state.playerId);
    expect(scope.maps).toEqual(["forest", "village"]);
    const view = w.viewSnapshot();
    expect(view.entities[otherId].mapId).toBe("forest");
    expect(view.actors[otherId].name).toBe("Bạn Đồng Hành");
    // Rừng có người chơi nên quái ở đó vẫn được gửi; bản đồ không có ai thì không.
    expect(
      Object.values(view.entities).filter(
        (e) => e.kind === "monster" && e.mapId === "forest",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      Object.values(view.entities).filter((e) => e.mapId === "camp"),
    ).toHaveLength(0);
    expect(view.worldTotals!.entities).toBe(
      Object.keys(w.state.entities).length,
    );
  });
  it("loot, tài nguyên và spawn region được lọc theo bản đồ, tổng vẫn báo đủ", () => {
    const w = twoMapWorld();
    const owner = w.state.playerId;
    for (const entry of [
      loot("village", "loot:village", owner, w.state.tick),
      loot("forest", "loot:forest", owner, w.state.tick),
    ])
      expect(admitGroundLoot(w.state, entry)).toBe("active");
    w.state.deferredLoot["loot:deferred"] = loot(
      "forest",
      "loot:deferred",
      owner,
      w.state.tick,
    );
    w.state.resources["village-herb"] = { availableAt: 40, harvests: 2 };
    w.state.resources["highland-quarry"] = { availableAt: 40, harvests: 1 };
    w.state.spawnRegions["village:camp"] = { nextCheckAt: 0, serial: 1 };
    w.state.spawnRegions["forest:camp"] = { nextCheckAt: 0, serial: 3 };

    const view = w.viewSnapshot();
    expect(Object.keys(view.groundLoot)).toEqual(["loot:village"]);
    expect(Object.keys(view.deferredLoot)).toEqual([]);
    expect(Object.keys(view.resources)).toEqual(["village-herb"]);
    expect(Object.keys(view.spawnRegions)).toEqual(["village:camp"]);
    expect(view.worldTotals!.groundLoot).toBe(2);
    expect(view.worldTotals!.deferredLoot).toBe(1);
  });

  it("đổi bản đồ thì view theo bản đồ mới", () => {
    const w = twoMapWorld();
    const player = w.player;
    Object.assign(player, { mapId: "forest", ...getMap("forest").spawn });
    w.state.mapId = "forest";

    const view = w.viewSnapshot();
    expect(
      Object.values(view.entities).every((e) => e.mapId === "forest"),
    ).toBe(true);
    expect(
      Object.values(view.entities).filter((e) => e.kind === "monster").length,
    ).toBeGreaterThan(0);
  });

  it("LocalGameSession publish view nhưng getSnapshot trả authority đầy đủ", () => {
    const base = createGame("Vân Khách", "wudang", "projection-session", 5150);
    base.visitedMaps.push("forest");
    const session = new LocalGameSession(base);
    const updates: GameUpdate[] = [];
    const unsubscribe = session.subscribe((update) => updates.push(update));
    session.sendCommand({ type: "stop" });
    unsubscribe();

    const published = updates.at(-1)!.snapshot;
    const authority = session.getSnapshot();
    expect(published.worldTotals!.entities).toBe(
      Object.keys(authority.entities).length,
    );
    expect(Object.keys(published.entities).length).toBeLessThan(
      Object.keys(authority.entities).length,
    );
    expect(authority.worldTotals).toBeUndefined();
    expect(
      Object.values(published.entities).some((e) => e.mapId === "forest"),
    ).toBe(false);
    const publishedBytes = JSON.stringify(published).length;
    const authorityBytes = JSON.stringify(authority).length;
    // Payload đã lọc theo bản đồ; tỉ lệ nhỏ hơn nữa tuỳ số bản đồ đã thăm
    // (đo ở artifacts/world-footprint.json).
    expect(publishedBytes).toBeLessThan(authorityBytes);
    expect(validateSave(authority).mapId).toBe(authority.mapId);
  });

  it("worldTotals không phụ thuộc viewer và giữ đúng loot pool", () => {
    const w = twoMapWorld();
    const totals = worldTotals(w.state);
    const view = projectView(w.state, w.state.playerId);
    expect(view.worldTotals).toEqual(totals);
    expect(totals.groundLoot).toBe(Object.keys(w.state.groundLoot).length);
    expect(totals.deferredLoot).toBe(Object.keys(w.state.deferredLoot).length);
  });

  it("save/load authority sau projection vẫn dựng lại world như trước", () => {
    const w = twoMapWorld();
    w.step();
    w.drainEvents();
    const saved: GameSnapshot = w.snapshot();
    w.viewSnapshot();
    const restored = new GameWorld(saved);
    expect(restored.snapshot()).toEqual(saved);
    expect(restored.viewSnapshot()).toEqual(w.viewSnapshot());
  });
});
