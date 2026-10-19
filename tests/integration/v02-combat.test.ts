import { describe, it, expect } from "vitest";
import {
  createGame,
  GameWorld,
  characterBonuses,
  spawnMonster,
} from "../../packages/game-core/src/index";
import {
  classDefinitions,
  skills,
  getClassSkills,
} from "../../packages/game-content/src/index";
import type {
  GameCommand,
  CombatEntity,
} from "../../packages/game-protocol/src/index";
function setup(classId = "tangmen") {
  const s = createGame("Thử Võ", classId, "skill-test");
  for (const e of Object.values(s.entities))
    if (e.kind === "monster") delete s.entities[e.id];
  const w = new GameWorld(s);
  w.player.x = 14;
  w.player.y = 14;
  return w;
}
let sequence = 0;
const send = (w: GameWorld, c: GameCommand, actorId = w.player.id) =>
  w.dispatch({ protocolVersion: 1, sequence: ++sequence, actorId, command: c });
function ticks(w: GameWorld, count: number) {
  for (let i = 0; i < count; i++) w.step();
}
function dummy(w: GameWorld, x = 17, y = 14): CombatEntity {
  const m = spawnMonster(w.state, "bandit", "village", x, y, "dummy");
  m.hp = m.maxHp = 100000;
  m.attack = 0;
  m.attackRange = 0.1;
  m.movementSpeed = 0.001;
  m.nextAttack = 99999;
  m.nextSkillTick = 99999;
  return m;
}
describe("Combat v2: projectile, cast, effect pipeline", () => {
  it("đạn có thời gian bay, không trừ HP lúc bấm và dừng tại vật cản", () => {
    const w = setup(),
      m = dummy(w, 18, 14);
    send(w, { type: "skill", skillId: "tm-dart", targetId: m.id });
    expect(m.hp).toBe(m.maxHp);
    expect(w.state.projectiles).toHaveLength(1);
    ticks(w, 10);
    expect(m.hp).toBeLessThan(m.maxHp);
    expect(m.statuses.some((s) => s.kind === "poison")).toBe(true);
    const blocked = setup(),
      b = dummy(blocked, 18, 14);
    send(blocked, { type: "skill", skillId: "tm-dart", targetId: b.id });
    const bolt = blocked.state.projectiles[0];
    bolt.dx = -1;
    bolt.dy = -1;
    bolt.x = 9;
    bolt.y = 10;
    bolt.remaining = 12;
    ticks(blocked, 20);
    expect(blocked.state.projectiles).toHaveLength(0);
    expect(b.hp).toBe(b.maxHp);
  });
  it("di chuyển ngang đường bay có thể né đạn", () => {
    const w = setup(),
      m = dummy(w, 19, 14);
    send(w, { type: "skill", skillId: "tm-dart", targetId: m.id });
    m.y = 17;
    ticks(w, 12);
    expect(m.hp).toBe(m.maxHp);
  });
  it("xuyên địch chỉ đánh mỗi entity một lần", () => {
    const w = setup("tianwang"),
      a = dummy(w, 15.5, 14),
      b = spawnMonster(w.state, "bandit", "village", 17, 14, "second");
    b.hp = b.maxHp = 10000;
    b.movementSpeed = 0.001;
    b.nextAttack = 99999;
    send(w, { type: "skill", skillId: "tw-pierce", targetId: b.id });
    ticks(w, 12);
    expect(a.hp).toBeLessThan(a.maxHp);
    expect(b.hp).toBeLessThan(b.maxHp);
    const ids = w
      .drainEvents()
      .filter((e) => e.type === "damage")
      .map((e) => e.entityId);
    expect(ids.filter((id) => id === "dummy")).toHaveLength(1);
  });
  it("cast time và di chuyển hủy cast, chi phí không được hoàn miễn phí", () => {
    const w = setup("kunlun"),
      m = dummy(w);
    const mp = w.player.mp;
    send(w, { type: "skill", skillId: "kl-spark", targetId: m.id });
    expect(w.player.casting?.resolveAt).toBe(6);
    expect(w.state.projectiles).toHaveLength(0);
    send(w, { type: "move", destination: { x: 12, y: 14 } });
    expect(w.player.casting).toBeNull();
    expect(w.player.mp).toBe(mp - 12);
    ticks(w, 15);
    expect(m.hp).toBe(m.maxHp);
    expect(w.drainEvents().some((e) => e.type === "interrupt")).toBe(true);
  });
  it("độc cộng dồn có giới hạn, tick và hết hạn qua snapshot", () => {
    const w = setup("wudu"),
      m = dummy(w, 15, 14);
    for (let n = 0; n < 4; n++) {
      w.player.cooldowns["wu-poison"] = 0;
      send(w, { type: "skill", skillId: "wu-poison", targetId: m.id });
      ticks(w, 3);
    }
    expect(m.statuses.find((s) => s.kind === "poison")!.stacks).toBe(3);
    const before = m.hp;
    ticks(w, 20);
    expect(m.hp).toBeLessThan(before);
    w.player.x = 5;
    w.player.y = 5;
    ticks(w, 150);
    expect(m.statuses).toHaveLength(0);
  });
  it("shield tiêu hao trước HP, haste/slow và silence dùng cùng pipeline", () => {
    const w = setup("shaolin"),
      m = dummy(w, 15, 14);
    m.attack = 30;
    send(w, { type: "skill", skillId: "sl-iron" });
    const shield = w.player.statuses.find((s) => s.kind === "shield")!,
      hp = w.player.hp,
      before = shield.magnitude;
    w.player.autoAttack = false;
    m.attackRange = 1.5;
    m.nextAttack = 0;
    ticks(w, 1);
    expect(shield.magnitude).toBeLessThan(before);
    expect(w.player.hp).toBe(hp);
    w.player.statuses.push({
      id: "silence",
      kind: "silence",
      sourceId: m.id,
      durationTicks: 30,
      magnitude: 1,
      expiresAt: w.state.tick + 30,
      nextTick: w.state.tick + 20,
      stacks: 1,
      attack: 0,
      element: "wood",
    });
    const mp = w.player.mp;
    send(w, { type: "skill", skillId: "sl-sweep", targetId: m.id });
    expect(w.player.mp).toBe(mp);
    expect(w.drainEvents().some((e) => e.text.includes("câm lặng"))).toBe(true);
  });
  it("boss báo đòn có thời gian né, vùng nổ bị hủy khi boss chết", () => {
    const w = setup("wudang"),
      boss = spawnMonster(w.state, "boss", "village", 16, 14, "test-boss");
    boss.nextSkillTick = 0;
    boss.nextAttack = 99999;
    w.player.x = 14;
    w.player.y = 14;
    ticks(w, 1);
    expect(w.state.telegraphs).toHaveLength(1);
    const zone = w.state.telegraphs[0];
    expect(zone.resolveAt).toBeGreaterThan(w.state.tick);
    const hp = w.player.hp;
    send(w, { type: "move", destination: { x: 10, y: 14 } });
    ticks(w, 40);
    expect(w.player.hp).toBe(hp);
    boss.hp = 1;
    w.player.x = 15;
    w.player.y = 14;
    boss.nextSkillTick = 0;
    ticks(w, 1);
    send(w, { type: "skill", skillId: "thunder", targetId: boss.id });
    ticks(w, 1);
    expect(w.state.telegraphs).toHaveLength(0);
  });
  it("boss đổi phase gọi thuộc hạ; không tích lũy xác triệu hồi", () => {
    const w = setup(),
      boss = spawnMonster(w.state, "boss", "village", 16, 14, "boss-phase");
    boss.hp = 300;
    boss.nextSkillTick = 99999;
    ticks(w, 1);
    const adds = Object.values(w.state.entities).filter((e) =>
      e.id.includes(":summon:"),
    );
    expect(adds).toHaveLength(2);
    for (const e of adds) {
      e.hp = 0;
      e.respawnAt = 0;
      e.stateUntil = w.state.tick + 2;
    }
    ticks(w, 5);
    expect(
      Object.keys(w.state.entities).filter((id) => id.includes(":summon:")),
    ).toHaveLength(0);
  });
  it("nội công có hiệu lực theo nhánh và học kỹ năng ngoại phái bị từ chối", () => {
    const w = setup("shaolin");
    w.state.level = 2;
    w.player.level = 2;
    w.state.skillPoints = 2;
    const defense = w.player.defense;
    send(w, { type: "learn", skillId: "sl-diamond" });
    expect(w.player.defense).toBeGreaterThan(defense);
    const points = w.state.skillPoints;
    send(w, { type: "learn", skillId: "tm-precision" });
    expect(w.state.skillPoints).toBe(points);
    send(w, { type: "branch", branchId: "fist" });
    expect(w.state.branchId).toBe("fist");
    expect(w.player.defense).toBeLessThan(defense + 4);
    expect(w.state.skillLevels["sl-diamond"]).toBe(1);
  });
  it("actor thứ hai nhận đúng EXP, loot và thay đồ của mình", () => {
    const w = setup("wudang"),
      other = createGame("Bạn Đồng Hành", "shaolin", "second-actor");
    other.entities[other.playerId].x = 15;
    other.entities[other.playerId].y = 14;
    const id = w.addPlayer(other),
      m = dummy(w, 16, 14);
    m.hp = 1;
    const mainGold = w.state.gold;
    send(w, { type: "skill", skillId: "sl-stun", targetId: m.id }, id);
    expect(w.state.actors[id].gold).toBe(other.gold);
    const loot = Object.values(w.state.groundLoot).find((l) => l.gold === 18)!;
    send(w, { type: "pickup", lootId: loot.id }, id);
    expect(w.state.actors[id].gold).toBe(other.gold + 18);
    expect(w.state.gold).toBe(mainGold);
    expect(w.state.actors[id].experience).toBe(28);
    const robe = w.state.actors[id].inventory.find(
      (i) => i.definitionId === "robe",
    )!;
    send(w, { type: "equip", instanceId: robe.id }, id);
    expect(w.state.actors[id].equipment.armor.id).toBe(robe.id);
    expect(w.state.equipment.armor).toBeUndefined();
    send(w, { type: "equip", instanceId: w.state.inventory[2].id }, id);
    expect(w.state.inventory).toHaveLength(3);
  });
  it("server host có thể vô hiệu hóa pause; offline pause dừng RNG và thời tiết", () => {
    const w = setup();
    send(w, { type: "pause", paused: true });
    const before = w.snapshot();
    ticks(w, 3000);
    expect(w.snapshot()).toEqual(before);
    const server = new GameWorld(createGame("Máy Chủ"), { allowPause: false });
    send(server, { type: "pause", paused: true });
    ticks(server, 20);
    expect(server.state.tick).toBe(20);
  });
});
describe("Catalog 10 phái, 20 nhánh và mọi skill dùng được", () => {
  it("đủ catalog, mỗi nhánh có cơ chế, học cấp 100 tính đúng chỉ số", () => {
    expect(classDefinitions).toHaveLength(10);
    expect(classDefinitions.reduce((n, c) => n + c.branches.length, 0)).toBe(
      20,
    );
    expect(skills.length).toBeGreaterThanOrEqual(140);
    expect(
      new Set(
        classDefinitions.map((c) =>
          c.branches.map((b) => b.startingSkills.join(",")).join("|"),
        ),
      ).size,
    ).toBe(10);
  });
  for (const skill of skills)
    it(`thi triển/nội công có tác dụng: ${skill.id}`, () => {
      const w = setup(skill.classId ?? "wudang");
      w.state.level = w.player.level = 100;
      w.state.branchId = skill.branchId ?? "sword";
      w.state.skillLevels[skill.id] = 1;
      w.player.mp = w.player.maxMp = 100000;
      w.player.hp = Math.floor(w.player.maxHp * 0.3);
      const m = dummy(w, 15, 14);
      if (skill.kind === "passive") {
        w.state.skillLevels[skill.id] = 0;
        w.state.skillPoints = 1;
        const before = characterBonuses(w.state);
        send(w, { type: "learn", skillId: skill.id });
        expect(w.state.skillLevels[skill.id]).toBe(1);
        expect(characterBonuses(w.state)).not.toEqual(before);
        return;
      }
      const hp = w.player.hp,
        enemyHp = m.hp;
      send(w, { type: "skill", skillId: skill.id, targetId: m.id });
      ticks(w, 40);
      if (skill.kind === "heal") expect(w.player.hp).toBeGreaterThan(hp);
      else if (skill.kind === "buff")
        expect(
          w.player.statuses.length +
            (w.player.cooldowns.guardUntil > 0 ? 1 : 0),
        ).toBeGreaterThan(0);
      else expect(m.hp).toBeLessThan(enemyHp);
      expect(w.player.mp).toBeLessThanOrEqual(100000);
    });
  it("định nghĩa nội công có ít nhất một chỉ số có tác dụng", () => {
    for (const c of classDefinitions)
      for (const b of c.branches) {
        const passive = getClassSkills(c.id, b.id).filter(
          (d) => d.kind === "passive",
        );
        expect(passive).toHaveLength(2);
        for (const d of passive)
          expect(Object.values(d.passive ?? {}).some((v) => v > 0)).toBe(true);
      }
  });
});
