import { compareStableText } from "../engine/order";
import { getMap, monsters, skills } from "../../../game-content/src/index";
import type {
  CombatEntity,
  GameSnapshot,
  GameEvent,
  Vec2,
} from "../../../game-protocol/src/index";
import type { SeededRandom } from "../engine/random";
import { distance, findPath, isWalkable } from "../world/navigation";
import { CombatRuntime } from "../combat/runtime";
import { setAnimation } from "../combat/stats";
export interface BrainContext {
  state: GameSnapshot;
  combat: CombatRuntime;
  random: SeededRandom;
  nearby?: (position: Vec2, radius: number) => CombatEntity[];
  emit: (
    type: GameEvent["type"],
    text: string,
    data?: Partial<GameEvent>,
  ) => void;
  spawn: (
    id: string,
    mapId: string,
    x: number,
    y: number,
    entityId?: string,
  ) => CombatEntity;
}
/**
 * Pha quyết định cố định theo id (Mục 3): mỗi quái lệch pha trong chu kỳ AI,
 * tần suất quyết định trung bình không đổi (vẫn đúng 1 lần/chu kỳ) và pha xác
 * định theo id nên test lặp lại được.
 */
export function decisionPhase(id: string, cycle: number) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(hash) % cycle;
}
export function onDecisionTick(id: string, tick: number, cycle: number) {
  return (tick + decisionPhase(id, cycle)) % cycle === 0;
}
export function updateMonster(e: CombatEntity, ctx: BrainContext) {
  const s = ctx.state,
    d = monsters.find((m) => m.id === e.definitionId)!;
  if (!d || !ctx.combat.canAct(e)) return;
  const map = getMap(e.mapId);
  const candidates = (
    ctx.nearby?.(e, d.detect + 3) ?? Object.values(s.entities)
  ).filter(
    (p) =>
      ctx.combat.hostile(e, p) &&
      distance(e, p) < d.detect + (e.threat[p.id] ? 3 : 0) &&
      distance(e.spawn, p) < 12,
  );
  const target = candidates.sort(
    (a, b) =>
      (e.threat[b.id] ?? 0) - (e.threat[a.id] ?? 0) ||
      distance(e, a) - distance(e, b) ||
      compareStableText(a.id, b.id),
  )[0];
  if (onDecisionTick(e.id, s.tick, 20))
    for (const id of Object.keys(e.threat)) {
      e.threat[id] *= 0.93;
      if (e.threat[id] < 0.1) delete e.threat[id];
    }
  if (e.brain === "return" || distance(e, e.spawn) > 9) {
    e.brain = "return";
    e.targetId = null;
    if (distance(e, e.spawn) < 0.35) {
      e.brain = "idle";
      e.threat = {};
      e.hp = e.maxHp;
      e.path = [];
    } else {
      if (onDecisionTick(e.id, s.tick, 10))
        e.path = findPath(map, e, e.spawn, 300);
      e.hp = Math.min(e.maxHp, e.hp + 1);
      e.mp = Math.min(e.maxMp, e.mp + 2);
    }
    return;
  }
  if (!target) {
    e.targetId = null;
    if (distance(e, e.spawn) > 3) {
      e.brain = "return";
      return;
    }
    if (onDecisionTick(e.id, s.tick, 80)) {
      e.brain = "patrol";
      e.path = findPath(
        map,
        e,
        {
          x: e.spawn.x + Math.round(ctx.random.next() * 4 - 2),
          y: e.spawn.y + Math.round(ctx.random.next() * 4 - 2),
        },
        180,
      );
    }
    return;
  }
  e.targetId = target.id;
  if (d.brain === "pack" && onDecisionTick(e.id, s.tick, 20))
    for (const ally of ctx.nearby?.(e, 4) ?? Object.values(s.entities))
      if (
        ally.definitionId === e.definitionId &&
        ally.hp > 0 &&
        ally.mapId === e.mapId &&
        distance(e, ally) < 4
      )
        ally.threat[target.id] = Math.max(1, ally.threat[target.id] ?? 0);
  if (d.brain === "boss") {
    if (e.hp < e.maxHp * 0.5 && e.phase === 0) {
      e.phase = 1;
      ctx.emit("message", `${e.name} đổi thế trận, gọi thuộc hạ!`, {
        entityId: e.id,
      });
      for (const offset of [
        { x: 2, y: 0 },
        { x: 0, y: 2 },
      ])
        if (
          isWalkable(map, { x: e.x + offset.x, y: e.y + offset.y }) &&
          Object.values(s.entities).filter(
            (n) => n.mapId === e.mapId && n.kind === "monster" && n.hp > 0,
          ).length < (map.maxMonsters ?? 32) &&
          Object.values(s.entities).filter((n) =>
            n.id.startsWith(`${e.id}:summon:`),
          ).length < 2
        ) {
          const add = ctx.spawn(
            "bandit",
            e.mapId,
            e.x + offset.x,
            e.y + offset.y,
            `${e.id}:summon:${s.nextWorldId++}`,
          );
          add.threat[target.id] = 10;
        }
    }
    if (s.tick >= e.nextSkillTick && distance(e, target) <= 7) {
      const radius = e.phase ? 3.1 : 2.4,
        resolveAt = s.tick + (e.phase ? 22 : 28);
      const zone = {
        id: `zone:${s.nextWorldId++}`,
        mapId: e.mapId,
        sourceId: e.id,
        skillId: "boss",
        position: { x: target.x, y: target.y },
        radius,
        resolveAt,
        power: e.phase ? 2 : 1.6,
        element: e.element,
        effects: [
          { kind: "slow" as const, magnitude: 0.35, durationTicks: 45 },
        ],
        shape: "circle" as const,
        direction: { x: target.x - e.x, y: target.y - e.y },
      };
      s.telegraphs.push(zone);
      e.nextSkillTick = s.tick + (e.phase ? 140 : 180);
      e.path = [];
      e.brain = "telegraph";
      setAnimation(e, "cast", s.tick, resolveAt - s.tick);
      ctx.emit("telegraph", "Hắc Phong Chấn: rời khỏi vùng đỏ!", {
        entityId: e.id,
        skillId: "boss",
        position: zone.position,
        radius,
        resolveAt,
        element: e.element,
      });
      return;
    }
    if (e.state === "cast" && e.stateUntil > s.tick) return;
  }
  // Quái có skillIds thật sự thi triển kỹ năng: chọn ngẫu nhiên bằng RNG
  // authority nên replay/save-load vẫn xác định, và chỉ dùng khi đủ nội lực.
  if (d.skillIds.length && s.tick >= e.nextSkillTick) {
    const usable = d.skillIds
      .map((id) => skills.find((k) => k.id === id))
      .filter(
        (k) => !!k && k.kind !== "passive" && k.manaCost <= e.mp && !!k.range,
      );
    if (usable.length) {
      const pick = usable[Math.floor(ctx.random.next() * usable.length)]!;
      if (
        distance(e, target) <= pick.range &&
        ctx.combat.useSkill(e, pick.id, target.id, true)
      ) {
        e.nextSkillTick = s.tick + pick.cooldownTicks;
        return;
      }
    }
  }
  const range = e.attackRange;
  if (
    (d.brain === "ranged" || d.brain === "poison") &&
    distance(e, target) < 2.5 &&
    onDecisionTick(e.id, s.tick, 12)
  ) {
    const dx = e.x - target.x,
      dy = e.y - target.y,
      len = Math.max(0.1, Math.hypot(dx, dy));
    const destination = {
      x: Math.round(e.x + (dx / len) * 2),
      y: Math.round(e.y + (dy / len) * 2),
    };
    if (isWalkable(map, destination)) {
      e.path = findPath(map, e, destination, 120);
      e.brain = "retreat";
      return;
    }
  }
  if (
    d.brain === "assassin" &&
    s.tick >= e.nextSkillTick &&
    distance(e, target) < 5 &&
    distance(e, target) > 2
  ) {
    e.nextSkillTick = s.tick + 140;
    const point = { x: target.x - 1, y: target.y };
    if (isWalkable(map, point) && findPath(map, e, point, 200).length < 5) {
      e.path = findPath(map, e, point, 200);
      e.movementSpeed = 4;
      e.brain = "chase";
    }
  }
  if (distance(e, target) <= range) {
    e.brain = "attack";
    if (e.state !== "cast" || e.stateUntil <= s.tick)
      ctx.combat.basic(e, target);
  } else {
    e.brain = "chase";
    if (onDecisionTick(e.id, s.tick, 12))
      e.path = findPath(map, e, target, 240);
  }
}
