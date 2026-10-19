import {
  affixPool,
  getItem,
  rarityPriority,
  type AffixStat,
} from "../../../game-content/src/index";
import type { ItemAffix } from "../../../game-protocol/src/index";
export function rollLoot<T extends { chance: number }>(
  table: readonly T[],
  random: () => number,
): T[] {
  return table.filter((entry) => random() < entry.chance);
}
const equipmentKinds = ["weapon", "armor", "boots", "helmet", "accessory"];
/**
 * Phụ từ ngẫu nhiên cho trang bị hiếm trở lên, roll bằng RNG authority đã seed.
 * Vật phẩm thường/tiêu hao không có phụ từ để giữ loot table dễ đọc.
 */
export function rollAffixes(
  itemId: string,
  random: () => number,
): ItemAffix[] {
  const definition = getItem(itemId);
  if (!equipmentKinds.includes(definition.kind)) return [];
  const rank = rarityPriority[definition.rarity];
  if (rank < 3) return [];
  const count = rank >= 5 ? 2 : 1,
    affixes: ItemAffix[] = [];
  for (let attempt = 0; attempt < count; attempt++) {
    const total = affixPool.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = random() * total,
      picked = affixPool[affixPool.length - 1];
    for (const entry of affixPool)
      if ((roll -= entry.weight) < 0) {
        picked = entry;
        break;
      }
    if (affixes.some((a) => a.id === picked.id)) continue;
    affixes.push({
      id: picked.id,
      stat: picked.stat as AffixStat,
      value:
        picked.min + Math.floor(random() * (picked.max - picked.min + 1)),
    });
  }
  return affixes;
}
