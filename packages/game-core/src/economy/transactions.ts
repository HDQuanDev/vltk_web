import { compareStableText } from "../engine/order";
import {
  getItem,
  recipes,
  resourceNodes,
  enhancementRules,
  enhanceCost,
  enhanceFailureLoss,
  enhanceSuccessRate,
  professionLevel,
  isEquipment,
} from "../../../game-content/src/index";
import {
  WAREHOUSE_CAPACITY,
  INVENTORY_CAPACITY,
  type CharacterProgress,
  type CombatEntity,
  type GameCommand,
  type GameEvent,
  type GameSnapshot,
  type ItemInstance,
} from "../../../game-protocol/src/index";
import { addItem } from "../inventory/items";
import { distance } from "../world/navigation";
import { setAnimation } from "../combat/stats";
export interface EconomyContext {
  state: GameSnapshot;
  nearNpc: (actor: CombatEntity, id: string) => boolean;
  /** RNG authority đã seed; mọi giao dịch có tỉ lệ phải dùng nguồn này. */
  random: () => number;
  emit: (
    type: GameEvent["type"],
    text: string,
    data?: Partial<GameEvent>,
  ) => void;
  objective: (
    actor: CombatEntity,
    kind: string,
    target: string,
    amount?: number,
  ) => void;
}
export class EconomyTransactions {
  constructor(private context: EconomyContext) {}
  execute(actor: CombatEntity, p: CharacterProgress, c: GameCommand): boolean {
    const s = this.context.state,
      error = (text: string) =>
        this.context.emit("error", text, { entityId: actor.id });
    const draft = () => ({
      ...p,
      inventory: structuredClone(p.inventory),
      equipment: structuredClone(p.equipment),
      warehouse: structuredClone(p.warehouse),
      professionXp: { ...p.professionXp },
      enhanceLog: [...(p.enhanceLog ?? [])],
    });
    const commit = (d: CharacterProgress) => {
      p.inventory = d.inventory;
      p.equipment = d.equipment;
      p.warehouse = d.warehouse;
      p.gold = d.gold;
      p.professionXp = d.professionXp;
      p.enhanceLog = d.enhanceLog;
    };
    const find = (d: CharacterProgress, id: string) =>
      [...d.inventory, ...Object.values(d.equipment)].find((i) => i.id === id);
    if (c.type === "sortInventory") {
      p.inventory.sort(
        (a, b) =>
          compareStableText(
            getItem(a.definitionId).kind,
            getItem(b.definitionId).kind,
          ) ||
          compareStableText(
            getItem(a.definitionId).name,
            getItem(b.definitionId).name,
          ) ||
          compareStableText(a.id, b.id),
      );
      return true;
    }
    if (c.type === "lockItem") {
      const i = find(p, c.instanceId);
      if (i) i.locked = c.locked;
      return true;
    }
    if (c.type === "deposit" || c.type === "withdraw") {
      if (!this.context.nearNpc(actor, "elder")) {
        error("Kho đồ ở cạnh Lão trưởng thôn.");
        return true;
      }
      const from = c.type === "deposit" ? p.inventory : p.warehouse,
        to = c.type === "deposit" ? p.warehouse : p.inventory,
        limit = c.type === "deposit" ? WAREHOUSE_CAPACITY : INVENTORY_CAPACITY;
      const i = from.find((i) => i.id === c.instanceId);
      if (!i) return true;
      if (to.length >= limit) {
        error("Kho hoặc hành trang đã đầy.");
        return true;
      }
      from.splice(from.indexOf(i), 1);
      to.push(i);
      this.context.emit(
        "message",
        `${c.type === "deposit" ? "Gửi kho" : "Rút kho"}: ${getItem(i.definitionId).name}`,
        { entityId: actor.id },
      );
      return true;
    }
    if (c.type === "enhance") {
      if ((actor.cooldowns.enhance ?? 0) > s.tick) {
        error("Đợi kết quả cường hóa trước hoàn tất.");
        return true;
      }
      if (!this.context.nearNpc(actor, "smith")) {
        error("Đến Lâm thợ rèn để cường hóa.");
        return true;
      }
      const d = draft(),
        i = find(d, c.instanceId);
      if (
        !i ||
        !isEquipment(getItem(i.definitionId).kind)
      )
        return true;
      const level = i.enhancement ?? 0;
      if (level >= enhancementRules.maxLevel) {
        error("Trang bị đã đạt cấp cường hóa tối đa.");
        return true;
      }
      const cost = enhanceCost(level),
        protection = c.protect === true,
        ward = protection
          ? d.inventory.find(
              (n) =>
                n.definitionId === enhancementRules.protectionItemId &&
                !n.locked,
            )
          : undefined;
      if (protection && !ward) {
        error("Không có Đá Hộ Mệnh trong hành trang.");
        return true;
      }
      const gold =
        cost.gold + (protection ? enhancementRules.protectionGold : 0);
      if (d.gold < gold || !consume(d, "ore", cost.ore)) {
        error(`Cần ${gold} bạc và ${cost.ore} Huyền Thiết.`);
        return true;
      }
      if (ward && --ward.quantity === 0)
        d.inventory = d.inventory.filter((n) => n.id !== ward.id);
      d.gold -= gold;
      const success = this.context.random() < enhanceSuccessRate(level),
        next = success
          ? level + 1
          : Math.max(0, level - (protection ? 0 : enhanceFailureLoss(level)));
      i.enhancement = next;
      d.enhanceLog = [
        ...d.enhanceLog,
        {
          tick: s.tick,
          definitionId: i.definitionId,
          from: level,
          to: next,
          success,
          protected: protection,
        },
      ].slice(-20);
      commit(d);
      actor.cooldowns.enhance = s.tick + 10;
      this.context.emit(
        "equipment",
        success
          ? `Cường hóa ${getItem(i.definitionId).name} lên +${next}.`
          : `Cường hóa thất bại: ${getItem(i.definitionId).name} ${
              next === level ? `giữ +${level}` : `tụt còn +${next}`
            }.`,
        { entityId: actor.id, success, value: next },
      );
      return true;
    }
    if (c.type === "socket") {
      if (!this.context.nearNpc(actor, "smith")) {
        error("Đến Lâm thợ rèn để khảm ngọc.");
        return true;
      }
      const d = draft(),
        i = find(d, c.instanceId),
        gem = d.inventory.find((i) => i.id === c.gemInstanceId);
      if (
        !i ||
        !gem ||
        !isEquipment(getItem(i.definitionId).kind) ||
        getItem(gem.definitionId).kind !== "gem"
      )
        return true;
      const slots = (i.enhancement ?? 0) >= 3 ? 2 : 1;
      if ((i.gems?.length ?? 0) >= slots || d.gold < 40) {
        error("Ô ngọc đã đầy hoặc thiếu 40 bạc phí khảm.");
        return true;
      }
      if (gem.locked) {
        error("Ngọc đang khóa bảo vệ.");
        return true;
      }
      i.gems = [...(i.gems ?? []), gem.definitionId];
      if (--gem.quantity === 0)
        d.inventory = d.inventory.filter((n) => n.id !== gem.id);
      d.gold -= 40;
      commit(d);
      this.context.emit("equipment", "Đã khảm ngọc và cập nhật chỉ số.", {
        entityId: actor.id,
      });
      return true;
    }
    if (c.type === "removeGem") {
      if (!this.context.nearNpc(actor, "smith")) {
        error("Đến thợ rèn để tháo ngọc.");
        return true;
      }
      const d = draft(),
        i = find(d, c.instanceId);
      if (
        !i ||
        !Number.isInteger(c.socket) ||
        c.socket < 0 ||
        !i.gems?.[c.socket]
      )
        return true;
      if (d.gold < 100) {
        error("Cần 100 bạc phí tháo ngọc.");
        return true;
      }
      if (!addItem(d, i.gems[c.socket])) {
        error("Không đủ ô nhận lại ngọc.");
        return true;
      }
      i.gems.splice(c.socket, 1);
      d.gold -= 100;
      p.nextId = d.nextId;
      commit(d);
      this.context.emit(
        "equipment",
        "Đã tháo ngọc và hoàn trả vào hành trang.",
        { entityId: actor.id },
      );
      return true;
    }
    if (c.type === "craft") {
      const r = recipes.find((r) => r.id === c.recipeId);
      if (!r) return true;
      if (!this.context.nearNpc(actor, r.station)) {
        error("Hãy đến đúng bàn chế tạo của dược sư hoặc thợ rèn.");
        return true;
      }
      if (
        professionLevel(p.professionXp[r.profession] ?? 0) < r.requiredLevel
      ) {
        error(`Nghề cần đạt cấp ${r.requiredLevel}.`);
        return true;
      }
      const d = draft();
      if (
        d.gold < r.gold ||
        r.materials.some((m) => !consume(d, m.itemId, m.quantity))
      ) {
        error("Không đủ bạc hoặc nguyên liệu chưa khóa.");
        return true;
      }
      if (!addItem(d, r.output.itemId, r.output.quantity)) {
        error("Hành trang không đủ chỗ nhận sản phẩm.");
        return true;
      }
      d.gold -= r.gold;
      d.professionXp[r.profession] =
        (d.professionXp[r.profession] ?? 0) + r.experience;
      p.nextId = d.nextId;
      commit(d);
      setAnimation(actor, "interact", s.tick, 12);
      this.context.emit(
        "craft",
        `Chế tạo ${r.output.quantity} ${getItem(r.output.itemId).name}.`,
        { entityId: actor.id, targetId: r.id },
      );
      this.context.objective(actor, "craft", r.id);
      return true;
    }
    if (c.type === "gather") {
      const node = resourceNodes.find((n) => n.id === c.nodeId);
      if (!node || node.mapId !== actor.mapId) return true;
      if (distance(actor, node) > 2) {
        error("Đến gần tài nguyên để thu thập.");
        return true;
      }
      if ((s.resources[node.id]?.availableAt ?? 0) > s.tick) {
        error("Tài nguyên đang tái sinh.");
        return true;
      }
      if ((actor.cooldowns.gather ?? 0) > s.tick) {
        error("Đợi thao tác thu thập trước hoàn tất.");
        return true;
      }
      if (
        professionLevel(p.professionXp[node.kind] ?? 0) < node.requiredLevel
      ) {
        error(`Nghề thu thập cần cấp ${node.requiredLevel}.`);
        return true;
      }
      if (!addItem(p, node.itemId, node.quantity)) {
        error("Hành trang đã đầy.");
        return true;
      }
      p.professionXp[node.kind] = (p.professionXp[node.kind] ?? 0) + 15;
      s.resources[node.id] = {
        availableAt: s.tick + node.respawnTicks,
        harvests: (s.resources[node.id]?.harvests ?? 0) + 1,
      };
      actor.cooldowns.gather = s.tick + 30;
      setAnimation(actor, "interact", s.tick, 15);
      this.context.emit(
        "resource",
        `Thu thập ${node.quantity} ${getItem(node.itemId).name}.`,
        { entityId: actor.id, targetId: node.id },
      );
      this.context.objective(actor, "collect", node.itemId, node.quantity);
      return true;
    }
    return false;
  }
}
export function consume(
  p: CharacterProgress,
  itemId: string,
  quantity: number,
) {
  const eligible = p.inventory.filter(
    (i) => i.definitionId === itemId && !i.locked,
  );
  if (eligible.reduce((n, i) => n + i.quantity, 0) < quantity) return false;
  for (const i of eligible) {
    const amount = Math.min(i.quantity, quantity);
    i.quantity -= amount;
    quantity -= amount;
    if (!quantity) break;
  }
  p.inventory = p.inventory.filter((i) => i.quantity > 0);
  return true;
}
export function enhancementPreview(i: ItemInstance) {
  const level = i.enhancement ?? 0,
    cost = enhanceCost(level);
  return {
    level,
    nextLevel: level + 1,
    gold: cost.gold,
    ore: cost.ore,
    maxLevel: enhancementRules.maxLevel,
    safeLevel: enhancementRules.safeLevel,
    successRate: enhanceSuccessRate(level),
    failureLoss: enhanceFailureLoss(level),
    protection: {
      itemId: enhancementRules.protectionItemId,
      gold: enhancementRules.protectionGold,
    },
  };
}
