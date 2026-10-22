import { compareStableText } from "../engine/order";
import {
  getMap,
  skills,
  getSect,
  type SkillDefinition,
} from "../../../game-content/src/index";
import type {
  GameSnapshot,
  CombatEntity,
  GameEvent,
  CharacterProgress,
  StatusApplication,
  Vec2,
  Element,
} from "../../../game-protocol/src/index";
import type { SeededRandom } from "../engine/random";
import { distance, hasLineOfSight, isWalkable } from "../world/navigation";
import { calculateDamage, elementalSupport } from "./formulas";
import {
  characterBonuses,
  directionFromDelta,
  isDisabled,
  setAnimation,
  statusValue,
} from "./stats";
/** Mốc trúng đòn trong một chu kỳ đòn thường (Mục 1). */
export const DAMAGE_POINT_RATIO = 0.35;
/** Độ nới tầm đánh khi vừa di chuyển vừa ra đòn (Mục 5). */
export const ATTACK_RANGE_SLACK = 0.4;
/** Hệ số tốc độ di chuyển trong lúc đang ra đòn thường (Mục 5). */
export const MOVE_WHILE_ATTACK_SPEED = 0.55;
export interface CombatContext {
  state: GameSnapshot;
  random: SeededRandom;
  progress: (e: CombatEntity) => CharacterProgress | null;
  emit: (
    type: GameEvent["type"],
    text: string,
    data?: Partial<GameEvent>,
  ) => void;
  die: (target: CombatEntity, killer: CombatEntity) => void;
}
export class CombatRuntime {
  constructor(private context: CombatContext) {}
  private get s() {
    return this.context.state;
  }
  hostile(a: CombatEntity, b: CombatEntity | undefined): b is CombatEntity {
    return (
      !!b &&
      a.id !== b.id &&
      a.kind !== b.kind &&
      a.mapId === b.mapId &&
      b.hp > 0
    );
  }
  nearest(p: CombatEntity, range = 9) {
    return Object.values(this.s.entities)
      .filter((e) => this.hostile(p, e) && distance(p, e) <= range)
      .sort(
        (a, b) =>
          distance(p, a) - distance(p, b) || compareStableText(a.id, b.id),
      )[0];
  }
  interrupt(p: CombatEntity) {
    if (!p.casting) return;
    p.casting = null;
    setAnimation(p, "hit", this.s.tick, 5);
    this.context.emit("interrupt", `${p.name} bị gián đoạn thi triển.`, {
      entityId: p.id,
    });
  }
  canAct(p: CombatEntity) {
    return p.hp > 0 && !isDisabled(p) && !p.casting;
  }
  useSkill(p: CombatEntity, id: string, targetId?: string, quiet = false) {
    const d = skills.find((d) => d.id === id),
      progress = this.context.progress(p);
    const fail = (text: string) => {
      if (!quiet) this.context.emit("error", text, { entityId: p.id });
      return false;
    };
    if (quiet && d?.kind === "heal" && p.hp > p.maxHp * 0.7) return false;
    if (!d || d.kind === "passive")
      return fail("Nội công bị động không thể thi triển.");
    const level = progress?.skillLevels[id] ?? (p.kind === "monster" ? 1 : 0);
    if (!level) return fail("Bạn chưa học kỹ năng này.");
    if (progress && d.classId && d.classId !== progress.classId)
      return fail("Kỹ năng không thuộc môn phái của bạn.");
    if (progress && d.branchId && d.branchId !== progress.branchId)
      return fail("Hãy chọn nhánh võ học tương ứng.");
    if (p.hp <= 0 || isDisabled(p))
      return fail("Đang bị khống chế, không thể hành động.");
    if (p.casting) return fail("Đang vận công. Di chuyển để hủy thi triển.");
    if (d.manaCost > 0 && p.statuses.some((s) => s.kind === "silence"))
      return fail("Đang bị câm lặng.");
    if ((p.cooldowns[id] ?? 0) > this.s.tick)
      return fail("Kỹ năng đang hồi chiêu.");
    if (p.mp < d.manaCost) return fail("Không đủ nội lực.");
    let target = targetId
      ? this.s.entities[targetId]
      : p.targetId
        ? this.s.entities[p.targetId]
        : undefined;
    if (["melee", "line", "projectile", "dash", "cone"].includes(d.kind)) {
      if (!this.hostile(p, target)) target = this.nearest(p, d.range);
      if (!this.hostile(p, target))
        return fail("Không có mục tiêu hợp lệ trong phạm vi.");
      if (distance(p, target) > d.range)
        return fail("Mục tiêu ngoài tầm thi triển.");
      if (!hasLineOfSight(getMap(p.mapId), p, target))
        return fail("Có vật cản trên đường tấn công.");
      p.targetId = target.id;
      this.face(p, target);
    }
    if (d.kind === "aoe" && !this.nearest(p, d.range))
      return fail("Không có kẻ địch trong phạm vi kiếm khí.");
    p.mp -= d.manaCost;
    p.cooldowns[id] = this.s.tick + d.cooldownTicks;
    p.path = [];
    setAnimation(
      p,
      d.kind === "melee" ? "attack" : "cast",
      this.s.tick,
      Math.max(7, d.castTicks),
    );
    this.context.emit("skill", d.name, {
      entityId: p.id,
      targetId: target?.id,
      skillId: id,
      element: d.element ?? p.element,
    });
    if (d.castTicks > 0) {
      p.casting = {
        skillId: id,
        targetId: target?.id ?? null,
        point: target ? { x: target.x, y: target.y } : { x: p.x, y: p.y },
        resolveAt: this.s.tick + d.castTicks,
        level,
      };
    } else this.execute(p, d, level, target);
    return true;
  }
  private face(a: CombatEntity, b: Vec2) {
    a.facing = b.x - a.x;
    a.direction = directionFromDelta({ x: b.x - a.x, y: b.y - a.y });
  }
  private execute(
    p: CombatEntity,
    d: SkillDefinition,
    level: number,
    target?: CombatEntity,
  ) {
    if (p.hp <= 0) return;
    const power = d.power * (1 + (level - 1) * 0.16),
      effects = d.effects.map((e) =>
        ["stun", "freeze", "silence", "invulnerable"].includes(e.kind)
          ? {
              ...e,
              durationTicks: Math.round(
                e.durationTicks * (1 + (level - 1) * 0.08),
              ),
            }
          : { ...e, magnitude: e.magnitude * (1 + (level - 1) * 0.12) },
      );
    if (d.kind === "heal") {
      const ally =
        target &&
        target.kind === p.kind &&
        target.mapId === p.mapId &&
        target.hp > 0 &&
        distance(p, target) <= d.range
          ? target
          : p;
      const support =
        elementalSupport[d.element ?? p.element] === ally.element ? 1.15 : 1;
      this.heal(
        ally,
        Math.round(ally.maxHp * (d.power + (level - 1) * 0.05) * support),
      );
      this.applyEffects(p, ally, effects);
      return;
    }
    if (d.kind === "buff") {
      if (d.id === "guard") p.cooldowns.guardUntil = this.s.tick + 120;
      this.applyEffects(p, p, effects);
      return;
    }
    if (
      ["projectile", "line", "melee", "dash", "cone"].includes(d.kind) &&
      !this.hostile(p, target)
    )
      return;
    if (target && d.kind === "projectile") {
      this.launch(
        p,
        target,
        d.id,
        power,
        effects,
        d.projectileSpeed,
        d.pierce,
        d.lifeSteal,
        d.range,
        d.element,
      );
      return;
    }
    if (target && d.kind === "dash") {
      const len = distance(p, target),
        end = {
          x: target.x - ((target.x - p.x) / len) * 1.1,
          y: target.y - ((target.y - p.y) / len) * 1.1,
        };
      if (
        isWalkable(getMap(p.mapId), end) &&
        hasLineOfSight(getMap(p.mapId), p, end)
      ) {
        p.x = end.x;
        p.y = end.y;
      }
      if (distance(p, target) > 2) return;
    }
    const targets =
      d.kind === "aoe"
        ? Object.values(this.s.entities).filter(
            (t) => this.hostile(p, t) && distance(p, t) <= d.range,
          )
        : d.kind === "cone" && target
          ? Object.values(this.s.entities).filter((t) => {
              if (!this.hostile(p, t) || distance(p, t) > d.range) return false;
              const ax = target.x - p.x,
                ay = target.y - p.y,
                bx = t.x - p.x,
                by = t.y - p.y;
              return (
                (ax * bx + ay * by) /
                  (Math.hypot(ax, ay) * Math.max(0.01, Math.hypot(bx, by))) >=
                0.45
              );
            })
          : target
            ? [target]
            : [];
    for (const t of targets) {
      if (["line", "melee"].includes(d.kind) && distance(p, t) > d.range)
        continue;
      const amount = this.hit(p, t, power, {
        element: d.element,
        lifeSteal: d.lifeSteal,
        source: "skill",
      });
      if (amount > 0) this.applyEffects(p, t, effects);
    }
  }
  launch(
    p: CombatEntity,
    target: Vec2,
    skillId: string,
    power: number,
    effects: StatusApplication[] = [],
    speed = 8,
    pierce = 0,
    lifeSteal = 0,
    range = 8,
    element = p.element,
  ) {
    if (this.s.projectiles.length >= 128) return;
    const len = Math.max(0.01, distance(p, target));
    this.face(p, target);
    this.s.projectiles.push({
      id: `projectile:${this.s.nextWorldId++}`,
      mapId: p.mapId,
      sourceId: p.id,
      skillId,
      x: p.x,
      y: p.y,
      dx: (target.x - p.x) / len,
      dy: (target.y - p.y) / len,
      speed,
      remaining: range,
      radius: 0.28,
      power,
      element,
      effects: structuredClone(effects),
      pierce,
      hitIds: [],
      lifeSteal,
    });
    this.context.emit("projectile", "Phi đạn xuất chiêu", {
      entityId: p.id,
      skillId,
      position: { x: p.x, y: p.y },
      element,
    });
  }
  hit(
    a: CombatEntity,
    t: CombatEntity,
    power: number,
    options: {
      element?: Element;
      lifeSteal?: number;
      dot?: boolean;
      ignoreSight?: boolean;
      attackOverride?: number;
      /** Nguồn gây sát thương để tầng hiển thị phân loại số bay (A3). */
      source?: "basic" | "skill";
    } = {},
  ) {
    if (
      !this.hostile(a, t) ||
      a.hp <= 0 ||
      (!options.ignoreSight && !hasLineOfSight(getMap(a.mapId), a, t))
    )
      return 0;
    if (statusValue(t, "invulnerable") > 0) return 0;
    const atk = this.context.progress(a),
      def = this.context.progress(t),
      ab = atk ? characterBonuses(atk) : null,
      db = def ? characterBonuses(def) : null;
    const attack = a.attack * (1 + Math.min(1.5, statusValue(a, "attackBuff"))),
      defense =
        t.defense *
        (1 + statusValue(t, "defenseBuff")) *
        (1 - Math.min(0.8, statusValue(t, "armorBreak")));
    const result = calculateDamage(
      attack,
      defense,
      power,
      options.element ?? a.element,
      t.element,
      options.dot ? 1 : this.context.random.next(),
      options.dot ? 1 : this.context.random.next(),
      {
        accuracy: ab?.accuracy ?? 0,
        evasion: db?.evasion ?? 0,
        critChance: ab?.critChance ?? 0,
        resistance: db?.resistance ?? 0,
      },
    );
    if ((t.cooldowns.guardUntil ?? 0) > this.s.tick)
      result.value = Math.round(result.value * 0.5);
    for (const shield of t.statuses.filter((s) => s.kind === "shield")) {
      const absorbed = Math.min(result.value, shield.magnitude);
      shield.magnitude -= absorbed;
      result.value -= absorbed;
    }
    t.statuses = t.statuses.filter(
      (s) => s.kind !== "shield" || s.magnitude > 0,
    );
    const amount = Math.min(t.hp, result.value);
    t.hp = Math.max(0, t.hp - amount);
    if (amount > 0) {
      t.threat[a.id] = (t.threat[a.id] ?? 0) + amount;
      if (!t.casting && t.brain !== "telegraph")
        setAnimation(t, "hit", this.s.tick, 5);
    }
    this.context.emit("damage", result.dodge ? "Né tránh" : String(amount), {
      entityId: t.id,
      targetId: a.id,
      value: amount,
      critical: result.critical && !options.dot,
      element: options.element ?? a.element,
      // Phân loại nguồn tại nơi sinh ra số sát thương (A3), không đoán ở UI.
      damageSource: result.dodge
        ? "dodge"
        : options.dot
          ? "dot"
          : (options.source ?? "skill"),
    });
    const steal = Math.min(
      0.6,
      (options.lifeSteal ?? 0) +
        (ab?.lifeSteal ?? 0) +
        statusValue(a, "vampirism"),
    );
    if (amount > 0 && steal > 0) this.heal(a, Math.round(amount * steal));
    if (t.hp <= 0) this.context.die(t, a);
    return amount;
  }
  heal(p: CombatEntity, amount: number) {
    if (p.hp <= 0) return;
    const applied = Math.min(p.maxHp - p.hp, Math.max(0, amount));
    p.hp += applied;
    if (applied > 0)
      this.context.emit("heal", `+${applied} sinh lực`, {
        entityId: p.id,
        value: applied,
      });
  }
  applyEffects(
    source: CombatEntity,
    target: CombatEntity,
    applications: StatusApplication[],
  ) {
    if (target.hp <= 0) return;
    for (const effect of applications) {
      if (statusValue(target, "invulnerable") && source.kind !== target.kind)
        continue;
      const existing = target.statuses.find(
        (s) => s.kind === effect.kind && s.sourceId === source.id,
      );
      const magnitude =
        effect.kind === "shield"
          ? Math.round(source.attack * effect.magnitude)
          : effect.magnitude;
      if (existing) {
        existing.expiresAt = this.s.tick + effect.durationTicks;
        existing.stacks = Math.min(effect.maxStacks ?? 1, existing.stacks + 1);
        existing.magnitude =
          effect.kind === "shield"
            ? Math.max(existing.magnitude, magnitude)
            : magnitude;
      } else
        target.statuses.push({
          ...effect,
          magnitude,
          id: `status:${this.s.nextWorldId++}`,
          sourceId: source.id,
          expiresAt: this.s.tick + effect.durationTicks,
          nextTick: this.s.tick + (effect.intervalTicks ?? 20),
          stacks: 1,
          attack: source.attack,
          element: source.element,
        });
      if (["stun", "freeze", "silence"].includes(effect.kind))
        this.interrupt(target);
      if (["stun", "freeze"].includes(effect.kind)) target.path = [];
      this.context.emit("status", `${target.name}: ${effect.kind}`, {
        entityId: target.id,
        targetId: source.id,
        statusKind: effect.kind,
      });
    }
  }
  update() {
    const s = this.s;
    for (const e of Object.values(s.entities)) {
      if (e.hp <= 0) {
        e.statuses = [];
        e.casting = null;
        e.strike = null;
        continue;
      }
      // Mục 1: tới mốc 35% mới áp sát thương/ hiệu ứng của đòn thường.
      const pending = e.strike;
      if (pending && pending.resolveAt <= s.tick) {
        e.strike = null;
        const target = s.entities[pending.targetId];
        if (target && target.hp > 0 && target.mapId === e.mapId) {
          // Mục 5.3: đang di chuyển thì nới tầm thêm ATTACK_RANGE_SLACK,
          // ngoài tầm là đòn trượt (không sát thương, chu kỳ vẫn kết thúc).
          const moving = e.path.length > 0 || e.movementInput !== null;
          const limit = e.attackRange + (moving ? ATTACK_RANGE_SLACK : 0);
          if (distance(e, target) <= limit)
            this.hit(e, target, 1, { source: "basic" });
        }
      }
      for (const effect of e.statuses) {
        if (effect.expiresAt < s.tick) continue;
        if (effect.nextTick <= s.tick) {
          effect.nextTick += effect.intervalTicks ?? 20;
          const source = s.entities[effect.sourceId];
          if (effect.kind === "regen")
            this.heal(
              e,
              Math.round((e.maxHp * effect.magnitude * effect.stacks) / 5),
            );
          else if (
            (effect.kind === "poison" || effect.kind === "burn") &&
            source &&
            source.hp > 0 &&
            source.mapId === e.mapId
          )
            this.hit(source, e, effect.magnitude * effect.stacks, {
              dot: true,
              element: effect.element,
              ignoreSight: true,
            });
        }
      }
      e.statuses = e.statuses.filter((status) => status.expiresAt > s.tick);
      if (e.casting && e.casting.resolveAt <= s.tick) {
        const cast = e.casting;
        e.casting = null;
        const d = skills.find((d) => d.id === cast.skillId);
        if (d)
          this.execute(
            e,
            d,
            cast.level,
            cast.targetId ? s.entities[cast.targetId] : undefined,
          );
      }
    }
    const removed = new Set<string>();
    for (const p of s.projectiles) {
      const source = s.entities[p.sourceId];
      if (!source || source.hp <= 0 || source.mapId !== p.mapId) {
        removed.add(p.id);
        continue;
      }
      const from = { x: p.x, y: p.y },
        step = Math.min(p.remaining, p.speed / 20);
      p.x += p.dx * step;
      p.y += p.dy * step;
      p.remaining -= step;
      if (
        !hasLineOfSight(getMap(p.mapId), from, p) ||
        !isWalkable(getMap(p.mapId), p)
      ) {
        removed.add(p.id);
        continue;
      }
      const targets = Object.values(s.entities)
        .filter(
          (t) =>
            this.hostile(source, t) &&
            !p.hitIds.includes(t.id) &&
            segmentDistance(t, from, p) <= p.radius + 0.32,
        )
        .sort((a, b) => distance(from, a) - distance(from, b));
      for (const target of targets) {
        const amount = this.hit(source, target, p.power, {
          element: p.element,
          lifeSteal: p.lifeSteal,
          ignoreSight: true,
        });
        if (amount > 0) this.applyEffects(source, target, p.effects);
        p.hitIds.push(target.id);
        this.context.emit("impact", "Phi đạn trúng mục tiêu", {
          entityId: target.id,
          targetId: source.id,
          skillId: p.skillId,
          element: p.element,
        });
        if (p.pierce-- <= 0) {
          removed.add(p.id);
          break;
        }
      }
      if (p.remaining <= 0) removed.add(p.id);
    }
    s.projectiles = s.projectiles.filter((p) => !removed.has(p.id));
    for (const zone of s.telegraphs) {
      if (zone.resolveAt > s.tick) continue;
      const source = s.entities[zone.sourceId];
      if (!source || source.hp <= 0 || source.mapId !== zone.mapId) continue;
      for (const t of Object.values(s.entities))
        if (
          this.hostile(source, t) &&
          distance(t, zone.position) <= zone.radius
        ) {
          const amount = this.hit(source, t, zone.power, {
            element: zone.element,
            ignoreSight: true,
          });
          if (amount > 0) this.applyEffects(source, t, zone.effects);
        }
      this.context.emit("impact", "Vùng nguy hiểm phát nổ", {
        entityId: source.id,
        position: zone.position,
        radius: zone.radius,
        element: zone.element,
      });
    }
    s.telegraphs = s.telegraphs.filter(
      (z) => z.resolveAt > s.tick && s.entities[z.sourceId]?.hp > 0,
    );
  }
  basic(p: CombatEntity, t: CombatEntity) {
    if (!this.canAct(p) || this.s.tick < p.nextAttack) return;
    const progress = this.context.progress(p),
      haste = Math.min(0.6, statusValue(p, "haste"));
    const cycleTicks = Math.max(6, Math.round(p.attackInterval * (1 - haste)));
    p.nextAttack = this.s.tick + cycleTicks;
    // Mục 5: không khóa di chuyển nữa — trong chu kỳ đòn vẫn đi được với hệ số
    // MOVE_WHILE_ATTACK_SPEED (áp ở tầng di chuyển của world).
    this.face(p, t);
    setAnimation(p, "attack", this.s.tick, 6);
    this.context.emit("skill", "Đánh thường", {
      entityId: p.id,
      targetId: t.id,
      skillId: "slash",
      element: p.element,
    });
    if (p.attackRange > 3)
      this.launch(
        p,
        t,
        "slash",
        1,
        p.definitionId === "viper"
          ? [
              {
                kind: "poison",
                magnitude: 0.18,
                durationTicks: 80,
                intervalTicks: 20,
              },
            ]
          : [],
        7,
        0,
        0,
        p.attackRange + 1,
      );
    else
      // Mục 1: đòn cận chiến không trừ HP ngay — lên lịch tại 35% chu kỳ đòn.
      p.strike = {
        targetId: t.id,
        startedAt: this.s.tick,
        resolveAt:
          this.s.tick +
          Math.max(1, Math.round(cycleTicks * DAMAGE_POINT_RATIO)),
        cycleTicks,
      };
    if (progress && getSect(progress.classId).element !== p.element)
      p.element = getSect(progress.classId).element;
  }
}
export function segmentDistance(p: Vec2, a: Vec2, b: Vec2) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    length = dx * dx + dy * dy;
  if (length === 0) return distance(p, a);
  const f = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length),
  );
  return distance(p, { x: a.x + dx * f, y: a.y + dy * f });
}
