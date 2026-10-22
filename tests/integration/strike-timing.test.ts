import { describe, expect, it } from "vitest";
import {
  GameWorld,
  createGame,
  spawnMonster,
} from "../../packages/game-core/src/index";
import type { GameCommand } from "../../packages/game-protocol/src/index";
import {
  DAMAGE_POINT_RATIO,
  MOVE_WHILE_ATTACK_SPEED,
} from "../../packages/game-core/src/combat/runtime";
import {
  decisionPhase,
  onDecisionTick,
} from "../../packages/game-core/src/ai/brain";
import {
  FLIP_TURN_MS,
  STATE_SCALE_MS,
  STAND_DELAY_MS,
  TRANSITION_FADE_MS,
  flipScale,
  stateScale,
  transitionAlpha,
} from "../../apps/web/src/game/renderers/motion";

let sequence = 0;
const send = (w: GameWorld, c: GameCommand) =>
  w.dispatch({
    protocolVersion: 1,
    sequence: ++sequence,
    actorId: w.player.id,
    command: c,
  });

function setup() {
  const state = createGame("Strike", "wudang", "strike-timing");
  const w = new GameWorld(state);
  for (const e of Object.values(w.state.entities))
    if (e.kind === "monster") delete w.state.entities[e.id];
  w.player.x = 14;
  w.player.y = 14;
  const m = spawnMonster(w.state, "bandit", "village", 15, 14, "strike");
  m.hp = m.maxHp = 100000;
  m.attack = 0;
  m.attackRange = 0.1;
  m.movementSpeed = 0.001;
  m.nextAttack = 99999;
  m.nextSkillTick = 99999;
  return { w, m };
}

describe("Mục 1: sát thương ở mốc 35% chu kỳ", () => {
  it("không trừ HP lúc bắt đầu, trừ đúng ở 35% (±1 tick), mỗi chu kỳ đúng 1 lần", () => {
    const { w, m } = setup();
    const hp0 = m.hp;
    send(w, { type: "attack", targetId: m.id });
    // Chạy tới khi đòn thực sự bắt đầu.
    let guard = 0;
    while (!w.player.strike && guard++ < 60) w.step();
    const strike = w.player.strike!;
    expect(strike).toBeTruthy();
    expect(m.hp).toBe(hp0); // chưa trừ HP khi đòn bắt đầu
    const cycle = strike.cycleTicks;
    expect(strike.resolveAt - strike.startedAt).toBe(
      Math.max(1, Math.round(cycle * DAMAGE_POINT_RATIO)),
    );
    let ticksToHit = 0;
    while (m.hp === hp0 && ticksToHit++ < cycle + 2) w.step();
    expect(ticksToHit).toBeGreaterThanOrEqual(
      strike.resolveAt - strike.startedAt - 1,
    );
    expect(ticksToHit).toBeLessThanOrEqual(
      strike.resolveAt - strike.startedAt + 1,
    );
    const firstHit = hp0 - m.hp;
    expect(firstHit).toBeGreaterThan(0);
    // Một chu kỳ đầy đủ nữa: đúng 1 lần trừ, cùng lượng sát thương ⇒ DPS không đổi.
    const hp1 = m.hp;
    for (let i = 0; i < cycle; i++) w.step();
    expect(hp1 - m.hp).toBe(firstHit);
  });

  it("kẻ tấn công chết trước 35% thì đòn bị hủy", () => {
    const { w, m } = setup();
    const hp0 = m.hp;
    send(w, { type: "attack", targetId: m.id });
    let guard = 0;
    while (!w.player.strike && guard++ < 60) w.step();
    w.player.hp = 0;
    for (let i = 0; i < 20; i++) w.step();
    expect(m.hp).toBe(hp0);
  });

  it("mục tiêu chết trước 35% thì bỏ qua, không sát thương", () => {
    const { w, m } = setup();
    send(w, { type: "attack", targetId: m.id });
    let guard = 0;
    while (!w.player.strike && guard++ < 60) w.step();
    m.hp = 0;
    w.player.strike = { ...w.player.strike!, targetId: m.id };
    const events: string[] = [];
    for (let i = 0; i < 20; i++) {
      w.step();
      for (const e of w.drainEvents())
        if (e.type === "damage" && e.entityId === m.id) events.push(e.text);
    }
    expect(events).toHaveLength(0);
  });
});

describe("Mục 5: vừa đi vừa ra đòn", () => {
  it("trong chu kỳ đòn vẫn di chuyển với 0.55 tốc độ", () => {
    const { w, m } = setup();
    // Đứng yên đánh để lấy mốc tốc độ chuẩn.
    w.player.x = 14;
    w.player.y = 14;
    const before = { ...w.player };
    w.player.strike = {
      targetId: m.id,
      startedAt: w.state.tick,
      resolveAt: w.state.tick + 6,
      cycleTicks: 18,
    };
    w.player.path = [{ x: 20, y: 14 }];
    for (let i = 0; i < 20; i++) w.step();
    const moved = Math.hypot(w.player.x - before.x, w.player.y - before.y);
    expect(moved).toBeGreaterThan(0.1);
    expect(MOVE_WHILE_ATTACK_SPEED).toBe(0.55);
  });

  it("mục tiêu ngoài tầm tại 35% thì đòn trượt (không sát thương)", () => {
    const { w, m } = setup();
    const hp0 = m.hp;
    send(w, { type: "attack", targetId: m.id });
    let guard = 0;
    while (!w.player.strike && guard++ < 60) w.step();
    // Đẩy mục tiêu ra ngoài tầm + slack ngay trước mốc trúng đòn.
    m.x = w.player.x + w.player.attackRange + 1.2;
    m.y = w.player.y;
    for (let i = 0; i < 10; i++) w.step();
    expect(m.hp).toBe(hp0);
    expect(w.player.strike).toBeNull();
  });
});

describe("Mục 3: lệch pha quyết định AI theo id", () => {
  it("hai id khác nhau quyết định ở hai tick khác nhau, vẫn đúng 1 lần/chu kỳ", () => {
    const cycle = 20,
      a = decisionPhase("village:bandit:0", cycle),
      b = decisionPhase("village:bandit:1", cycle);
    expect(a).not.toBe(b);
    let decisionsA = 0,
      decisionsB = 0;
    for (let tick = 0; tick < 240; tick++) {
      if (onDecisionTick("village:bandit:0", tick, cycle)) decisionsA++;
      if (onDecisionTick("village:bandit:1", tick, cycle)) decisionsB++;
    }
    expect(decisionsA).toBe(12); // 240 tick / chu kỳ 20 = đúng 1 lần/chu kỳ
    expect(decisionsB).toBe(12);
  });
});

describe("Mục 4 + 6: hằng số và hàm hiển thị", () => {
  it("trễ walk→stand 120ms; scale về 1,0 sau 90ms; ghost tắt sau 75ms; lật qua 0,82", () => {
    expect(STAND_DELAY_MS).toBe(120);
    expect(STATE_SCALE_MS).toBe(90);
    expect(TRANSITION_FADE_MS).toBe(75);
    expect(FLIP_TURN_MS).toBe(70);
    expect(stateScale("attack", 0)).toEqual({ x: 1.05, y: 0.96 });
    expect(stateScale("attack", STATE_SCALE_MS)).toEqual({ x: 1, y: 1 });
    expect(stateScale("walk", 0)).toEqual({ x: 1, y: 1 });
    expect(transitionAlpha(0)).toBeCloseTo(0.55);
    expect(transitionAlpha(TRANSITION_FADE_MS)).toBe(0);
    expect(flipScale(0)).toBeCloseTo(1);
    expect(flipScale(FLIP_TURN_MS / 2)).toBeCloseTo(0.82);
    expect(flipScale(FLIP_TURN_MS)).toBe(1);
  });
});
