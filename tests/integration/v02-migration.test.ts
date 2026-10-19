import "fake-indexeddb/auto";
import { it, expect } from "vitest";
import legacy from "../fixtures/v0.1-save.json";
import {
  validateSave,
  SaveRepository,
} from "../../packages/game-storage/src/index";
import { createGame, GameWorld } from "../../packages/game-core/src/index";
import { animationFrame } from "../../apps/web/src/game/animations/frames";
import {
  actorVisualManifest,
  CONTENT_VERSION,
} from "../../packages/game-content/src/index";
import type {
  Direction8,
  AnimationState,
} from "../../packages/game-protocol/src/index";
it("migration fixture v0.1 thật giữ nhân vật, vị trí, đồ, quest, seed và tick", () => {
  const upgraded = validateSave(legacy);
  expect(upgraded.schemaVersion).toBe(2);
  expect(upgraded.contentVersion).toBe(CONTENT_VERSION);
  expect(upgraded.characterId).toBe(legacy.characterId);
  expect(upgraded.gold).toBe(legacy.gold);
  expect(upgraded.experience).toBe(legacy.experience);
  expect(upgraded.inventory).toEqual(legacy.inventory);
  expect(upgraded.equipment).toEqual(legacy.equipment);
  expect(upgraded.quests).toEqual(legacy.quests);
  expect(upgraded.rngState).toBe(legacy.rngState);
  expect(upgraded.tick).toBe(legacy.tick);
  expect(upgraded.entities[upgraded.playerId].x).toBe(
    legacy.entities[legacy.playerId as keyof typeof legacy.entities].x,
  );
  expect(upgraded.hotbar).toEqual(["thunder", "storm", "heal", "guard"]);
});
it("đọc DB v1 nâng schema và lưu nguyên bản nguồn vào archive trước khi thay primary", async () => {
  const old = await openRaw(10);
  await putRaw(old, {
    saveId: `save:${legacy.characterId}`,
    characterId: legacy.characterId,
    savedAt: 123,
    snapshot: legacy,
  });
  old.close();
  const repo = new SaveRepository();
  const loaded = await repo.load(legacy.characterId);
  expect(loaded?.schemaVersion).toBe(2);
  expect((await repo.archives(legacy.characterId))[0].snapshot).toEqual(legacy);
  expect((await repo.listRaw())[0].snapshot.schemaVersion).toBe(2);
  await repo.load(legacy.characterId);
  expect(await repo.archives(legacy.characterId)).toHaveLength(1);
});
it("import v1 giữ nguồn; unknown/future content version bị từ chối", async () => {
  const repo = new SaveRepository();
  await repo.import(legacy);
  expect(
    (await repo.archives(legacy.characterId)).some((a) =>
      a.reason.includes("import"),
    ),
  ).toBe(true);
  expect(() => validateSave({ ...legacy, contentVersion: "9.9.9" })).toThrow();
  expect(() => validateSave({ ...createGame(), schemaVersion: 3 })).toThrow();
});
it("primary hỏng không ghi đè backup lành, được giữ nguyên để phục hồi", async () => {
  const repo = new SaveRepository(),
    s = createGame("An Toàn", "wudang", "corrupt-primary");
  await repo.save(s);
  s.gold = 200;
  await repo.save(s);
  const raw = await openRaw();
  const bad = { ...s, gold: -100 };
  await putRaw(raw, {
    saveId: `save:${s.characterId}`,
    characterId: s.characterId,
    savedAt: 321,
    snapshot: bad,
  });
  raw.close();
  await expect(repo.load(s.characterId)).rejects.toThrow();
  s.gold = 300;
  await repo.save(s);
  expect((await repo.recover(s.characterId))!.gold).toBe(180);
  expect((await repo.load(s.characterId))!.gold).toBe(300);
  expect(
    (await repo.archives(s.characterId)).some(
      (a) => a.snapshot && JSON.stringify(a.snapshot) === JSON.stringify(bad),
    ),
  ).toBe(true);
});
it("animation có 8 hướng × 8 trạng thái × 6 frames và death không loop về idle", () => {
  const all = new Set<number>();
  for (const state of actorVisualManifest.states)
    for (let dir = 0; dir < 8; dir++)
      for (let tick = 0; tick < 40; tick++)
        all.add(animationFrame(state, dir as Direction8, tick, 0));
  expect(all.size).toBe(384);
  for (const state of ["dead", "hit", "revive"] as AnimationState[])
    expect(animationFrame(state, 2, 9999, 0)).toBe(
      animationFrame(state, 2, 10000, 0),
    );
  expect(animationFrame("walk", 0, 2, 0)).not.toBe(
    animationFrame("walk", 0, 8, 0),
  );
});
it("world nhiều actor serialize và replay vẫn xác định qua save/load", () => {
  const a = new GameWorld(createGame("Người Một", "tangmen", "multi-one"));
  const id = a.addPlayer(createGame("Người Hai", "emei", "multi-two"));
  a.dispatch({
    protocolVersion: 1,
    sequence: 1,
    actorId: id,
    command: { type: "move", destination: { x: 16, y: 14 } },
  });
  for (let i = 0; i < 100; i++) a.step();
  const b = new GameWorld(
    validateSave(JSON.parse(JSON.stringify(a.snapshot()))),
  );
  for (let i = 0; i < 1000; i++) {
    a.step();
    b.step();
  }
  expect(a.snapshot()).toEqual(b.snapshot());
  expect(b.state.actors[id].classId).toBe("emei");
});

function openRaw(version?: number) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = version
      ? indexedDB.open("kiem-hiep-web", version)
      : indexedDB.open("kiem-hiep-web");
    r.onupgradeneeded = () => {
      for (const name of ["saves", "backups"])
        if (!r.result.objectStoreNames.contains(name)) {
          const store = r.result.createObjectStore(name, { keyPath: "saveId" });
          store.createIndex("characterId", "characterId");
          store.createIndex("savedAt", "savedAt");
        }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
function putRaw(db: IDBDatabase, data: unknown) {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("saves", "readwrite");
    tx.objectStore("saves").put(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
