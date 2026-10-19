import { it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  createGame,
  GameWorld,
  deriveStats,
} from "../../packages/game-core/src/index";
import { validateSave } from "../../packages/game-storage/src/index";
import type { GameCommand } from "../../packages/game-protocol/src/index";
it("soak 4 giờ mô phỏng: combat, respawn, maps, lưu nhiều checkpoint và replay tiếp tục", () => {
  const initial = createGame("Kiểm Tra Dài", "wudang", "long-session", 71227);
  initial.level = 100;
  initial.skillLevels = { slash: 5, thunder: 5, storm: 5, heal: 5, guard: 5 };
  initial.autoCombat = { ...initial.autoCombat, rotation: true, stopHp: 0 };
  const p = initial.entities[initial.playerId],
    stats = deriveStats(100, initial.attributes, { attack: 8, defense: 6 });
  Object.assign(p, stats, { level: 100, hp: stats.maxHp, mp: stats.maxMp });
  const w = new GameWorld(initial);
  let sequence = 0;
  const send = (command: GameCommand) =>
    w.dispatch({
      protocolVersion: 1,
      sequence: ++sequence,
      actorId: w.player.id,
      command,
    });
  function travel(portal: string, mapId: string) {
    send({ type: "interact", targetId: portal });
    for (let i = 0; i < 1000 && w.state.mapId !== mapId; i++) {
      w.step();
      if (i % 20 === 0) w.drainEvents();
    }
    expect(w.state.mapId).toBe(mapId);
  }
  travel("portal:forest", "forest");
  travel("portal:camp", "camp");
  const boss = Object.values(w.state.entities).find(
    (e) => e.definitionId === "boss",
  )!;
  send({ type: "attack", targetId: boss.id });
  const start = performance.now(),
    checkpoints: { tick: number; bytes: number; entities: number }[] = [];
  let maxEntities = 0,
    maxProjectiles = 0;
  const ticks = 4 * 60 * 60 * 20;
  for (let i = 0; i < ticks; i++) {
    w.step();
    maxEntities = Math.max(maxEntities, Object.keys(w.state.entities).length);
    maxProjectiles = Math.max(maxProjectiles, w.state.projectiles.length);
    if (i % 20 === 0) w.drainEvents();
    if (i % 36000 === 0) {
      const json = JSON.stringify(w.snapshot()),
        validated = validateSave(JSON.parse(json));
      expect(validated.entities[validated.playerId].hp).toBeGreaterThan(0);
      expect(Object.keys(validated.entities).length).toBeLessThan(40);
      expect(json.length).toBeLessThan(120000);
      checkpoints.push({
        tick: validated.tick,
        bytes: json.length,
        entities: Object.keys(validated.entities).length,
      });
    }
  }
  const snapshot = validateSave(JSON.parse(JSON.stringify(w.snapshot()))),
    resumed = new GameWorld(snapshot);
  for (let i = 0; i < 1200; i++) {
    w.step();
    resumed.step();
    if (i % 20 === 0) {
      w.drainEvents();
      resumed.drainEvents();
    }
  }
  expect(w.snapshot()).toEqual(resumed.snapshot());
  expect(w.player.hp).toBeGreaterThan(0);
  expect(checkpoints).toHaveLength(8);
  expect(maxProjectiles).toBeLessThan(128);
  mkdirSync("artifacts", { recursive: true });
  writeFileSync(
    "artifacts/long-session.json",
    JSON.stringify(
      {
        schemaVersion: 2,
        simulationHours: 4,
        ticks,
        elapsedMs: Math.round(performance.now() - start),
        maxEntities,
        maxProjectiles,
        checkpoints,
        finalTick: w.state.tick,
        finalHp: w.player.hp,
        note: "Mô phỏng headless tăng tốc; không phải 4 giờ render hay đo hiệu suất điện thoại thật.",
      },
      null,
      2,
    ),
  );
}, 60000);
