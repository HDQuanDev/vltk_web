import { getItem } from "../../../game-content/src/index";
import type { CharacterProgress } from "../../../game-protocol/src/index";
import { INVENTORY_CAPACITY } from "../../../game-protocol/src/index";
export { INVENTORY_CAPACITY };
export function canAddItem(
  s: CharacterProgress,
  itemId: string,
  quantity = 1,
): boolean {
  if (!Number.isInteger(quantity) || quantity <= 0) return false;
  const d = getItem(itemId);
  const freeStacks = s.inventory
    .filter((i) => i.definitionId === itemId)
    .reduce((n, i) => n + d.stack - i.quantity, 0);
  return (
    quantity <= freeStacks + (INVENTORY_CAPACITY - s.inventory.length) * d.stack
  );
}
export function addItem(
  s: CharacterProgress,
  itemId: string,
  quantity = 1,
): boolean {
  if (!canAddItem(s, itemId, quantity)) return false;
  const d = getItem(itemId);
  for (const i of s.inventory) {
    if (i.definitionId !== itemId) continue;
    const amount = Math.min(quantity, d.stack - i.quantity);
    i.quantity += amount;
    quantity -= amount;
    if (!quantity) return true;
  }
  while (quantity > 0) {
    const amount = Math.min(quantity, d.stack);
    s.inventory.push({
      id: `${s.characterId}:item:${s.nextId++}`,
      definitionId: itemId,
      quantity: amount,
    });
    quantity -= amount;
  }
  return true;
}
