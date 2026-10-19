import { legacySnapshotSchema } from "./legacy-schema";
import {
  CONTENT_VERSION,
  startingLoadout,
  defaultBranch,
  monsters,
} from "../../../game-content/src/index";
import type { CombatEntity } from "../../../game-protocol/src/index";
export function migrateLegacy(input: unknown) {
  const result = legacySnapshotSchema.safeParse(input);
  if (!result.success)
    throw new Error(
      "Bản lưu v1 sai cấu trúc hoặc phiên bản nội dung không hỗ trợ. Dữ liệu nguồn được giữ nguyên.",
    );
  const old = result.data;
  const hotbar = startingLoadout(old.classId),
    skillLevels: Record<string, number> =
      old.classId === "wudang"
        ? { ...old.skillLevels }
        : { slash: old.skillLevels.slash ?? 1 };
  if (old.classId !== "wudang")
    for (const [i, id] of hotbar.entries())
      skillLevels[id] =
        old.skillLevels[["thunder", "storm", "heal", "guard"][i]] ?? 0;
  const entities: Record<string, CombatEntity> = {};
  for (const [id, e] of Object.entries(old.entities)) {
    const d = monsters.find((m) => m.id === e.definitionId);
    entities[id] = {
      ...e,
      direction: e.facing < 0 ? 5 : 1,
      stateStartedAt: old.tick,
      statuses: [],
      casting: null,
      brain: e.hp <= 0 ? "dead" : "idle",
      threat: {},
      attackRange: e.kind === "player" ? 1.65 : (d?.range ?? 1.3),
      attackInterval: e.kind === "player" ? 18 : d?.brain === "boss" ? 32 : 40,
      movementSpeed: e.kind === "player" ? 3.4 : (d?.speed ?? 1.7),
      nextSkillTick: old.tick + 80,
    };
  }
  return {
    ...old,
    schemaVersion: 2 as const,
    contentVersion: CONTENT_VERSION,
    entities,
    skillLevels,
    branchId: defaultBranch(old.classId).id,
    hotbar,
    warehouse: [],
    professionXp: {},
    autoCombat: {
      rotation: false,
      potions: false,
      hpThreshold: 0.35,
      mpThreshold: 0.2,
      stopHp: 0.1,
      range: 9,
    },
    actors: {},
    visitedMaps: [...new Set(Object.values(entities).map((e) => e.mapId))],
    projectiles: [],
    telegraphs: [],
    nextWorldId: 1,
    paused: false,
    worldClock: {
      timeTicks: old.tick,
      weather: "clear" as const,
      nextWeatherAt: old.tick + 2400,
    },
    resources: {},
  };
}
export function migrateSave(input: unknown) {
  if (typeof input === "object" && input !== null) {
    const value = input as Record<string, unknown>;
    if (value.schemaVersion === 1) return migrateLegacy(input);
    if (
      value.schemaVersion === 2 &&
      ["0.2.0", "0.3.0", "0.4.0"].includes(String(value.contentVersion))
    )
      return { ...structuredClone(value), contentVersion: CONTENT_VERSION };
  }
  return input;
}
export function requiresMigration(input: unknown) {
  if (typeof input !== "object" || input === null) return false;
  const value = input as Record<string, unknown>;
  return (
    value.schemaVersion === 1 ||
    (value.schemaVersion === 2 &&
      ["0.2.0", "0.3.0", "0.4.0"].includes(String(value.contentVersion)))
  );
}
