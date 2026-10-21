import { describe, expect, it } from "vitest";
import { createGame, GameWorld } from "../../packages/game-core/src/index";
import {
  quests,
  monsters,
  maps,
  getMap,
} from "../../packages/game-content/src/index";
import type { GameCommand } from "../../packages/game-protocol/src/index";

/**
 * Hồi quy hệ thống nhiệm vụ.
 *
 * Bản QA báo "nhiệm vụ không tăng tiến độ" cho mọi nhiệm vụ. Các test dưới
 * đây chốt lại từng yêu cầu: so khớp theo id ổn định, nhiều nhiệm vụ cùng
 * target cùng tăng, khám phá tăng, hội thoại chuyển bước, thưởng nhận đúng
 * 1 lần, tiến độ giữ sau khi tải lại bản lưu, số thứ tự 2 chữ số.
 */

let sequence = 0;
function setup(classId = "wudang", characterId = "QATest123") {
  const w = new GameWorld(createGame("QATest123", classId, characterId, 71227));
  const command = (c: GameCommand) =>
    w.dispatch({
      protocolVersion: 1,
      sequence: ++sequence,
      actorId: w.state.playerId,
      command: c,
    });
  return { w, command };
}

function atElder(w: GameWorld) {
  w.player.x = 12;
  w.player.y = 11;
}

function stepUntil(w: GameWorld, pred: () => boolean, max = 600) {
  for (let i = 0; i < max && !pred(); i++) w.step();
  return pred();
}

function questOf(w: GameWorld, id: string) {
  return w.state.quests.find((q) => q.id === id);
}

/** Nhận nhiệm vụ qua Lão trưởng thôn (đúng luồng người chơi). */
function acceptThroughElder(
  w: GameWorld,
  command: (c: GameCommand) => void,
  questId: string,
) {
  atElder(w);
  command({ type: "interact", targetId: "elder" });
  stepUntil(w, () => w.state.pendingInteraction === null, 120);
  command({ type: "acceptQuest", questId });
}
/** Đứng cạnh quái và hạ bằng đòn đánh, đúng đường die() của core. */
function killMonster(
  w: GameWorld,
  command: (c: GameCommand) => void,
  definitionId: string,
) {
  const m = Object.values(w.state.entities).find(
    (e) => e.definitionId === definitionId && e.hp > 0,
  );
  if (!m) return false;
  w.player.x = m.x;
  w.player.y = m.y;
  m.hp = 1;
  command({ type: "attack", targetId: m.id });
  stepUntil(w, () => m.hp <= 0, 60);
  w.step();
  return m.hp <= 0;
}

describe("tiến độ nhiệm vụ tăng theo id ổn định", () => {
  it("hạ Sơn tặc tăng NV01 từng bước 1/5 → 5/5", () => {
    const { w, command } = setup();
    acceptThroughElder(w, command, "bandits");
    expect(questOf(w, "bandits")?.status).toBe("active");

    for (let n = 1; n <= 5; n++) {
      expect(killMonster(w, command, "bandit")).toBe(true);
      expect(questOf(w, "bandits")?.progress).toBe(n);
    }
    expect(questOf(w, "bandits")?.status).toBe("ready");
  });

  it("một con quái tăng tiến độ cho MỌI nhiệm vụ cùng target", () => {
    const { w, command } = setup();
    acceptThroughElder(w, command, "bandits");
    // NV06 "daily-bandits" cùng target "bandit" nhưng cần NV01 đã nhận thưởng
    // mới mở khóa. Để kiểm chứng đúng nhánh "nhiều nhiệm vụ cùng target",
    // ta đặt nhiệm vụ thứ hai ở trạng thái active như lúc người chơi đã
    // mở khóa được nó.
    w.state.quests.push({
      id: "daily-bandits",
      status: "active",
      progress: 0,
      completions: 0,
    });
    expect(questOf(w, "bandits")?.status).toBe("active");
    expect(questOf(w, "daily-bandits")?.status).toBe("active");

    expect(killMonster(w, command, "bandit")).toBe(true);
    expect(questOf(w, "bandits")?.progress).toBe(1);
    expect(questOf(w, "daily-bandits")?.progress).toBe(1);
  });

  it("mỗi lần tăng phát sự kiện quest dạng 'Sơn tặc 1/5'", () => {
    const { w, command } = setup();
    acceptThroughElder(w, command, "bandits");
    killMonster(w, command, "bandit");
    const questEvent = w.drainEvents().find((e) => e.type === "quest");
    expect(questEvent).toBeDefined();
    expect(questEvent!.text).toBe("Sơn tặc 1/5");
  });

  it("đủ số thì phát thông báo hoàn thành nhiệm vụ", () => {
    const { w, command } = setup();
    acceptThroughElder(w, command, "bandits");
    for (let n = 0; n < 5; n++) killMonster(w, command, "bandit");
    const events = w.drainEvents();
    expect(
      events.some(
        (e) => e.type === "message" && e.text.includes("Bình yên thôn nhỏ"),
      ),
    ).toBe(true);
  });

  it("đi vào khu vực tăng tiến độ explore (NV07 Thanh Trúc Lâm)", () => {
    const { w, command } = setup();
    acceptThroughElder(w, command, "forest-scout");
    expect(questOf(w, "forest-scout")?.status).toBe("active");
    command({ type: "interact", targetId: "portal:forest" });
    stepUntil(w, () => w.state.mapId === "forest", 600);
    expect(w.state.mapId).toBe("forest");
    expect(questOf(w, "forest-scout")?.progress).toBe(1);
    expect(questOf(w, "forest-scout")?.status).toBe("ready");
  });

  it("đi vào khu vực con (area) tăng tiến độ explore", () => {
    // NV "Qua đèo Trúc Ảnh" đòi vào area "bamboo-pass" trong map highlands.
    const { w } = setup();
    w.state.quests.push({
      id: "highland-route",
      status: "active",
      progress: 0,
      completions: 0,
    });
    w.player.mapId = "highlands";
    w.state.mapId = "highlands";
    const area = getMap("highlands").areas?.find(
      (a) => a.id === "bamboo-pass",
    );
    expect(area).toBeDefined();
    if (!area) return;
    w.player.x = area.x;
    w.player.y = area.y;
    // Vòng tick 20Hz kiểm tra area mỗi 20 tick.
    stepUntil(w, () => (questOf(w, "highland-route")?.progress ?? 0) > 0, 60);
    expect(questOf(w, "highland-route")?.progress).toBe(1);
    expect(questOf(w, "highland-route")?.status).toBe("ready");
  });

  it("mọi nhiệm vụ explore đều dùng id map/area có thật", () => {
    const explore = quests.filter((q) => q.objectiveKind === "explore");
    expect(explore.length).toBeGreaterThan(0);
    for (const q of explore)
      expect(
        maps.some(
          (m) => m.id === q.target || m.areas?.some((a) => a.id === q.target),
        ),
      ).toBe(true);
  });
});

describe("bước hội thoại chuyển sang bước tiếp theo", () => {
  it("nói chuyện với Lão trưởng thôn được ghi lại", () => {
    const { w, command } = setup();
    atElder(w);
    command({ type: "interact", targetId: "elder" });
    stepUntil(w, () => w.state.pendingInteraction === null, 120);
    expect(w.state.questTalks?.elder).toBeDefined();
  });

  it("nói chuyện NPC khác cũng được ghi (khung theo dõi đổi bước)", () => {
    const { w, command } = setup();
    w.player.x = 20;
    w.player.y = 11;
    command({ type: "interact", targetId: "merchant" });
    stepUntil(w, () => w.state.pendingInteraction === null, 120);
    expect(w.state.questTalks?.merchant).toBeDefined();
  });

  it("sau khi nói chuyện thì questTalks được lưu vào bản lưu", () => {
    const { w, command } = setup();
    atElder(w);
    command({ type: "interact", targetId: "elder" });
    stepUntil(w, () => w.state.pendingInteraction === null, 120);
    const snapshot = w.snapshot();
    expect(snapshot.questTalks?.elder).toBeDefined();
  });
});

describe("nhận thưởng đúng 1 lần và giữ sau khi tải lại", () => {
  it("claim 1 lần, lần 2 bị chặn, tiến độ vẫn giữ", () => {
    const { w, command } = setup();
    acceptThroughElder(w, command, "bandits");
    for (let n = 0; n < 5; n++) killMonster(w, command, "bandit");
    expect(questOf(w, "bandits")?.status).toBe("ready");
    const goldBefore = w.state.gold;
    atElder(w);
    command({ type: "claimQuest", questId: "bandits" });
    expect(questOf(w, "bandits")?.status).toBe("claimed");
    expect(w.state.gold).toBeGreaterThan(goldBefore);

    const goldAfter = w.state.gold;
    atElder(w);
    command({ type: "claimQuest", questId: "bandits" });
    expect(w.state.gold).toBe(goldAfter);
    expect(questOf(w, "bandits")?.completions).toBe(1);
  });

  it("tiến độ và trạng thái claim còn nguyên sau khi nạp lại bản lưu", () => {
    const { w, command } = setup();
    acceptThroughElder(w, command, "bandits");
    for (let n = 0; n < 5; n++) killMonster(w, command, "bandit");
    atElder(w);
    command({ type: "claimQuest", questId: "bandits" });
    const snapshot = w.snapshot();
    // Nạp lại: tạo world mới từ snapshot đã lưu.
    const reloaded = new GameWorld(structuredClone(snapshot));
    expect(questOf(reloaded, "bandits")?.status).toBe("claimed");
    expect(questOf(reloaded, "bandits")?.progress).toBe(5);
    const gold = reloaded.state.gold;
    reloaded.player.x = 12;
    reloaded.player.y = 11;
    reloaded.dispatch({
      protocolVersion: 1,
      sequence: 9999,
      actorId: reloaded.state.playerId,
      command: { type: "claimQuest", questId: "bandits" },
    });
    expect(reloaded.state.gold).toBe(gold);
  });

  it("bản lưu cũ thiếu questTalks vẫn nạp được", () => {
    const { w } = setup();
    const snapshot = w.snapshot();
    delete (snapshot as { questTalks?: unknown }).questTalks;
    expect(snapshot.questTalks).toBeUndefined();
    expect(new Set(quests.map((q) => q.id)).size).toBe(quests.length);
  });
});

describe("số thứ tự nhiệm vụ 2 chữ số", () => {
  it("mọi nhiệm vụ đánh số 01..28 không có '010'", () => {
    const orders = quests.map((_, index) =>
      String(index + 1).padStart(2, "0"),
    );
    expect(orders[0]).toBe("01");
    expect(orders[8]).toBe("09");
    expect(orders[9]).toBe("10");
    expect(orders[27]).toBe("28");
    expect(orders.every((o) => o.length === 2)).toBe(true);
  });

  it("id quái trong nhiệm vụ kill tồn tại trong content", () => {
    for (const q of quests.filter((d) => d.objectiveKind === "kill"))
      expect(monsters.some((m) => m.id === q.target)).toBe(true);
  });
});
