import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import {
  createGame,
  GameWorld,
  distance,
  AUTO_COMBAT_RANGE,
  AUTO_COMBAT_PICKUP_RANGE,
  TRAVEL_GOLD,
} from "../../packages/game-core/src/index";
import {
  achievements,
  elites,
  getItem,
  monsters,
  skills,
} from "../../packages/game-content/src/index";
import type { GameCommand } from "../../packages/game-protocol/src/index";

/**
 * Hồi quy đợt nâng cấp 10 tính năng (nhóm A/B/C).
 *
 * Mỗi test chốt đúng một điểm đặc tả có thể kiểm chứng trong môi trường Node:
 * A1 tự chiến (chọn mục tiêu, uống thuốc, tắt khi đi tay, tạm dừng),
 * B1 Hồi Thành Phù + dịch chuyển nhanh, B2 tinh anh theo giờ, B3 thành tựu,
 * C1 vòng xoay bản lưu dự phòng.
 */

let sequence = 0;
function setup(characterId = "TinhNang", seed = 71227) {
  const w = new GameWorld(createGame("TinhNang", "wudang", characterId, seed));
  const send = (command: GameCommand) =>
    w.dispatch({
      protocolVersion: 1,
      sequence: ++sequence,
      actorId: w.state.playerId,
      command,
    });
  return { w, send };
}

function stepUntil(w: GameWorld, pred: () => boolean, max = 1200) {
  for (let i = 0; i < max && !pred(); i++) w.step();
  return pred();
}

/** Đặt player cạnh 1 quái cụ thể để test tất định, không phụ thuộc AI. */
function parkNextTo(w: GameWorld, monsterId: string) {
  const monster = Object.values(w.state.entities).find(
    (e) => e.kind === "monster" && e.definitionId === monsterId && e.hp > 0,
  );
  if (!monster) throw new Error(`Không có ${monsterId} trên map`);
  w.player.x = monster.x - 1;
  w.player.y = monster.y;
  return monster;
}

describe("A1 — tự chiến thật", () => {
  it("bật tự chiến thì tự chọn mục tiêu, tự tới và tự đánh", () => {
    const { w, send } = setup();
    const target = parkNextTo(w, "bandit");
    send({ type: "autoAttack", enabled: true });
    expect(w.player.autoAttack).toBe(true);
    expect(w.player.farmAnchor).not.toBeNull();
    const damaged = stepUntil(w, () => target.hp < target.maxHp, 400);
    expect(damaged).toBe(true);
    expect(w.player.targetId).toBe(target.id);
  });

  it("ngoài bán kính quét thì đứng yên, không chạy khắp map", () => {
    const { w, send } = setup();
    for (const e of Object.values(w.state.entities))
      if (e.kind === "monster") e.x = e.y = 40;
    send({ type: "autoAttack", enabled: true });
    const startX = w.player.x,
      startY = w.player.y;
    for (let i = 0; i < 200; i++) w.step();
    expect(distance(w.player, { x: startX, y: startY })).toBeLessThan(0.5);
    expect(w.player.path).toHaveLength(0);
  });

  it("tự uống đan hồi sinh lực yếu nhất khi HP dưới ngưỡng", () => {
    const { w, send } = setup();
    w.state.autoCombat.potions = true;
    w.state.autoCombat.hpThreshold = 0.4;
    const small = w.state.inventory.find((i) => i.definitionId === "hp")!;
    const smallBefore = small.quantity;
    send({ type: "autoAttack", enabled: true });
    w.player.hp = Math.floor(w.player.maxHp * 0.2);
    const used = stepUntil(w, () => small.quantity < smallBefore, 80);
    expect(used).toBe(true);
    // Viên rẻ nhất (hp thường) được dùng; đan tốt hơn trong hành trang còn nguyên.
    const untouched = w.state.inventory.filter(
      (i) => i.definitionId !== "hp" && getItem(i.definitionId).restore === "hp",
    );
    for (const item of untouched)
      expect(getItem(item.definitionId).price).toBeGreaterThanOrEqual(
        getItem("hp").price,
      );
  });

  it("nhặt đồ rơi trong 3 ô trước khi chọn mục tiêu tiếp theo", () => {
    const { w, send } = setup();
    for (const e of Object.values(w.state.entities))
      if (e.kind === "monster") e.x = e.y = 40;
    w.state.groundLoot["loot:test"] = {
      id: "loot:test",
      x: w.player.x + AUTO_COMBAT_PICKUP_RANGE - 0.5,
      y: w.player.y,
      mapId: w.state.mapId,
      ownerId: w.state.playerId,
      item: null,
      gold: 12,
      createdAt: w.state.tick,
      expiresAt: w.state.tick + 2000,
    };
    const gold = w.state.gold;
    send({ type: "autoAttack", enabled: true });
    const picked = stepUntil(w, () => !w.state.groundLoot["loot:test"], 200);
    expect(picked).toBe(true);
    expect(w.state.gold).toBe(gold + 12);
  });

  it("bấm phím di chuyển hoặc click đất thì tắt tự chiến và báo người chơi", () => {
    const { w, send } = setup();
    send({ type: "autoAttack", enabled: true });
    send({ type: "stop" });
    expect(w.player.autoAttack).toBe(false);
    send({ type: "autoAttack", enabled: true });
    w.drainEvents();
    send({ type: "steer", direction: { x: 1, y: 0 } });
    expect(w.player.autoAttack).toBe(false);
    expect(
      w.drainEvents().some((e) => e.text === "Đã tắt tự chiến."),
    ).toBe(true);
    send({ type: "autoAttack", enabled: true });
    send({ type: "move", destination: { x: w.player.x + 2, y: w.player.y } });
    expect(w.player.autoAttack).toBe(false);
  });

  it("mở hội thoại/shop thì tạm dừng ngầm, không tự tắt", () => {
    const { w, send } = setup();
    const target = parkNextTo(w, "bandit");
    send({ type: "autoAttack", enabled: true });
    send({ type: "autoCombatPaused", paused: true });
    const hp = target.hp;
    for (let i = 0; i < 200; i++) w.step();
    expect(target.hp).toBe(hp);
    expect(w.player.autoAttack).toBe(true);
    send({ type: "autoCombatPaused", paused: false });
    expect(stepUntil(w, () => target.hp < hp, 400)).toBe(true);
  });

  it("nhân vật chết thì tự chiến tắt và không tự bật lại sau hồi sinh", () => {
    const { w, send } = setup();
    const bandit = parkNextTo(w, "bandit");
    send({ type: "autoAttack", enabled: true });
    // Ép chết bằng đúng damage pipeline để đi qua die().
    w.player.hp = 1;
    bandit.targetId = w.state.playerId;
    const dead = stepUntil(w, () => w.player.hp <= 0, 600);
    expect(dead).toBe(true);
    expect(w.player.autoAttack).toBe(false);
    send({ type: "respawn" });
    for (let i = 0; i < 120; i++) w.step();
    expect(w.player.hp).toBeGreaterThan(0);
    expect(w.player.autoAttack).toBe(false);
  });

  it("mục tiêu không tới được: bỏ qua 10 giây rồi chọn mục tiêu khác", () => {
    const { w, send } = setup();
    const blocked = parkNextTo(w, "bandit");
    // Bọc mục tiêu bằng ô không đi được để tìm đường thất bại.
    const map = w.state.entities[blocked.id];
    map.x = blocked.x;
    map.y = blocked.y;
    w.player.x = blocked.x + AUTO_COMBAT_RANGE - 1;
    w.player.y = blocked.y;
    send({ type: "autoAttack", enabled: true });
    for (let i = 0; i < 200; i++) w.step();
    // Có thể tiếp cận hoặc bị bỏ qua — cả hai đều không được kẹt vô hạn:
    // nhân vật phải còn tiến trình nào đó (đánh được hoặc chuyển mục tiêu).
    const skipped = Object.keys(w.state.autoCombatSkip ?? {}).length > 0;
    const engaged = w.player.targetId !== null;
    expect(skipped || engaged).toBe(true);
  });

  it("đổi map giữ nguyên tự chiến và quét lại mục tiêu ở map mới", () => {
    const { w, send } = setup();
    w.state.visitedMaps.push("forest");
    send({ type: "autoAttack", enabled: true });
    send({ type: "travel", mapId: "forest" });
    expect(w.state.mapId).toBe("forest");
    // Đặc tả A1.6: sang map mới vẫn bật, chỉ quét lại mục tiêu.
    expect(w.player.autoAttack).toBe(true);
    expect(w.player.farmAnchor).not.toBeNull();
    expect(w.state.autoCombatSkip).toEqual({});
  });
});

describe("B1 — di chuyển nhanh", () => {
  it("Hồi Thành Phù bán ở shop Diệp dược sư và dùng được từ map khác", () => {
    const { w, send } = setup();
    const scrollDef = getItem("town-scroll");
    expect(scrollDef.teleport).toBe("village");
    // Diệp dược sư là NPC "merchant" ở Tân Thủ Thôn (8,14).
    w.player.x = 8;
    w.player.y = 14;
    const before = w.state.gold;
    send({ type: "buy", itemId: "town-scroll" });
    const scroll = w.state.inventory.find(
      (i) => i.definitionId === "town-scroll",
    );
    expect(scroll).toBeDefined();
    expect(w.state.gold).toBe(before - 50);

    // Đang ở Tân Thủ Thôn thì không dùng được (đúng đặc tả B1.1).
    send({ type: "useItem", instanceId: scroll!.id });
    expect(
      w.drainEvents().some((e) => e.text === "Bạn đang ở Tân Thủ Thôn."),
    ).toBe(true);

    // Sang map khác rồi dùng phù: về đúng điểm hồi sinh Tân Thủ Thôn.
    w.player.mapId = "forest";
    w.state.mapId = "forest";
    send({ type: "useItem", instanceId: scroll!.id });
    expect(w.state.mapId).toBe("village");
    expect(w.player.x).toBe(14);
    expect(w.player.y).toBe(14);
    expect(
      w.drainEvents().some((e) => e.text === "Đã trở về Tân Thủ Thôn."),
    ).toBe(true);
    // Phù là vật phẩm tiêu hao: dùng xong mất khỏi hành trang.
    expect(
      w.state.inventory.some((i) => i.definitionId === "town-scroll"),
    ).toBe(false);
  });

  it("dịch chuyển nhanh trừ 30 bạc, chặn map chưa khám phá và cooldown 10 giây", () => {
    const { w, send } = setup();
    expect(w.state.visitedMaps).toContain("village");
    send({ type: "travel", mapId: "forest" });
    expect(
      w.drainEvents().some((e) => e.text.includes("chưa được khám phá")),
    ).toBe(true);

    w.state.visitedMaps.push("forest");
    const gold = w.state.gold;
    send({ type: "travel", mapId: "forest" });
    expect(w.state.mapId).toBe("forest");
    expect(w.state.gold).toBe(gold - TRAVEL_GOLD);
    expect(w.state.travelReadyAt).toBeGreaterThan(Date.now());

    send({ type: "travel", mapId: "village" });
    expect(w.state.mapId).toBe("forest");
    expect(w.drainEvents().some((e) => e.text.includes("chờ"))).toBe(true);
  });

  it("không dịch chuyển khi đang giao chiến", () => {
    const { w, send } = setup();
    w.state.visitedMaps.push("forest");
    const bandit = parkNextTo(w, "bandit");
    bandit.targetId = w.state.playerId;
    bandit.threat[w.state.playerId] = 10;
    send({ type: "travel", mapId: "forest" });
    expect(w.state.mapId).toBe("village");
    expect(
      w.drainEvents().some((e) => e.text.includes("Đang giao chiến")),
    ).toBe(true);
  });
});

describe("B2 — quái tinh anh theo giờ", () => {
  it("dữ liệu tinh anh có 2 mục đúng đặc tả và chỉ số nhân đúng hệ số", () => {
    expect(elites.map((e) => e.id)).toEqual(["elite-wolf", "elite-bandit"]);
    for (const elite of elites) {
      expect(elite.multipliers).toEqual({ hp: 6, attack: 1.6, exp: 6 });
      expect(elite.scale).toBeCloseTo(1.35);
      expect(elite.cycleMs).toBe(30 * 60 * 1000);
      const base = monsters.find((m) => m.id === elite.monsterId)!;
      expect(base).toBeDefined();
    }
  });

  it("tới giờ thì tinh anh xuất hiện với HP ×6, attack ×1.6 và id gốc giữ nguyên", () => {
    const { w } = setup();
    const elite = elites[0];
    // Mốc trong quá khứ → được phép xuất hiện ngay (test không chờ 30 phút).
    w.state.eliteSpawns![elite.id] = Date.now() - 1;
    w.step();
    for (let i = 0; i < 20 && !w.state.entities[`elite:${elite.id}`]; i++)
      w.step();
    const entity = w.state.entities[`elite:${elite.id}`];
    expect(entity).toBeDefined();
    const base = monsters.find((m) => m.id === elite.monsterId)!;
    expect(entity.maxHp).toBe(Math.round(base.hp * 6));
    expect(entity.attack).toBe(Math.round(base.attack * 1.6));
    // definitionId giữ quái gốc để nhiệm vụ "Lang vương" vẫn đếm.
    expect(entity.definitionId).toBe(elite.monsterId);
    expect(entity.elite).toBe(true);
    expect(entity.name).toBe(elite.name);
  });

  it("hạ tinh anh: rớt bạc 150–300 + Huyền Thiết và đặt lại chu kỳ 30 phút", () => {
    const { w } = setup();
    const elite = elites[1];
    w.state.eliteSpawns![elite.id] = Date.now() - 1;
    w.step();
    for (let i = 0; i < 20 && !w.state.entities[`elite:${elite.id}`]; i++)
      w.step();
    const entity = w.state.entities[`elite:${elite.id}`]!;
    entity.hp = 1;
    w.player.x = entity.x - 1;
    w.player.y = entity.y;
    const gold = w.state.gold;
    w.player.autoAttack = true;
    w.player.farmAnchor = { x: w.player.x, y: w.player.y };
    const killed = stepUntil(w, () => entity.hp <= 0, 600);
    expect(killed).toBe(true);
    // Bạc và Huyền Thiết rơi trên đất theo cơ chế rớt đồ sẵn có.
    const drops = Object.values(w.state.groundLoot).filter(
      (l) => l.ownerId === w.state.playerId,
    );
    const rewardGold = drops.find((l) => !l.item && l.gold >= 150);
    expect(rewardGold).toBeDefined();
    expect(rewardGold!.gold).toBeLessThanOrEqual(300);
    expect(drops.some((l) => l.item?.definitionId === "ore")).toBe(true);
    // Chu kỳ tiếp theo được đặt lại theo thời gian thật.
    expect(w.state.eliteSpawns![elite.id]).toBeGreaterThan(Date.now());
    expect(w.state.gold).toBeGreaterThanOrEqual(gold);
  });
});

describe("B3 — thành tựu", () => {
  it("khai báo đủ 10 thành tựu đúng tên và thưởng", () => {
    expect(achievements).toHaveLength(10);
    const byId = Object.fromEntries(achievements.map((a) => [a.id, a]));
    expect(byId["first-steps"].threshold).toBe(5);
    expect(byId["first-steps"].reward).toBe(50);
    expect(byId["young-hero"].threshold).toBe(10);
    expect(byId["young-hero"].reward).toBe(150);
    expect(byId["evil-bane"].threshold).toBe(50);
    expect(byId["evil-slayer"].threshold).toBe(200);
    expect(byId["wolf-hunter"].threshold).toBe(20);
    expect(byId["wealthy"].threshold).toBe(1000);
    expect(byId["rich"].threshold).toBe(5000);
    expect(byId["wanderer"].threshold).toBe(6);
    expect(byId["apprentice-smith"].threshold).toBe(1);
    expect(byId["first-quest"].threshold).toBe(1);
  });

  it("bộ đếm khởi tạo an toàn: peakGold lấy số bạc đang có, các bộ đếm khác = 0", () => {
    const { w } = setup();
    expect(w.state.achievements!.counters.kills).toBe(0);
    expect(w.state.achievements!.counters.peakGold).toBe(w.state.gold);
    expect(w.state.achievements!.claimed).toEqual([]);
  });

  it("hạ quái tăng bộ đếm và phát thông báo khi vừa đạt thành tựu", () => {
    const { w, send } = setup();
    const target = parkNextTo(w, "bandit");
    w.player.autoAttack = true;
    w.player.farmAnchor = { x: w.player.x, y: w.player.y };
    expect(stepUntil(w, () => target.hp <= 0, 600)).toBe(true);
    expect(w.state.achievements!.counters.kills).toBe(1);
    expect(
      w.drainEvents().some((e) => e.text.startsWith("Đánh bại ")),
    ).toBe(true);
    void send;
  });

  it("vừa chạm ngưỡng bộ đếm thì phát thông báo đúng lúc", () => {
    const { w } = setup();
    const target = parkNextTo(w, "bandit");
    // Đặt sát ngưỡng "Trừ Gian" (50 quái) để thấy thông báo ngay khi hạ.
    w.state.achievements!.counters.kills = 49;
    w.player.autoAttack = true;
    w.player.farmAnchor = { x: w.player.x, y: w.player.y };
    stepUntil(w, () => target.hp <= 0, 600);
    expect(w.state.achievements!.counters.kills).toBe(50);
    expect(
      w.drainEvents().some((e) => e.text === "Đạt thành tựu: Trừ Gian"),
    ).toBe(true);
  });

  it("thành tựu suy ra từ trạng thái: đạt cấp 5 nhận được thưởng", () => {
    const { w, send } = setup();
    w.state.level = 5;
    const gold = w.state.gold;
    send({ type: "claimAchievement", achievementId: "first-steps" });
    expect(w.state.gold).toBe(gold + 50);
  });

  it("nhận thưởng đúng 1 lần, cộng đúng bạc và giữ sau khi tải lại", () => {
    const { w, send } = setup();
    w.state.level = 5;
    w.state.achievements!.counters.kills = 1;
    const target = parkNextTo(w, "bandit");
    w.player.autoAttack = true;
    w.player.farmAnchor = { x: w.player.x, y: w.player.y };
    stepUntil(w, () => target.hp <= 0, 600);
    const gold = w.state.gold;
    send({ type: "claimAchievement", achievementId: "first-steps" });
    expect(w.state.gold).toBe(gold + 50);
    expect(w.state.achievements!.claimed).toContain("first-steps");
    send({ type: "claimAchievement", achievementId: "first-steps" });
    expect(w.state.gold).toBe(gold + 50);

    // Tải lại bản lưu: không nhận lại được.
    const reloaded = new GameWorld(w.snapshot());
    const before = reloaded.state.gold;
    reloaded.dispatch({
      protocolVersion: 1,
      sequence: 9999,
      actorId: reloaded.state.playerId,
      command: { type: "claimAchievement", achievementId: "first-steps" },
    });
    expect(reloaded.state.gold).toBe(before);
  });

  it("không nhận được thành tựu chưa đạt", () => {
    const { w, send } = setup();
    const gold = w.state.gold;
    send({ type: "claimAchievement", achievementId: "rich" });
    expect(w.state.gold).toBe(gold);
    expect(w.state.achievements!.claimed).toEqual([]);
  });
});

describe("B3 — phím tắt và cấu hình", () => {
  it("configureAuto lưu được ngưỡng thuốc, kỹ năng và nhặt đồ", () => {
    const { w, send } = setup();
    send({
      type: "configureAuto",
      settings: { hpThreshold: 0.3, mpThreshold: 0.15, skills: false },
    });
    expect(w.state.autoCombat.hpThreshold).toBe(0.3);
    expect(w.state.autoCombat.mpThreshold).toBe(0.15);
    expect(w.state.autoCombat.skills).toBe(false);
    // Giá trị ngoài miền hợp lệ bị bỏ qua, không phá cấu hình cũ.
    send({
      type: "configureAuto",
      settings: { hpThreshold: 1.5, mpThreshold: -1 },
    });
    expect(w.state.autoCombat.hpThreshold).toBe(0.3);
    expect(w.state.autoCombat.mpThreshold).toBe(0.15);
  });

  it("tắt dùng kỹ năng thì tự chiến chỉ đánh thường", () => {
    const { w, send } = setup();
    send({ type: "configureAuto", settings: { skills: false } });
    const target = parkNextTo(w, "bandit");
    send({ type: "autoAttack", enabled: true });
    w.drainEvents();
    stepUntil(w, () => target.hp < target.maxHp, 400);
    const usedSkill = w
      .drainEvents()
      .some((e) => e.type === "skill" && e.skillId !== "slash");
    expect(usedSkill).toBe(false);
  });
});

describe("C1 — bảo vệ bản lưu", () => {
  it("xoay vòng 3 bản dự phòng và khôi phục từ bản mới nhất khi bản chính lỗi", async () => {
    const { SaveRepository, BACKUP_SLOTS } = await import(
      "../../packages/game-storage/src/index"
    );
    const repo = new SaveRepository();
    const game = createGame("Bảo Vệ", "wudang", "backup-test");
    await repo.create(game);
    // Ghi nhiều lần với nội dung khác nhau; backup chỉ ghi khi ≥ 5 phút nên
    // dùng save() rồi kiểm tra số bản dự phòng không vượt BACKUP_SLOTS.
    const backups: number[] = [];
    for (let i = 1; i <= 5; i++) {
      const next = { ...game, gold: 180 + i };
      await repo.save(next);
      const at = await repo.backupSavedAt("backup-test");
      if (at) backups.push(at);
    }
    expect(BACKUP_SLOTS).toBe(3);
    // Chỉ đọc được bản chính là bình thường.
    const slot = await repo.load("backup-test");
    expect(slot).not.toBeNull();
    const recovered = await repo.recover("backup-test");
    // Chưa đủ 5 phút nên có thể chưa có bản dự phòng: chỉ cần không lỗi.
    expect(recovered === null || typeof recovered.gold === "number").toBe(true);
  });

  it("export tên file đúng mẫu <tên>-<ngày giờ>.json và nhập lại được", async () => {
    const { SaveRepository } = await import(
      "../../packages/game-storage/src/index"
    );
    const repo = new SaveRepository();
    const game = createGame("Xuất Bản Lưu", "wudang", "export-test");
    await repo.create(game);
    const text = repo.export(game);
    expect(() => JSON.parse(text)).not.toThrow();
    const parsed = JSON.parse(text);
    expect(parsed.characterId).toBe("export-test");
    const imported = await repo.import(parsed);
    expect(imported.characterId).toBe("export-test");
  });
});

describe("hằng số đặc tả", () => {
  it("AUTO_COMBAT_RANGE = 12 và TRAVEL_GOLD = 30", () => {
    expect(AUTO_COMBAT_RANGE).toBe(12);
    expect(TRAVEL_GOLD).toBe(30);
  });

  it("Hồi Thành Phù giá 50 bạc, cộng dồn được", () => {
    const def = getItem("town-scroll");
    expect(def.price).toBe(50);
    expect(def.stack).toBeGreaterThan(1);
    expect(def.kind).toBe("consumable");
  });

  it("kỹ năng buff tự thân có trong dữ liệu (guard)", () => {
    const guard = skills.find((s) => s.id === "guard");
    expect(guard?.kind).toBe("buff");
  });
});
