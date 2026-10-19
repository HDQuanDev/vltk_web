import "fake-indexeddb/auto";
import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import legacy02 from "../fixtures/v0.2-save.json";
import {
  GameWorld,
  createGame,
  findPath,
  isWalkable,
  worldToScreen,
  screenToWorld,
  distance,
} from "../../packages/game-core/src/index";
import {
  maps,
  getMap,
  highlandAreas,
  propAssets,
  groundTextureAsset,
  quests,
  CONTENT_VERSION,
  type MapDefinition,
} from "../../packages/game-content/src/index";
import {
  validateSave,
  SaveRepository,
} from "../../packages/game-storage/src/index";
import {
  visibleChunks,
  chunkBounds,
  clampCameraCenter,
  LANDSCAPE_PADDING,
} from "../../apps/web/src/game/world/chunks";
import { questNavigation } from "../../apps/web/src/ui/quest-navigation";
import type { GameCommand } from "../../packages/game-protocol/src/index";
const send = (w: GameWorld, c: GameCommand, sequence: number) =>
  w.dispatch({
    protocolVersion: 1,
    actorId: w.player.id,
    sequence,
    command: c,
  });
function highland() {
  const s = createGame("Khách Sơn Lộ", "wudang", "highland-test");
  s.mapId = "highlands";
  Object.assign(s.entities[s.playerId], {
    mapId: "highlands",
    x: 16,
    y: 17,
    spawn: { x: 16, y: 17 },
  });
  s.visitedMaps.push("highlands");
  return new GameWorld(s);
}
it("bản đồ mới có đường đến cả 8 địa danh, NPC/resource/spawn không chặn", () => {
  const m = getMap("highlands");
  expect(m.width).toBeGreaterThanOrEqual(128);
  expect(m.spawns.length).toBeGreaterThanOrEqual(18);
  expect(m.props.length).toBeGreaterThan(300);
  for (const a of highlandAreas) {
    expect(isWalkable(m, a)).toBe(true);
    const path = findPath(m, m.spawn, a);
    expect(path.length, a.name).toBeGreaterThan(0);
    expect(path.at(-1)).toEqual({ x: a.x, y: a.y });
    for (const cell of path) expect(isWalkable(m, cell)).toBe(true);
  }
});
it("A* heap hỗ trợ đường dài trên map256 và tuân thủ budget/không xuyên góc", () => {
  const base = getMap("highlands"),
    m: MapDefinition = {
      ...base,
      width: 256,
      height: 256,
      blocked: Array.from({ length: 180 }, (_, i) => ({ x: 128, y: 10 + i })),
      props: [],
      spawns: [],
      portals: [],
    };
  const start = { x: 10, y: 10 },
    end = { x: 240, y: 200 };
  const path = findPath(m, start, end, 65536);
  expect(path.length).toBeGreaterThan(230);
  expect(path.at(-1)).toEqual(end);
  expect(findPath(m, start, end, 1)).toEqual([]);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1],
      b = path[i];
    expect(isWalkable(m, b)).toBe(true);
    if (a.x !== b.x && a.y !== b.y) {
      expect(isWalkable(m, { x: a.x, y: b.y })).toBe(true);
      expect(isWalkable(m, { x: b.x, y: a.y })).toBe(true);
    }
  }
});
it("visible chunks phụ thuộc viewport thay vì kích thước toàn map, ổn định qua boundary", () => {
  const p = worldToScreen({ x: 64, y: 64 }),
    view = { x: p.x - 600, y: p.y - 300, width: 1200, height: 600 };
  const a = visibleChunks(128, 128, view),
    b = visibleChunks(1024, 1024, view);
  expect(a).toEqual(b);
  expect(a.length).toBeLessThan(40);
  expect(a.length).toBeGreaterThan(4);
  expect(new Set(a.map((c) => c.key)).size).toBe(a.length);
  for (const c of a) expect(chunkBounds(c.x, c.y).width).toBeLessThan(1024);
  for (const x of [7.99, 8, 8.01]) {
    const p = worldToScreen({ x, y: 16 }),
      active = visibleChunks(128, 128, {
        x: p.x - 300,
        y: p.y - 180,
        width: 600,
        height: 360,
      });
    expect(active.some((c) => c.x === Math.floor(x / 8) && c.y === 2)).toBe(
      true,
    );
  }
});
it("camera không lộ ra ngoài dải cảnh quan được render trên 5 viewport", () => {
  for (const [width, height] of [
    [1920, 1080],
    [1366, 768],
    [932, 430],
    [844, 390],
    [390, 844],
  ]) {
    for (const pos of [
      { x: 1, y: 1 },
      { x: 127, y: 127 },
      { x: 1, y: 127 },
    ]) {
      const center = clampCameraCenter(
          worldToScreen(pos),
          128,
          128,
          width,
          height,
          0.86,
        ),
        w = width / 0.86,
        h = height / 0.86;
      for (const [dx, dy] of [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ]) {
        const p = screenToWorld({
          x: center.x + (dx * w) / 2,
          y: center.y + (dy * h) / 2,
        });
        expect(p.x).toBeGreaterThanOrEqual(-LANDSCAPE_PADDING - 0.001);
        expect(p.y).toBeGreaterThanOrEqual(-LANDSCAPE_PADDING - 0.001);
        expect(p.x).toBeLessThanOrEqual(128 + LANDSCAPE_PADDING + 0.001);
        expect(p.y).toBeLessThanOrEqual(128 + LANDSCAPE_PADDING + 0.001);
      }
    }
  }
});
it("quest khảo sát tiến triển bởi di chuyển thật; lưu giữa đường replay giữ kết quả", () => {
  const a = highland();
  send(a, { type: "acceptQuest", questId: "highland-route" }, 1);
  expect(a.state.quests[0].status).toBe("active");
  send(a, { type: "move", destination: { x: 35, y: 24 } }, 2);
  for (let i = 0; i < 45; i++) {
    a.step();
    a.drainEvents();
  }
  const b = new GameWorld(validateSave(a.snapshot()));
  for (let i = 0; i < 240; i++) {
    a.step();
    b.step();
    a.drainEvents();
    b.drainEvents();
  }
  expect(a.snapshot()).toEqual(b.snapshot());
  expect(a.state.quests[0].status).toBe("ready");
  expect(distance(a.player, { x: 16, y: 17 })).toBeGreaterThan(15);
});
it("quest có vùng yêu cầu không tăng tiến độ do thu thập ở map khác", () => {
  const w = new GameWorld(createGame());
  w.state.quests = [{ id: "marsh-antidote", status: "active", progress: 0 }];
  Object.assign(w.player, { x: 12, y: 19 });
  send(w, { type: "gather", nodeId: "village-herb" }, 1);
  expect(w.state.quests[0].progress).toBe(0);
  w.state.mapId = "highlands";
  Object.assign(w.player, { mapId: "highlands", x: 26, y: 55 });
  for (let i = 0; i < 40; i++) w.step();
  send(w, { type: "gather", nodeId: "highland-plum-herb" }, 2);
  expect(w.state.quests[0].progress).toBe(3);
});
it("migration v0.2 thật giữ đồ nâng/ngọc/kho/nghề và archive nguyên nguồn", async () => {
  const up = validateSave(legacy02);
  expect(up.contentVersion).toBe(CONTENT_VERSION);
  expect(up.schemaVersion).toBe(2);
  for (const field of [
    "gold",
    "inventory",
    "equipment",
    "warehouse",
    "professionXp",
    "quests",
    "rngState",
    "tick",
  ] as const)
    expect(up[field]).toEqual(legacy02[field]);
  const repo = new SaveRepository();
  await repo.import(legacy02);
  expect(
    (await repo.archives(legacy02.characterId)).some(
      (a) => JSON.stringify(a.snapshot) === JSON.stringify(legacy02),
    ),
  ).toBe(true);
  expect((await repo.load(legacy02.characterId))!.contentVersion).toBe(
    CONTENT_VERSION,
  );
  expect(() =>
    validateSave({ ...legacy02, contentVersion: "0.9.0" }),
  ).toThrow();
});
it("gán chiêu đã ở ô khác đổi chỗ, không sinh key/hotbar trùng", () => {
  const w = new GameWorld(createGame()),
    before = [...w.state.hotbar];
  send(w, { type: "bindSkill", slot: 0, skillId: before[1] }, 1);
  expect(w.state.hotbar[0]).toBe(before[1]);
  expect(w.state.hotbar[1]).toBe(before[0]);
  expect(new Set(w.state.hotbar).size).toBe(4);
});
it("navigation quest tìm đúng NPC/địa danh và cổng đầu tiên trong graph", () => {
  const s = createGame(),
    q = quests.find((q) => q.id === "highland-route")!;
  expect(questNavigation(s, q)).toEqual({
    type: "interact",
    targetId: "portal:highlands",
  });
  s.mapId = "highlands";
  expect(
    questNavigation(s, q, { id: q.id, status: "active", progress: 0 }),
  ).toEqual({ type: "move", destination: { x: 43, y: 24 } });
  expect(
    questNavigation(s, q, { id: q.id, status: "ready", progress: 1 }),
  ).toEqual({ type: "interact", targetId: "ranger" });
  expect(maps).toHaveLength(6);
});
it("asset PNG có kích thước/alpha khớp metadata và không được gán production-ready", () => {
  const material = readFileSync("apps/web/public" + groundTextureAsset.url);
  expect(material.readUInt32BE(16)).toBe(512);
  expect(material.readUInt32BE(20)).toBe(512);
  expect(groundTextureAsset.quality).toBe("review-required");
  for (const a of propAssets) {
    const png = readFileSync("apps/web/public" + a.url);
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(a.width);
    expect(png.readUInt32BE(20)).toBe(a.height);
    expect(png[25]).toBe(6);
    expect(a.quality).toBe("review-required");
    expect(a.displayWidth / a.width).toBeLessThan(1);
  }
});

it("double tap nâng đồ chỉ commit một lần trong cửa sổ phản hồi", () => {
  const w = new GameWorld(createGame());
  Object.assign(w.player, { x: 18, y: 12 });
  w.state.gold = 1000;
  w.state.inventory.push({ id: "ore-test", definitionId: "ore", quantity: 10 });
  const id = w.state.equipment.weapon.id;
  send(w, { type: "enhance", instanceId: id }, 1);
  const gold = w.state.gold;
  send(w, { type: "enhance", instanceId: id }, 2);
  expect(w.state.equipment.weapon.enhancement).toBe(1);
  expect(w.state.gold).toBe(gold);
  const restored = new GameWorld(validateSave(w.snapshot()));
  send(restored, { type: "enhance", instanceId: id }, 3);
  expect(restored.state.gold).toBe(gold);
  for (let i = 0; i < 10; i++) restored.step();
  send(restored, { type: "enhance", instanceId: id }, 4);
  expect(restored.state.equipment.weapon.enhancement).toBe(2);
});
