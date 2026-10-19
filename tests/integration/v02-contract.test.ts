import { it, expect, vi } from "vitest";
import {
  GameWorld,
  createGame,
  deriveStats,
} from "../../packages/game-core/src/index";
import {
  commandEnvelopeSchema,
  type CommandEnvelope,
} from "../../packages/game-protocol/src/index";
import {
  classDefinitions,
  worldTime,
  DAY_LENGTH_TICKS,
  maps,
} from "../../packages/game-content/src/index";
import { validateSave } from "../../packages/game-storage/src/index";
it("envelope kiểm tra runtime, từ chối lệnh lạ, giá trị không hữu hạn, extra field và sequence sai", () => {
  const w = new GameWorld(createGame()),
    before = w.snapshot(),
    base = { protocolVersion: 1 as const, sequence: 1, actorId: w.player.id };
  const invalid: unknown[] = [
    { ...base, command: { type: "grantGold", amount: 9999 } },
    { ...base, command: { type: "move", destination: { x: NaN, y: 2 } } },
    {
      ...base,
      command: { type: "configureAuto", settings: { hpThreshold: 2 } },
    },
    { ...base, command: { type: "bindSkill", skillId: "thunder", slot: 10 } },
    { ...base, sequence: 0, command: { type: "stop" } },
    { ...base, command: { type: "settings", settings: { damage: 999 } } },
    { ...base, command: { type: "pause", paused: true }, gold: 100 },
  ];
  for (const value of invalid) {
    expect(commandEnvelopeSchema.safeParse(value).success).toBe(false);
    expect(() => w.dispatch(value as CommandEnvelope)).not.toThrow();
  }
  expect(w.snapshot()).toEqual(before);
  expect(w.drainEvents().filter((e) => e.type === "error")).toHaveLength(
    invalid.length,
  );
  w.dispatch({
    ...base,
    command: { type: "move", destination: { x: 15, y: 14 } },
  });
  expect(w.player.path.length).toBeGreaterThan(0);
});
it("không thực thi lại sequence cũ hoặc command từ monster", () => {
  const w = new GameWorld(createGame());
  w.state.attributePoints = 5;
  const c: CommandEnvelope = {
    protocolVersion: 1,
    sequence: 1,
    actorId: w.player.id,
    command: { type: "allocate", attribute: "energy" },
  };
  w.dispatch(c);
  w.dispatch(c);
  expect(w.state.attributePoints).toBe(4);
  w.dispatch({
    ...c,
    actorId: Object.values(w.state.entities).find((e) => e.kind === "monster")!
      .id,
    sequence: 2,
  });
  expect(w.state.attributePoints).toBe(4);
});
it("thuộc tính ưu tiên của từng môn phái tăng damage thực tế", () => {
  for (const sect of classDefinitions) {
    const a = { strength: 8, dexterity: 8, vitality: 8, energy: 8 },
      b = { ...a, [sect.preferredStat]: 13 };
    expect(
      deriveStats(10, b, { attack: 0, defense: 0 }, sect.preferredStat).attack,
    ).toBeGreaterThan(
      deriveStats(10, a, { attack: 0, defense: 0 }, sect.preferredStat).attack,
    );
  }
});
it("game clock qua nửa đêm, chu kỳ và pause/load nhất quán", () => {
  expect(worldTime(0)).toMatchObject({ day: 1, hour: 6, minute: 0 });
  expect(worldTime((DAY_LENGTH_TICKS * 3) / 4)).toMatchObject({
    day: 2,
    hour: 0,
    minute: 0,
  });
  expect(worldTime(DAY_LENGTH_TICKS)).toMatchObject({
    day: 2,
    hour: 6,
    minute: 0,
  });
  const a = new GameWorld(createGame());
  for (let i = 0; i < 2500; i++) {
    a.step();
    a.drainEvents();
  }
  const b = new GameWorld(validateSave(a.snapshot()));
  for (let i = 0; i < 2500; i++) {
    a.step();
    b.step();
    a.drainEvents();
    b.drainEvents();
  }
  expect(a.snapshot()).toEqual(b.snapshot());
});
it("thêm spawn mới vào map đã thăm khi load không reset xác chết hay timer cũ", () => {
  const s = createGame(),
    dead = Object.values(s.entities).find((e) => e.kind === "monster")!;
  dead.hp = 0;
  dead.respawnAt = 500;
  dead.state = "dead";
  dead.brain = "dead";
  s.visitedMaps.push("forest");
  const w = new GameWorld(validateSave(s));
  expect(w.state.entities[dead.id].hp).toBe(0);
  expect(w.state.entities[dead.id].respawnAt).toBe(500);
  expect(
    Object.values(w.state.entities).filter((e) => e.mapId === "forest"),
  ).toHaveLength(maps.find((m) => m.id === "forest")!.spawns.length);
  const again = new GameWorld(validateSave(w.snapshot()));
  expect(again.snapshot()).toEqual(w.snapshot());
});
it("bản lưu từ chối skill ngoại phái, ngọc quá số ô, metadata sai và tham chiếu quái lạ", () => {
  const s = createGame();
  s.skillLevels["tm-dart-shot"] = 1;
  expect(() => validateSave(s)).toThrow();
  delete s.skillLevels["tm-dart-shot"];
  s.equipment.weapon.gems = ["jade-gem", "jade-gem"];
  expect(() => validateSave(s)).toThrow();
  s.equipment.weapon.enhancement = 3;
  expect(() => validateSave(s)).not.toThrow();
  s.inventory[0].enhancement = 1;
  expect(() => validateSave(s)).toThrow();
  delete s.inventory[0].enhancement;
  Object.values(s.entities).find((e) => e.kind === "monster")!.definitionId =
    "missing-monster";
  expect(() => validateSave(s)).toThrow();
});

it("replay không phụ thuộc collation/locale của máy authority", () => {
  const run = () => {
    const w = new GameWorld(createGame("Một Người", "wudang", "é-player"));
    w.addPlayer(createGame("Người Hai", "emei", "z-player"));
    w.dispatch({
      protocolVersion: 1,
      sequence: 1,
      actorId: w.player.id,
      command: { type: "sortInventory" },
    });
    w.dispatch({
      protocolVersion: 1,
      sequence: 2,
      actorId: w.player.id,
      command: { type: "autoAttack", enabled: true },
    });
    for (let i = 0; i < 300; i++) {
      w.step();
      w.drainEvents();
    }
    return w.snapshot();
  };
  const baseline = run();
  const original = String.prototype.localeCompare;
  const collation = vi
    .spyOn(String.prototype, "localeCompare")
    .mockImplementation(function (this: string, other: string) {
      return -original.call(this, other);
    });
  let alternate;
  try {
    alternate = run();
  } finally {
    collation.mockRestore();
  }
  expect(alternate).toEqual(baseline);
});
