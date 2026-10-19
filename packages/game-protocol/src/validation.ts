import { z } from "zod";
const id = z.string().min(1).max(160),
  skillId = z.string().min(1).max(64);
const settings = z
  .object({
    sound: z.boolean().optional(),
    music: z.boolean().optional(),
    effects: z.enum(["high", "low"]).optional(),
    fps: z.union([z.literal(30), z.literal(60)]).optional(),
  })
  .strict();
const auto = z
  .object({
    pickup: z.boolean().optional(),
    lootRarity: z
      .enum(["all", "uncommon", "rare", "epic", "legendary", "mythic"])
      .optional(),
    stopWhenFull: z.boolean().optional(),
    rotation: z.boolean().optional(),
    potions: z.boolean().optional(),
    hpThreshold: z.number().finite().min(0).max(1).optional(),
    mpThreshold: z.number().finite().min(0).max(1).optional(),
    stopHp: z.number().finite().min(0).max(1).optional(),
    range: z.number().finite().min(2).max(12).optional(),
  })
  .strict();
export const gameCommandSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("move"),
      destination: z
        .object({
          x: z.number().finite().min(-1e6).max(1e6),
          y: z.number().finite().min(-1e6).max(1e6),
        })
        .strict(),
    })
    .strict(),
  z.object({ type: z.literal("stop") }).strict(),
  z
    .object({
      type: z.literal("steer"),
      direction: z
        .object({
          x: z.number().finite().min(-1).max(1),
          y: z.number().finite().min(-1).max(1),
        })
        .strict(),
    })
    .strict(),
  z.object({ type: z.literal("pickup"), lootId: id }).strict(),
  z.object({ type: z.literal("respawn") }).strict(),
  z.object({ type: z.literal("sortInventory") }).strict(),
  z.object({ type: z.literal("resetStats") }).strict(),
  z.object({ type: z.literal("attack"), targetId: id }).strict(),
  z
    .object({ type: z.literal("selectTarget"), targetId: id.nullable() })
    .strict(),
  z
    .object({ type: z.literal("skill"), skillId, targetId: id.optional() })
    .strict(),
  z.object({ type: z.literal("interact"), targetId: id }).strict(),
  z.object({ type: z.literal("acceptQuest"), questId: id }).strict(),
  z.object({ type: z.literal("claimQuest"), questId: id }).strict(),
  z.object({ type: z.literal("useItem"), instanceId: id }).strict(),
  z.object({ type: z.literal("equip"), instanceId: id }).strict(),
  z
    .object({
      type: z.literal("unequip"),
      slot: z.enum(["weapon", "armor", "boots", "helmet", "accessory"]),
    })
    .strict(),
  z.object({ type: z.literal("buy"), itemId: id }).strict(),
  z.object({ type: z.literal("sell"), instanceId: id }).strict(),
  z
    .object({
      type: z.literal("allocate"),
      attribute: z.enum(["strength", "dexterity", "vitality", "energy"]),
    })
    .strict(),
  z.object({ type: z.literal("learn"), skillId }).strict(),
  z.object({ type: z.literal("branch"), branchId: skillId }).strict(),
  z
    .object({
      type: z.literal("bindSkill"),
      slot: z.number().int().min(0).max(3),
      skillId,
    })
    .strict(),
  z.object({ type: z.literal("settings"), settings }).strict(),
  z.object({ type: z.literal("autoAttack"), enabled: z.boolean() }).strict(),
  z.object({ type: z.literal("configureAuto"), settings: auto }).strict(),
  z.object({ type: z.literal("pause"), paused: z.boolean() }).strict(),
  z
    .object({
      type: z.literal("enhance"),
      instanceId: id,
      protect: z.boolean().optional(),
    })
    .strict(),
  z
    .object({ type: z.literal("socket"), instanceId: id, gemInstanceId: id })
    .strict(),
  z
    .object({
      type: z.literal("removeGem"),
      instanceId: id,
      socket: z.number().int().min(0).max(1),
    })
    .strict(),
  z
    .object({
      type: z.literal("lockItem"),
      instanceId: id,
      locked: z.boolean(),
    })
    .strict(),
  z.object({ type: z.literal("deposit"), instanceId: id }).strict(),
  z.object({ type: z.literal("withdraw"), instanceId: id }).strict(),
  z.object({ type: z.literal("gather"), nodeId: id }).strict(),
  z.object({ type: z.literal("craft"), recipeId: id }).strict(),
]);
export const commandEnvelopeSchema = z
  .object({
    protocolVersion: z.literal(1),
    sequence: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    actorId: id,
    command: gameCommandSchema,
  })
  .strict();
