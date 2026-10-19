import { LootNoticeWindow } from "../../apps/web/src/ui/loot-notices";
import { writeFileSync } from "node:fs";
import "fake-indexeddb/auto";
import { it, expect } from "vitest";
import {
  createGame,
  GameWorld,
  findPath,
  isWalkable,
  navigationDiagnostics,
  invalidateNavigation,
  setNavigationObstacle,
  insideSpawnZone,
  validSpawnPosition,
  simulationTier,
  admitGroundLoot,
  updateLootPools,
  LOOT_POOL_LIMITS,
} from "../../packages/game-core/src/index";
import {
  CONTENT_VERSION,
  getMap,
  riverlandAreas,
  npcs,
  resourceNodes,
  type MapDefinition,
} from "../../packages/game-content/src/index";
import {
  validateSave,
  SaveRepository,
} from "../../packages/game-storage/src/index";
import type {
  GroundLoot,
  GameCommand,
} from "../../packages/game-protocol/src/index";
import { starterJourney } from "../helpers/starter-journey";
function riverWorld() {
  const s = createGame("Vân Khách", "wudang", "region-test", 77991);
  s.mapId = "riverlands";
  s.visitedMaps.push("riverlands");
  Object.assign(s.entities[s.playerId], {
    mapId: "riverlands",
    ...getMap("riverlands").spawn,
  });
  return new GameWorld(s);
}
it("256×256 có đường đến đủ 12 POI, NPC, tài nguyên; sông chỉ qua cầu", () => {
  const map = getMap("riverlands");
  expect(map.width).toBe(256);
  expect(map.height).toBe(256);
  expect(map.props.length).toBeGreaterThan(2000);
  expect(map.spawnZones).toHaveLength(10);
  for (const point of [
    ...riverlandAreas,
    ...npcs.filter((n) => n.mapId === map.id),
    ...resourceNodes.filter((n) => n.mapId === map.id),
  ]) {
    expect(isWalkable(map, point), JSON.stringify(point)).toBe(true);
    const path = findPath(map, map.spawn, point);
    expect(path.length, JSON.stringify(point)).toBeGreaterThan(0);
    expect(path.at(-1)).toEqual({ x: point.x, y: point.y });
    for (const tile of path) expect(isWalkable(map, tile)).toBe(true);
    expect(navigationDiagnostics(map).lastVisited).toBeLessThanOrEqual(16384);
  }
  for (const p of map.water!) expect(isWalkable(map, p)).toBe(false);
  for (const p of map.bridges!) expect(isWalkable(map, p)).toBe(true);
});
it("cache đường đi tách bản đồ, giới hạn 64, không bị sửa bởi caller, invalidation cả sửa cùng độ dài", () => {
  const map: MapDefinition = {
    ...getMap("riverlands"),
    blocked: [{ x: 20, y: 20 }],
    props: [],
  };
  const start = { x: 10, y: 10 },
    end = { x: 30, y: 30 };
  const first = findPath(map, start, end);
  first[0].x = -500;
  expect(findPath(map, start, end)[0].x).not.toBe(-500);
  expect(navigationDiagnostics(map).cacheHits).toBe(1);
  map.blocked[0] = { x: 30, y: 30 };
  invalidateNavigation(map);
  expect(findPath(map, start, end)).toEqual([]);
  setNavigationObstacle(map, end, false);
  expect(findPath(map, start, end).at(-1)).toEqual(end);
  for (let i = 0; i < 80; i++) findPath(map, start, { x: 31 + i, y: 32 });
  expect(navigationDiagnostics(map).cachedRoutes).toBe(64);
  expect(findPath(map, start, { x: 240, y: 240 }, 4)).toEqual([]);
  expect(navigationDiagnostics(map).lastVisited).toBeLessThanOrEqual(4);
});
it("thay lệnh move/stop hủy đường cũ; vật cản mới chặn route đang đi", () => {
  const w = riverWorld(),
    map = getMap("riverlands");
  let sequence = 0;
  const send = (command: GameCommand) =>
    w.dispatch({
      protocolVersion: 1,
      sequence: ++sequence,
      actorId: w.player.id,
      command,
    });
  send({ type: "move", destination: { x: 57, y: 47 } });
  expect(w.player.path.length).toBeGreaterThan(0);
  send({ type: "move", destination: { x: 25, y: 27 } });
  expect(w.player.path.at(-1)).toEqual({ x: 25, y: 27 });
  const next = w.player.path[0];
  setNavigationObstacle(map, next, true);
  try {
    w.step();
    expect(w.player.path).toEqual([]);
  } finally {
    setNavigationObstacle(map, next, false);
  }
  send({ type: "move", destination: { x: 57, y: 47 } });
  send({ type: "stop" });
  expect(w.player.path).toEqual([]);
});
it("zone spawn giới hạn 4/tick, phân bố có trọng số, an toàn, elite và level thực sự tác động stats", () => {
  const w = riverWorld(),
    map = getMap("riverlands");
  // Infrastructure fixture visits camps; no progression claims are based on relocation.
  for (const z of map.spawnZones!) {
    const point = z.area.kind === "circle" ? z.area : { x: 191, y: 166 };
    Object.assign(w.player, { x: point.x - 18, y: point.y });
    for (let i = 0; i < 160; i++) {
      w.step();
      w.drainEvents();
      expect(w.diagnostics.spawned).toBeLessThanOrEqual(4);
    }
  }
  const members = Object.values(w.state.entities).filter((e) => e.spawnZoneId);
  expect(members.length).toBeGreaterThan(70);
  expect(members.length).toBeLessThanOrEqual(map.maxMonsters!);
  expect(members.some((e) => e.elite)).toBe(true);
  for (const e of members) {
    const zone = map.spawnZones!.find((z) => z.id === e.spawnZoneId)!;
    expect(insideSpawnZone(zone, e.spawn)).toBe(true);
    expect(validSpawnPosition(map, zone, e.spawn, [], e.id)).toBe(true);
    expect(zone.levels.some((l) => l.level === e.level)).toBe(true);
  }
  expect(validateSave(w.snapshot()).spawnRegions).toEqual(w.state.spawnRegions);
});
it("inactive AI ngủ, nearby chạy 1Hz; trạng thái HP/phase không reset và multi-player đánh thức vùng", () => {
  const w = riverWorld();
  for (let i = 0; i < 100; i++) w.step();
  const e = Object.values(w.state.entities).find((e) => e.spawnZoneId)!;
  e.hp = 21;
  e.phase = 1;
  e.targetId = null;
  e.brain = "idle";
  e.path = [];
  Object.assign(w.player, { x: 240, y: 240 });
  expect(simulationTier(e, [w.player], w.state)).toBe("inactive");
  for (let i = 0; i < 100; i++) {
    w.step();
    w.drainEvents();
  }
  expect(e.hp).toBe(21);
  expect(e.phase).toBe(1);
  expect(e.path).toEqual([]);
  Object.assign(w.player, { x: e.x - 35, y: e.y });
  expect(simulationTier(e, [w.player], w.state)).toBe("nearby");
  const ally = createGame("Bạn Đồng Hành", "emei", "region-other");
  Object.assign(ally.entities[ally.playerId], {
    mapId: e.mapId,
    x: e.x - 10,
    y: e.y,
  });
  ally.mapId = e.mapId;
  const id = w.addPlayer(ally);
  expect(simulationTier(e, [w.player, w.state.entities[id]], w.state)).toBe(
    "active",
  );
});
it("dead zone member hồi sinh theo tick sau khi kích hoạt lại; replay save/load không reset population", () => {
  const a = riverWorld();
  for (let i = 0; i < 100; i++) a.step();
  const e = Object.values(a.state.entities).find((e) => e.spawnZoneId)!;
  e.hp = 0;
  e.state = "dead";
  e.targetId = null;
  e.path = [];
  e.respawnAt = a.state.tick + 100;
  Object.assign(a.player, { x: 240, y: 240 });
  for (let i = 0; i < 150; i++) a.step();
  expect(e.hp).toBe(0);
  Object.assign(a.player, { x: 22, y: 27 });
  const b = new GameWorld(validateSave(a.snapshot()));
  for (let i = 0; i < 100; i++) {
    a.step();
    b.step();
    a.drainEvents();
    b.drainEvents();
  }
  expect(a.snapshot()).toEqual(b.snapshot());
  expect(a.state.entities[e.id].hp).toBeGreaterThan(0);
  expect(
    Object.values(a.state.entities).filter((n) => n.id === e.id),
  ).toHaveLength(1);
});
function loot(
  w: GameWorld,
  id: number,
  definitionId: string | null = null,
): GroundLoot {
  return {
    id: `pool:${id}`,
    ownerId: w.player.id,
    mapId: "village",
    x: 14,
    y: 14,
    item: definitionId
      ? { id: `instance:${id}`, definitionId, quantity: 1 }
      : null,
    gold: definitionId ? 0 : 18,
    createdAt: w.state.tick,
    expiresAt: w.state.tick + 12000,
  };
}
it("loot vùng/reserve có cap, giữ hiếm, lưu đúng ID và hết hạn cả khi vùng ngủ", () => {
  const w = new GameWorld(createGame());
  for (let i = 0; i < 130; i++) admitGroundLoot(w.state, loot(w, i));
  expect(Object.keys(w.state.groundLoot)).toHaveLength(64);
  expect(Object.keys(w.state.deferredLoot)).toHaveLength(66);
  const restored = validateSave(w.snapshot());
  delete restored.groundLoot["pool:0"];
  restored.tick = 20;
  updateLootPools(restored, [restored.entities[restored.playerId]]);
  expect(Object.keys(restored.groundLoot)).toHaveLength(64);
  expect(Object.keys(restored.deferredLoot)).toHaveLength(65);
  expect(admitGroundLoot(w.state, loot(w, 800, "boss-sword"))).toBe("active");
  expect(w.state.groundLoot["pool:800"].item!.definitionId).toBe("boss-sword");
  for (
    let i = 1000;
    Object.keys(w.state.deferredLoot).length < LOOT_POOL_LIMITS.deferred;
    i++
  )
    admitGroundLoot(w.state, loot(w, i));
  expect(admitGroundLoot(w.state, loot(w, 99998))).toBe("rejected");
  expect(w.state.lootMetrics.rejected).toBe(1);
  expect(admitGroundLoot(w.state, loot(w, 99999, "boss-sword"))).toBe(
    "replaced-common",
  );
  expect(
    (w.state.groundLoot["pool:99999"] ?? w.state.deferredLoot["pool:99999"])
      .item!.definitionId,
  ).toBe("boss-sword");
  expect(w.state.lootMetrics.commonReplaced).toBe(1);
  w.state.tick = 12000;
  updateLootPools(w.state, [w.player]);
  expect(Object.keys(w.state.groundLoot)).toHaveLength(0);
  expect(Object.keys(w.state.deferredLoot)).toHaveLength(0);
  expect(w.state.lootMetrics.expired).toBeGreaterThan(2000);
  const bad = structuredClone(restored);
  bad.deferredLoot["pool:1"] = bad.groundLoot["pool:1"];
  expect(() => validateSave(bad)).toThrow("trùng");
});
it("v0.4 migration giữ dữ liệu, mới có vùng và loot reserve mặc định", () => {
  const old = createGame();
  const input = JSON.parse(JSON.stringify(old));
  input.contentVersion = "0.4.0";
  delete input.spawnRegions;
  delete input.deferredLoot;
  delete input.lootMetrics;
  const upgraded = validateSave(input);
  expect(upgraded.contentVersion).toBe(CONTENT_VERSION);
  expect(upgraded.inventory).toEqual(old.inventory);
  expect(upgraded.entities).toEqual(old.entities);
  expect(upgraded.spawnRegions).toEqual({});
  expect(upgraded.deferredLoot).toEqual({});
});
it("slot lỗi riêng không khóa roster, phục hồi đúng backup, import không vượt giới hạn và không trùng tên", async () => {
  const repo = new SaveRepository(),
    good = createGame("Bình Thường", "wudang", "slot-good"),
    broken = createGame("Cần Phục Hồi", "emei", "slot-broken");
  await repo.create(good);
  await repo.create(broken);
  await repo.save({ ...broken, gold: 300 });
  const db = await new Promise<IDBDatabase>((resolve) => {
    const r = indexedDB.open("kiem-hiep-web");
    r.onsuccess = () => resolve(r.result);
  });
  const record = await new Promise<{ snapshot: unknown }>((resolve) => {
    const r = db
      .transaction("saves")
      .objectStore("saves")
      .get("save:slot-broken");
    r.onsuccess = () => resolve(r.result);
  });
  await new Promise<void>((resolve) => {
    const t = db.transaction("saves", "readwrite");
    t.objectStore("saves").put({
      ...record,
      snapshot: { ...(record.snapshot as object), gold: -4 },
    });
    t.oncomplete = () => resolve();
  });
  const slots = await repo.listSlots();
  expect(slots.records.map((r) => r.characterId)).toContain(good.characterId);
  expect(slots.issues).toEqual([
    expect.objectContaining({
      characterId: broken.characterId,
      hasBackup: true,
    }),
  ]);
  // A malformed name in another slot must not prevent saving a healthy character.
  const badNameRecord = await new Promise<Record<string, unknown>>(
    (resolve) => {
      const r = db
        .transaction("saves")
        .objectStore("saves")
        .get("save:slot-broken");
      r.onsuccess = () => resolve(r.result);
    },
  );
  await new Promise<void>((resolve) => {
    const t = db.transaction("saves", "readwrite");
    t.objectStore("saves").put({
      ...badNameRecord,
      snapshot: { ...(badNameRecord.snapshot as object), name: 15 },
    });
    t.oncomplete = () => resolve();
  });
  await expect(repo.save({ ...good, gold: 220 })).resolves.toBeUndefined();
  const recovered = (await repo.recover(broken.characterId))!;
  expect(recovered.gold).toBe(180);
  await repo.save(recovered);
  expect((await repo.listSlots()).issues).toEqual([]);
  expect(
    (await repo.archives(broken.characterId)).some((a) =>
      a.reason.includes("primary lỗi"),
    ),
  ).toBe(true);
  await expect(
    repo.import(createGame("bình thường", "shaolin", "same-name")),
  ).rejects.toThrow("sử dụng");
  db.close();
});
it("30 phút farm qua rules thật sau hành trình mới, đi cổng vào large map, save giữa bãi replay đúng", () => {
  let w = new GameWorld(validateSave(starterJourney().snapshot()));
  let sequence = 0,
    kills = 0;
  const stepTimes: number[] = [],
    checkpoints: {
      tick: number;
      bytes: number;
      entities: number;
      active: number;
      inactive: number;
    }[] = [];
  const send = (command: GameCommand) =>
    w.dispatch({
      protocolVersion: 1,
      sequence: ++sequence,
      actorId: w.player.id,
      command,
    });
  const step = () => {
    const started = performance.now();
    w.step();
    stepTimes.push(performance.now() - started);
    for (const e of w.drainEvents())
      if (e.type === "death" && e.entityId !== w.player.id) kills++;
  };
  const until = (done: () => boolean, max = 4000) => {
    for (let i = 0; i < max && !done(); i++) step();
    expect(done()).toBe(true);
  };
  send({ type: "interact", targetId: "portal:highlands" });
  until(() => w.state.mapId === "highlands");
  send({ type: "interact", targetId: "portal:riverlands" });
  until(() => w.state.mapId === "riverlands");
  send({ type: "interact", targetId: "river-scout" });
  until(() => !w.state.pendingInteraction);
  send({ type: "acceptQuest", questId: "river-bridge" });
  send({ type: "move", destination: { x: 57, y: 47 } });
  until(() => !w.player.path.length);
  send({
    type: "configureAuto",
    settings: {
      pickup: true,
      rotation: true,
      potions: true,
      stopHp: 0.15,
      range: 12,
    },
  });
  send({ type: "autoAttack", enabled: true });
  const initialGold = w.state.gold,
    initialLevel = w.state.level,
    startTick = w.state.tick;
  let checkpoint: GameWorld | undefined;
  for (let i = 0; i < 36000; i++) {
    if (i % 20 === 0) {
      while (w.state.attributePoints > 0)
        send({ type: "allocate", attribute: "strength" });
      // Healing consumes the real learned skill's MP/cooldown. No injected HP/items/gold/levels.
      if (w.player.hp < w.player.maxHp * 0.8 && w.player.mp >= 22)
        send({ type: "skill", skillId: "heal" });
      if (!w.player.autoAttack && w.player.hp > w.player.maxHp * 0.5)
        send({ type: "autoAttack", enabled: true });
    }
    if (i % 6000 === 0)
      checkpoints.push({
        tick: w.state.tick,
        bytes: JSON.stringify(w.snapshot()).length,
        entities: Object.keys(w.state.entities).length,
        active: w.diagnostics.active,
        inactive: w.diagnostics.inactive,
      });
    if (i === 18000) checkpoint = new GameWorld(validateSave(w.snapshot()));
    // Compare uninterrupted and loaded simulation over a command-free window.
    if (checkpoint && i < 18020) checkpoint.step();
    step();
    if (i === 18019) expect(checkpoint!.snapshot()).toEqual(w.snapshot());
    expect(w.player.hp).toBeGreaterThan(0);
  }
  expect(w.state.tick - startTick).toBe(36000);
  expect(kills).toBeGreaterThan(30);
  const ordered = [...stepTimes].sort((a, b) => a - b);
  writeFileSync(
    "artifacts/farm-30min.json",
    JSON.stringify(
      {
        version: CONTENT_VERSION,
        simulationSeconds: 1800,
        steps: 36000,
        kills,
        initialLevel,
        finalLevel: w.state.level,
        initialGold,
        finalGold: w.state.gold,
        checkpoints,
        tickMs: {
          p50: ordered[Math.floor(ordered.length * 0.5)],
          p95: ordered[Math.floor(ordered.length * 0.95)],
          p99: ordered[Math.floor(ordered.length * 0.99)],
          max: ordered.at(-1),
        },
        grants: false,
        note: "Accelerated shared-core journey from character creation through three starter quests and real portals into riverlands. Commands allocate earned attributes, equip earned gear, heal with learned MP/cooldown, AUTO with radius12 and pickup. Does not measure rendering or device FPS. Timing includes test runner overhead/GC and is not a deterministic assertion.",
      },
      null,
      2,
    ),
  );
  expect(w.state.level).toBeGreaterThan(initialLevel);
  expect(w.state.gold).toBeGreaterThan(initialGold);
  expect(w.state.inventory.length).toBeLessThanOrEqual(32);
  const snapshot = validateSave(w.snapshot());
  expect(snapshot.entities[snapshot.playerId].mapId).toBe("riverlands");
  writeFileSync(
    "tests/fixtures/v0.5-earned-farm.json",
    JSON.stringify(snapshot, null, 2) + "\n",
  );
  w = new GameWorld(snapshot);
  expect(w.snapshot()).toEqual(snapshot);
}, 30000);

it("thông báo loot giới hạn hai dòng, không reset TTL theo snapshot; đồ mới hiện sau khi thông báo cũ hết hạn", () => {
  const notices = new LootNoticeWindow();
  const old = [{ id: "gold-1" }, { id: "gold-2" }, { id: "item-3" }];
  expect(notices.select(old, 0)).toHaveLength(2);
  for (let t = 50; t < 4000; t += 50)
    expect(notices.select(structuredClone(old), t)).toHaveLength(2);
  expect(notices.select(old, 4000)).toEqual([]);
  expect(notices.select([...old, { id: "gold-new" }], 4500)).toEqual([
    { id: "gold-new" },
  ]);
  expect(notices.select([...old, { id: "gold-new" }], 8500)).toEqual([]);
});
