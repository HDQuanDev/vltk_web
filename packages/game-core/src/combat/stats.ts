import {
  getItem,
  skills,
  enhancementRules,
} from "../../../game-content/src/index";
import type {
  CharacterProgress,
  ItemInstance,
  CombatEntity,
  Direction8,
  Vec2,
} from "../../../game-protocol/src/index";
export function itemBonuses(instance: ItemInstance) {
  const d = getItem(instance.definitionId),
    factor = 1 + (instance.enhancement ?? 0) * enhancementRules.statPerLevel,
    affix = (stat: "attack" | "defense" | "maxHp" | "maxMp") =>
      (instance.affixes ?? [])
        .filter((a) => a.stat === stat)
        .reduce((sum, a) => sum + a.value, 0);
  return {
    attack:
      Math.round(d.attack * factor) +
      affix("attack") +
      (instance.gems ?? []).reduce(
        (v, id) => v + (getItem(id).gemStats?.attack ?? 0),
        0,
      ),
    defense:
      Math.round(d.defense * factor) +
      affix("defense") +
      (instance.gems ?? []).reduce(
        (v, id) => v + (getItem(id).gemStats?.defense ?? 0),
        0,
      ),
    maxHp: Math.round(d.maxHp * factor) + affix("maxHp"),
    maxMp: Math.round(d.maxMp * factor) + affix("maxMp"),
  };
}
export function characterBonuses(p: CharacterProgress) {
  const result = {
    attack: 0,
    defense: 0,
    maxHp: 0,
    maxMp: 0,
    lifeSteal: 0,
    critChance: 0,
    accuracy: 0,
    evasion: 0,
    resistance: 0,
  };
  for (const i of Object.values(p.equipment)) {
    const b = itemBonuses(i);
    result.attack += b.attack;
    result.defense += b.defense;
    result.maxHp += b.maxHp;
    result.maxMp += b.maxMp;
  }
  for (const [id, level] of Object.entries(p.skillLevels)) {
    const d = skills.find((s) => s.id === id);
    if (!d?.passive || d.classId !== p.classId || d.branchId !== p.branchId)
      continue;
    for (const key of Object.keys(result) as (keyof typeof result)[])
      result[key] += (d.passive[key] ?? 0) * level;
  }
  return result;
}
export function directionFromDelta(delta: Vec2): Direction8 {
  const sx = (delta.x - delta.y) * 2,
    sy = delta.x + delta.y;
  return ((Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) + 8) %
    8) as Direction8;
}
export function statusValue(
  e: CombatEntity,
  kind: CombatEntity["statuses"][number]["kind"],
) {
  return e.statuses
    .filter((s) => s.kind === kind)
    .reduce((n, s) => n + s.magnitude * s.stacks, 0);
}
export function setAnimation(
  e: CombatEntity,
  state: CombatEntity["state"],
  tick: number,
  duration = 0,
) {
  if (e.state !== state) {
    e.state = state;
    e.stateStartedAt = tick;
  }
  e.stateUntil = tick + duration;
}
export function isDisabled(e: CombatEntity) {
  return e.statuses.some((s) => s.kind === "stun" || s.kind === "freeze");
}

export const respecCost = (level: number) => 200 + level * 20;
