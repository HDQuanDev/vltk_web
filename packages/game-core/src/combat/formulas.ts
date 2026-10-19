import type { Attributes, Element } from "../../../game-protocol/src/index";
export const experienceForLevel = (level: number) =>
  Math.round(90 * Math.pow(level, 1.45));
export const elementalCounter: Record<Element, Element> = {
  metal: "wood",
  wood: "earth",
  earth: "water",
  water: "fire",
  fire: "metal",
};
export const elementalSupport: Record<Element, Element> = {
  metal: "water",
  water: "wood",
  wood: "fire",
  fire: "earth",
  earth: "metal",
};
export function elementalModifier(attacker: Element, defender: Element) {
  if (elementalCounter[attacker] === defender) return 1.2;
  if (elementalCounter[defender] === attacker) return 0.85;
  return 1;
}
export function calculateDamage(
  attack: number,
  defense: number,
  power: number,
  attacker: Element,
  defender: Element,
  roll: number,
  criticalRoll: number,
  bonuses: {
    accuracy?: number;
    evasion?: number;
    critChance?: number;
    resistance?: number;
  } = {},
) {
  const dodge =
    roll <
    Math.max(
      0.01,
      Math.min(0.35, 0.04 + (bonuses.evasion ?? 0) - (bonuses.accuracy ?? 0)),
    );
  const critical =
    criticalRoll < Math.min(0.6, 0.12 + (bonuses.critChance ?? 0));
  return {
    value: dodge
      ? 0
      : Math.max(
          1,
          Math.round(
            (attack * power - defense * 0.55) *
              elementalModifier(attacker, defender) *
              (1 - Math.min(0.65, bonuses.resistance ?? 0)) *
              (critical ? 1.65 : 1),
          ),
        ),
    critical,
    dodge,
  };
}
export function deriveStats(
  level: number,
  a: Attributes,
  equipment: { attack: number; defense: number },
  scaling: keyof Attributes = "strength",
) {
  return {
    maxHp: 180 + a.vitality * 12 + level * 18,
    maxMp: 80 + a.energy * 8 + level * 10,
    attack:
      12 +
      (scaling === "strength" ? a.strength * 2 : a.strength + a[scaling]) +
      level * 3 +
      equipment.attack,
    defense: 3 + a.dexterity * 0.7 + level + equipment.defense,
  };
}
