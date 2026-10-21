import { describe, expect, it } from "vitest";
import { createGame } from "@kiem-hiep/game-core";
import type { GameEvent } from "@kiem-hiep/game-protocol";
import { bossMechanicEvent } from "../../apps/web/src/game/world/boss-effects";
/** Snapshot làng Tân Thủ + một quái mang định nghĩa boss (cơ chế quake). */
function fixture() {
  const snapshot = createGame("Kiểm Tra", "wudang", "boss-effects", 4242);
  const template = Object.values(snapshot.entities).find(
    (e) => e.kind === "monster",
  )!;
  snapshot.entities["camp:boss-kiem-tra"] = {
    ...template,
    id: "camp:boss-kiem-tra",
    definitionId: "boss",
  };
  return snapshot;
}
const event = (patch: Partial<GameEvent> = {}): GameEvent => ({
  id: 1,
  tick: 0,
  type: "skill",
  text: "",
  entityId: "camp:boss-kiem-tra",
  ...patch,
});
describe("nhận diện kỹ năng cơ chế boss cho hiệu ứng hiển thị", () => {
  it("chỉ nhận skill/impact của quái có bossMechanic quake/storm", () => {
    const snapshot = fixture();
    expect(bossMechanicEvent(event(), snapshot)).toBe("quake");
    expect(bossMechanicEvent(event({ type: "impact" }), snapshot)).toBe(
      "quake",
    );
    expect(bossMechanicEvent(event({ type: "damage" }), snapshot)).toBeNull();
    expect(bossMechanicEvent(event({ type: "heal" }), snapshot)).toBeNull();
  });
  it("bỏ qua sự kiện không có nguồn, nguồn là người chơi hoặc quái thường", () => {
    const snapshot = fixture();
    expect(
      bossMechanicEvent(event({ entityId: undefined }), snapshot),
    ).toBeNull();
    expect(
      bossMechanicEvent(event({ entityId: snapshot.playerId }), snapshot),
    ).toBeNull();
    const bandit = Object.values(snapshot.entities).find(
      (e) => e.kind === "monster" && e.definitionId === "bandit",
    )!;
    expect(
      bossMechanicEvent(event({ entityId: bandit.id }), snapshot),
    ).toBeNull();
  });
});
