import { highlands } from "./highlands";
import { riverlands } from "./riverlands";
import { thanhvanson } from "./thanhvanson";
import { z } from "zod";
import { recipes, resourceNodes } from "./economy";
export * from "./economy";
export const CONTENT_VERSION = "0.5.0";
import { classDefinitions, defaultBranch, getSect } from "./sects";
import { skillSchema, type SkillDefinition } from "./skill-schema";
import { sectSkills } from "./sect-skills";
export { classDefinitions, defaultBranch, getSect, skillSchema };
export type { SkillDefinition };
export { statusApplicationSchema } from "./skill-schema";
export const skills = [
  {
    id: "slash",
    name: "Kiếm pháp cơ bản",
    icon: "sword",
    kind: "melee",
    cooldownTicks: 16,
    manaCost: 0,
    range: 1.65,
    power: 1,
    requiredLevel: 1,
    maxLevel: 5,
    description: "Một đường kiếm dứt khoát. Không tiêu hao nội lực.",
  },
  {
    id: "thunder",
    name: "Thiên Địa Vô Cực",
    icon: "lightning",
    kind: "line",
    cooldownTicks: 65,
    manaCost: 16,
    range: 5,
    power: 2.5,
    requiredLevel: 1,
    maxLevel: 5,
    description: "Phóng kiếm khí về một mục tiêu, gây 250% sát thương.",
  },
  {
    id: "storm",
    name: "Tam Hoàn Sáo Nguyệt",
    icon: "wind",
    kind: "aoe",
    cooldownTicks: 130,
    manaCost: 28,
    range: 3.5,
    power: 1.9,
    requiredLevel: 1,
    maxLevel: 5,
    description: "Kiếm khí xoay quanh người, đánh mọi kẻ địch trong phạm vi.",
  },
  {
    id: "heal",
    name: "Thanh Tâm Quyết",
    icon: "lotus",
    kind: "heal",
    cooldownTicks: 200,
    manaCost: 22,
    range: 1,
    power: 0.4,
    requiredLevel: 1,
    maxLevel: 5,
    description: "Điều hòa chân khí, hồi phục 40% sinh lực tối đa.",
  },
  {
    id: "guard",
    name: "Thái Cực Hộ Thể",
    icon: "shield",
    kind: "buff",
    cooldownTicks: 240,
    manaCost: 20,
    range: 1,
    power: 0.5,
    requiredLevel: 2,
    maxLevel: 5,
    description: "Vận khí hộ thân, giảm 50% sát thương trong 6 giây.",
  },
  ...sectSkills,
].map((s) =>
  skillSchema.parse({
    ...s,
    ...(["thunder", "storm", "heal", "guard"].includes(s.id)
      ? { classId: "wudang", branchId: "sword" }
      : {}),
  }),
);
export const getClassSkills = (classId: string, branchId?: string) =>
  skills.filter(
    (d) =>
      d.id === "slash" ||
      (d.classId === classId && (!branchId || d.branchId === branchId)) ||
      (classId === "wudang" &&
        ["thunder", "storm", "heal", "guard"].includes(d.id) &&
        (!branchId || branchId === "sword")),
  );
export const startingLoadout = (
  classId: string,
  branchId = defaultBranch(classId).id,
) => {
  const branch = getSect(classId).branches.find((b) => b.id === branchId);
  if (!branch) throw new Error("Nhánh võ học không hợp lệ.");
  return [...branch.startingSkills];
};
export const itemRarities = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "mythic",
] as const;
export type ItemRarity = (typeof itemRarities)[number];
/** Thứ tự ưu tiên 6 phẩm chất: dùng cho pool loot, auto-farm và roll phụ từ. */
export const rarityPriority: Record<ItemRarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
  mythic: 6,
};
/** Ô trang bị dùng chung cho core, protocol, UI và storage (kind trùng tên ô). */
export const equipmentSlots = [
  "weapon",
  "armor",
  "boots",
  "helmet",
  "accessory",
] as const;
export type EquipmentSlot = (typeof equipmentSlots)[number];
export const isEquipment = (kind: string): kind is EquipmentSlot =>
  (equipmentSlots as readonly string[]).includes(kind);
export const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum([
    "weapon",
    "armor",
    "boots",
    "helmet",
    "accessory",
    "consumable",
    "material",
    "gem",
  ]),
  icon: z.string(),
  gemStats: z
    .object({
      attack: z.number().nonnegative().default(0),
      defense: z.number().nonnegative().default(0),
    })
    .optional(),
  rarity: z.enum(itemRarities),
  stack: z.number().int().positive(),
  price: z.number().int().nonnegative(),
  level: z.number().int().positive(),
  /** Yêu cầu cấp nhân vật khi trang bị; bỏ trống nghĩa là không ràng buộc. */
  requiredLevel: z.number().int().min(1).max(100).optional(),
  attack: z.number().nonnegative().default(0),
  defense: z.number().nonnegative().default(0),
  maxHp: z.number().nonnegative().default(0),
  maxMp: z.number().nonnegative().default(0),
  restore: z.enum(["hp", "mp"]).optional(),
  description: z.string(),
});
/**
 * Phụ từ (affix) ngẫu nhiên cho trang bị hiếm trở lên. Roll bằng RNG authority
 * khi sinh loot nên save/replay vẫn xác định.
 */
export const affixPool = [
  { id: "sharp", name: "Sắc Bén", stat: "attack", min: 2, max: 7, weight: 4 },
  { id: "sturdy", name: "Kiên Cố", stat: "defense", min: 2, max: 6, weight: 4 },
  { id: "vital", name: "Sinh Lực", stat: "maxHp", min: 12, max: 40, weight: 3 },
  { id: "spirit", name: "Tinh Thần", stat: "maxMp", min: 8, max: 26, weight: 3 },
] as const;
export type AffixStat = (typeof affixPool)[number]["stat"];
export const items = [
  {
    id: "sword",
    name: "Thanh Phong Kiếm",
    kind: "weapon",
    icon: "sword",
    rarity: "uncommon",
    stack: 1,
    price: 180,
    level: 1,
    attack: 8,
    description: "Lưỡi kiếm thanh mảnh được thợ rèn Tân Thủ Thôn chế tác.",
  },
  {
    id: "robe",
    name: "Đạo Bào Thanh Vân",
    kind: "armor",
    icon: "robe",
    rarity: "uncommon",
    stack: 1,
    price: 150,
    level: 1,
    defense: 6,
    description: "Áo vải bền nhẹ, thêu mây trên nền chàm.",
  },
  {
    id: "boots",
    name: "Lưu Vân Ngoa",
    kind: "boots",
    icon: "boots",
    rarity: "rare",
    stack: 1,
    price: 240,
    level: 2,
    defense: 4,
    description: "Đôi hài của người lữ khách đã qua nhiều dặm giang hồ.",
  },
  {
    id: "boss-sword",
    name: "Huyền Thiên Kiếm",
    kind: "weapon",
    icon: "sword",
    rarity: "epic",
    stack: 1,
    price: 1200,
    level: 3,
    attack: 32,
    description: "Thanh kiếm mang dấu ấn của kẻ đã khuất phục Hắc Phong.",
  },
  {
    id: "hp",
    name: "Tiểu Hoàn Đan",
    kind: "consumable",
    icon: "potion-red",
    rarity: "common",
    stack: 99,
    price: 20,
    level: 1,
    restore: "hp",
    description: "Hồi 55% sinh lực. Hồi chiêu chung 3 giây.",
  },
  {
    id: "mp",
    name: "Tụ Khí Đan",
    kind: "consumable",
    icon: "potion-blue",
    rarity: "common",
    stack: 99,
    price: 18,
    level: 1,
    restore: "mp",
    description: "Hồi 55% nội lực. Hồi chiêu chung 3 giây.",
  },
  {
    id: "herb",
    name: "Linh Thảo",
    kind: "material",
    icon: "herb",
    rarity: "uncommon",
    stack: 99,
    price: 12,
    level: 1,
    description: "Dược liệu mọc ở ven rừng, có thể bán cho dược sư.",
  },
  {
    id: "ore",
    name: "Huyền Thiết",
    kind: "material",
    icon: "gem",
    rarity: "rare",
    stack: 99,
    price: 30,
    level: 1,
    description: "Khoáng thạch thô thu được từ sơn tặc.",
  },
  {
    id: "wood",
    name: "Thanh Tùng Mộc",
    kind: "material",
    icon: "herb",
    rarity: "common",
    stack: 99,
    price: 10,
    level: 1,
    description: "Gỗ thu thập từ cây, dùng luyện dược và chế trang bị.",
  },
  {
    id: "jade-gem",
    name: "Bích Ngọc",
    kind: "gem",
    icon: "gem",
    rarity: "rare",
    stack: 20,
    price: 160,
    level: 1,
    gemStats: { attack: 4, defense: 0 },
    description: "Khảm vào trang bị để tăng 4 công kích.",
  },
  {
    id: "amber-gem",
    name: "Hổ Phách",
    kind: "gem",
    icon: "gem",
    rarity: "rare",
    stack: 20,
    price: 180,
    level: 1,
    gemStats: { attack: 0, defense: 3 },
    description: "Khảm vào trang bị để tăng 3 phòng ngự.",
  },
  {
    id: "ward-stone",
    name: "Đá Hộ Mệnh",
    kind: "material",
    icon: "gem",
    rarity: "rare",
    stack: 20,
    price: 220,
    level: 1,
    description:
      "Bán ở thợ rèn. Bật khi cường hóa để không mất cấp nếu lần đập đó thất bại.",
  },
].map((i) => itemSchema.parse(i));
export type ItemDefinition = z.infer<typeof itemSchema>;
export interface MonsterDefinition {
  id: string;
  name: string;
  brain: "melee" | "pack" | "boss" | "ranged" | "assassin" | "poison";
  skillIds: string[];
  bossMechanic: string | null;
  level: number;
  hp: number;
  attack: number;
  defense: number;
  element: import("../../game-protocol/src/index").Element;
  exp: number;
  gold: number;
  detect: number;
  range: number;
  respawn: number;
  speed: number;
  loot: { itemId: string; chance: number }[];
}
export const monsters: MonsterDefinition[] = [
  {
    id: "bandit",
    brain: "melee" as
      "melee" | "pack" | "boss" | "ranged" | "assassin" | "poison",
    skillIds: [],
    bossMechanic: null as string | null,
    name: "Sơn tặc",
    level: 1,
    hp: 65,
    attack: 8,
    defense: 2,
    element: "wood" as const,
    exp: 28,
    gold: 18,
    detect: 4,
    range: 1.3,
    respawn: 300,
    speed: 1.7,
    loot: [
      { itemId: "herb", chance: 0.6 },
      { itemId: "hp", chance: 0.25 },
    ],
  },
  {
    id: "wolf",
    brain: "pack" as const,
    skillIds: [],
    bossMechanic: null as string | null,
    name: "Lang vương",
    level: 3,
    hp: 130,
    attack: 15,
    defense: 5,
    element: "metal" as const,
    exp: 52,
    gold: 30,
    detect: 5,
    range: 1.3,
    respawn: 350,
    speed: 2.2,
    loot: [
      { itemId: "ore", chance: 0.55 },
      { itemId: "boots", chance: 0.12 },
    ],
  },
  {
    id: "boss",
    brain: "boss" as const,
    skillIds: [],
    bossMechanic: "quake" as string | null,
    name: "Hắc Phong Trại Chủ",
    level: 5,
    hp: 780,
    attack: 25,
    defense: 9,
    element: "fire" as const,
    exp: 280,
    gold: 350,
    detect: 6,
    range: 2.1,
    respawn: 1200,
    speed: 1.5,
    loot: [
      { itemId: "boss-sword", chance: 1 },
      { itemId: "ore", chance: 1 },
    ],
  },
];
monsters.push(
  {
    id: "archer",
    name: "Sơn tặc cung thủ",
    brain: "ranged",
    skillIds: [],
    bossMechanic: null as string | null,
    level: 3,
    hp: 95,
    attack: 13,
    defense: 3,
    element: "wood",
    exp: 40,
    gold: 24,
    detect: 7,
    range: 5,
    respawn: 360,
    speed: 1.9,
    loot: [
      { itemId: "wood", chance: 0.7 },
      { itemId: "mp", chance: 0.25 },
    ],
  },
  {
    id: "assassin",
    name: "Ảnh nhẫn trinh sát",
    brain: "assassin",
    skillIds: [],
    bossMechanic: null as string | null,
    level: 4,
    hp: 120,
    attack: 18,
    defense: 4,
    element: "fire",
    exp: 55,
    gold: 28,
    detect: 6,
    range: 1.4,
    respawn: 400,
    speed: 2.8,
    loot: [{ itemId: "ore", chance: 0.6 }],
  },
  {
    id: "viper",
    name: "Thanh xà độc",
    brain: "poison",
    skillIds: [],
    bossMechanic: null as string | null,
    level: 3,
    hp: 100,
    attack: 10,
    defense: 3,
    element: "wood",
    exp: 42,
    gold: 22,
    detect: 5,
    range: 4.5,
    respawn: 360,
    speed: 1.8,
    loot: [{ itemId: "herb", chance: 1 }],
  },
);
export interface QuestDefinition {
  id: string;
  name: string;
  chapter: string;
  description: string;
  objectiveKind:
    "kill" | "collect" | "craft" | "equip" | "explore" | "talk" | "level";
  target: string;
  count: number;
  exp: number;
  gold: number;
  rewardItem: string;
  requires: string | null;
  npc: string;
  repeatTicks: number;
  mapId?: string;
}
export const quests: QuestDefinition[] = [
  {
    id: "bandits",
    objectiveKind: "kill" as
      "kill" | "collect" | "craft" | "equip" | "explore" | "talk" | "level",
    repeatTicks: 0,
    name: "Bình yên thôn nhỏ",
    chapter: "Chương I · Sơ nhập giang hồ",
    description:
      "Sơn tặc đang quấy nhiễu ven thôn. Hãy giúp Lão trưởng thôn đánh đuổi chúng.",
    target: "bandit",
    count: 5,
    exp: 90,
    gold: 120,
    rewardItem: "robe",
    requires: null,
    npc: "elder",
  },
  {
    id: "wolves",
    objectiveKind: "kill" as
      "kill" | "collect" | "craft" | "equip" | "explore" | "talk" | "level",
    repeatTicks: 0,
    name: "Dấu chân trong rừng",
    chapter: "Chương II · Thanh Trúc Lâm",
    description:
      "Lang vương xuất hiện giữa rừng trúc. Dẹp yên đường đến Hắc Phong Trại.",
    target: "wolf",
    count: 4,
    exp: 160,
    gold: 200,
    rewardItem: "boots",
    requires: "bandits",
    npc: "elder",
  },
  {
    id: "boss",
    objectiveKind: "kill" as
      "kill" | "collect" | "craft" | "equip" | "explore" | "talk" | "level",
    repeatTicks: 0,
    name: "Một kiếm định giang hồ",
    chapter: "Chương III · Hắc Phong Trại",
    description:
      "Đánh bại Hắc Phong Trại Chủ để mang bình yên trở lại vùng đất này.",
    target: "boss",
    count: 1,
    exp: 400,
    gold: 500,
    rewardItem: "boss-sword",
    requires: "wolves",
    npc: "elder",
  },
];
quests.push(
  {
    id: "herbalist",
    name: "Một nắm thuốc lành",
    chapter: "Nghề nghiệp · Hái thuốc",
    description:
      "Dược sư cần Linh Thảo tươi. Thu thập bốn cây từ các bụi thuốc và mang tin về.",
    objectiveKind: "collect",
    repeatTicks: 0,
    target: "herb",
    count: 4,
    exp: 55,
    gold: 75,
    rewardItem: "mp",
    requires: null,
    npc: "merchant",
  },
  {
    id: "first-brew",
    name: "Lửa lò đầu tiên",
    chapter: "Nghề nghiệp · Luyện dược",
    description: "Học cách luyện một mẻ Tiểu Hoàn Đan bên Diệp dược sư.",
    objectiveKind: "craft",
    repeatTicks: 0,
    target: "brew-hp",
    count: 1,
    exp: 80,
    gold: 100,
    rewardItem: "herb",
    requires: "herbalist",
    npc: "merchant",
  },
  {
    id: "daily-bandits",
    name: "Tuần tra ven thôn",
    chapter: "Tuần hoàn · Mỗi 20 phút game",
    description:
      "Giữ con đường quanh thôn an toàn. Nhiệm vụ mở lại sau 20 phút thời gian mô phỏng.",
    objectiveKind: "kill",
    repeatTicks: 24000,
    target: "bandit",
    count: 8,
    exp: 130,
    gold: 110,
    rewardItem: "ore",
    requires: "bandits",
    npc: "elder",
  },
  {
    id: "forest-scout",
    name: "Bước chân qua rừng trúc",
    chapter: "Khám phá",
    description: "Theo cổng phía đông nam đến Thanh Trúc Lâm.",
    objectiveKind: "explore",
    repeatTicks: 0,
    target: "forest",
    count: 1,
    exp: 65,
    gold: 50,
    rewardItem: "hp",
    requires: null,
    npc: "elder",
  },
  {
    id: "forge-proof",
    name: "Tay nghề người thợ",
    chapter: "Nghề nghiệp · Rèn",
    description: "Rèn một thanh Thanh Phong Kiếm bên Lâm thợ rèn.",
    objectiveKind: "craft",
    repeatTicks: 0,
    target: "forge-sword",
    count: 1,
    exp: 100,
    gold: 120,
    rewardItem: "ore",
    requires: null,
    npc: "smith",
  },
);
export const questObjectiveLabel = (q: {
  objectiveKind: string;
  target: string;
}) =>
  q.objectiveKind === "kill"
    ? `Đánh bại ${monsters.find((m) => m.id === q.target)?.name ?? q.target}`
    : q.objectiveKind === "collect"
      ? `Thu thập ${items.find((i) => i.id === q.target)?.name ?? q.target}`
      : q.objectiveKind === "craft"
        ? "Hoàn thành công thức yêu cầu"
        : q.objectiveKind === "explore"
          ? "Khám phá khu vực yêu cầu"
          : "Thực hiện mục tiêu";
export interface NpcDefinition {
  id: string;
  name: string;
  role: string;
  mapId: string;
  x: number;
  y: number;
  appearance: string;
  dialogue: string;
  /** Dịch vụ dùng id chuẩn (smith/merchant/elder) để tiền tiêu mới có đủ tiện ích. */
  service?: "smith" | "merchant" | "elder";
}
export const npcs: NpcDefinition[] = [
  {
    id: "elder",
    name: "Lão trưởng thôn",
    role: "Nhiệm vụ",
    x: 12,
    y: 11,
    mapId: "village",
    appearance: "elder",
    dialogue:
      "Thiếu hiệp, giang hồ rộng lớn nhưng nghĩa khí bắt đầu từ những việc nhỏ. Cứ ngồi xuống, chuyện trong thôn còn nhiều điều cần kể.",
  },
  {
    id: "merchant",
    name: "Diệp dược sư",
    role: "Dược phẩm",
    x: 8,
    y: 14,
    mapId: "village",
    appearance: "female",
    dialogue:
      "Đi khắp giang hồ, đừng quên mang theo một ít đan dược. Ta có vài món tốt dành cho thiếu hiệp.",
  },
  {
    id: "smith",
    name: "Lâm thợ rèn",
    role: "Trang bị",
    x: 18,
    y: 11,
    mapId: "village",
    appearance: "smith",
    dialogue:
      "Kiếm tốt cần người biết dùng. Chọn một món vừa tay rồi hãy lên đường.",
  },
];
npcs.push(
  {
    id: "ranger",
    name: "Lục tuần sơn",
    role: "Dẫn đường",
    mapId: "highlands",
    x: 17,
    y: 16,
    appearance: "elder",
    dialogue:
      "Ngoại vực có bốn ngả sơn lộ. Ghé đèo Trúc Ảnh rồi tìm Lều Thợ Săn; đừng đi thẳng vào tiền tiêu khi chưa đủ đan dược.",
  },
  {
    id: "hunter",
    name: "Tô thợ săn",
    role: "Thám hiểm",
    mapId: "highlands",
    x: 66,
    y: 61,
    appearance: "smith",
    dialogue:
      "Sói giữ Mai Viên, rắn chiếm đầm phía đông. Ta cần người khảo sát đường xuống phế miếu và mang về thuốc giải.",
  },
);
quests.push(
  {
    id: "highland-route",
    name: "Qua đèo Trúc Ảnh",
    chapter: "SƠN LỘ",
    description:
      "Theo sơn lộ đến đèo Trúc Ảnh, quan sát bãi phục kích rồi quay lại báo Lục tuần sơn.",
    objectiveKind: "explore",
    target: "bamboo-pass",
    count: 1,
    exp: 100,
    gold: 55,
    rewardItem: "hp",
    requires: null,
    npc: "ranger",
    repeatTicks: 0,
  },
  {
    id: "quarry-trail",
    name: "Dấu chân ở mỏ đá",
    chapter: "SƠN LỘ",
    description:
      "Khảo sát Mỏ Đá Cũ theo nhánh đường phía bắc. Cung thủ đang canh đường lấy quặng.",
    objectiveKind: "explore",
    target: "old-quarry",
    count: 1,
    exp: 160,
    gold: 80,
    rewardItem: "ore",
    requires: "highland-route",
    npc: "ranger",
    repeatTicks: 0,
  },
  {
    id: "hunter-route",
    name: "Tin tới lều thợ săn",
    chapter: "SƠN LỘ",
    description:
      "Băng qua ngã ba giữa rừng đến Lều Thợ Săn để mở đường tiếp tế.",
    objectiveKind: "explore",
    target: "hunter-rest",
    count: 1,
    exp: 180,
    gold: 100,
    rewardItem: "mp",
    requires: "highland-route",
    npc: "ranger",
    repeatTicks: 0,
  },
  {
    id: "plum-wolves",
    mapId: "highlands",
    name: "Bầy sói dưới mai già",
    chapter: "NGOẠI VỰC",
    description:
      "Đánh bại 4 sói quanh Mai Viên để giữ lối hái thuốc của thợ săn.",
    objectiveKind: "kill",
    target: "wolf",
    count: 4,
    exp: 200,
    gold: 110,
    rewardItem: "herb",
    requires: null,
    npc: "hunter",
    repeatTicks: 0,
  },
  {
    id: "marsh-antidote",
    mapId: "highlands",
    name: "Linh thảo bên đầm độc",
    chapter: "NGOẠI VỰC",
    description:
      "Thu thập 6 Linh Thảo tại các bụi thuốc rồi mang về Tô thợ săn.",
    objectiveKind: "collect",
    target: "herb",
    count: 6,
    exp: 180,
    gold: 100,
    rewardItem: "hp",
    requires: null,
    npc: "hunter",
    repeatTicks: 0,
  },
  {
    id: "shrine-route",
    name: "Bia đá phế miếu",
    chapter: "NGOẠI VỰC",
    description:
      "Theo nhánh đường tây nam tìm Phế Miếu. Thích khách ẩn trong khu vực này.",
    objectiveKind: "explore",
    target: "ruined-shrine",
    count: 1,
    exp: 220,
    gold: 125,
    rewardItem: "jade-gem",
    requires: "plum-wolves",
    npc: "hunter",
    repeatTicks: 0,
  },
  {
    id: "watch-boss",
    mapId: "highlands",
    name: "Chặn đường Hắc Phong",
    chapter: "NGOẠI VỰC",
    description:
      "Hạ thủ lĩnh tại Hắc Phong Tiền Tiêu ở cuối sơn lộ. Né vùng chấn động và xử lý thuộc hạ.",
    objectiveKind: "kill",
    target: "boss",
    count: 1,
    exp: 500,
    gold: 300,
    rewardItem: "sword",
    requires: "shrine-route",
    npc: "hunter",
    repeatTicks: 0,
  },
);
export interface MapProp {
  type: "house" | "tree" | "cherry" | "rock" | "lantern" | "bamboo" | "gate";
  x: number;
  y: number;
  variant?: number;
}
export interface MapDefinition {
  id: string;
  name: string;
  subtitle: string;
  width: number;
  height: number;
  spawn: { x: number; y: number };
  palette: "village" | "forest" | "camp";
  areas?: {
    id: string;
    name: string;
    x: number;
    y: number;
    radius: number;
    kind: "safe" | "combat" | "resource" | "explore" | "boss";
    level: number;
  }[];
  paths?: { x: number; y: number }[][];
  water?: { x: number; y: number }[];
  bridges?: { x: number; y: number }[];
  spawnZones?: SpawnZoneDefinition[];
  maxMonsters?: number;
  props: MapProp[];
  blocked: { x: number; y: number }[];
  spawns: { monsterId: string; x: number; y: number }[];
  portals: {
    id: string;
    name: string;
    x: number;
    y: number;
    to: string;
    destination: { x: number; y: number };
  }[];
}
export interface SpawnZoneDefinition {
  id: string;
  area:
    | { kind: "circle"; x: number; y: number; radius: number }
    | { kind: "polygon"; points: { x: number; y: number }[] };
  pool: { monsterId: string; weight: number }[];
  minPopulation: number;
  maxPopulation: number;
  density: number;
  respawnTicks: [number, number];
  levels: { level: number; weight: number }[];
  eliteChance: number;
  activationRadius: number;
}
const villageProps: MapProp[] = [
  { type: "house", x: 7, y: 8, variant: 0 },
  { type: "house", x: 18, y: 8, variant: 1 },
  { type: "house", x: 6, y: 18, variant: 2 },
  { type: "house", x: 20, y: 17, variant: 0 },
  { type: "gate", x: 21, y: 22 },
  { type: "cherry", x: 11, y: 7 },
  { type: "cherry", x: 6, y: 12 },
  { type: "cherry", x: 18, y: 21 },
  { type: "tree", x: 3, y: 10 },
  { type: "tree", x: 22, y: 9 },
  { type: "tree", x: 8, y: 22 },
  { type: "lantern", x: 10, y: 11 },
  { type: "lantern", x: 16, y: 11 },
  { type: "lantern", x: 10, y: 17 },
  { type: "lantern", x: 16, y: 17 },
];
const forestProps: MapProp[] = [];
for (let y = 2; y < 27; y += 4)
  for (let x = 2; x < 27; x += 4)
    if (Math.abs(x - y) > 3)
      forestProps.push({ type: (x + y) % 3 === 0 ? "tree" : "bamboo", x, y });
const campProps: MapProp[] = [
  { type: "gate", x: 14, y: 10 },
  { type: "house", x: 7, y: 7, variant: 2 },
  { type: "house", x: 22, y: 10, variant: 2 },
];
for (let i = 2; i < 27; i += 3)
  campProps.push(
    { type: "rock", x: i, y: 3 },
    { type: "rock", x: 3, y: i },
    { type: "rock", x: 27, y: i },
  );
function blocked(props: MapProp[]) {
  return props.flatMap((p) =>
    p.type === "house"
      ? Array.from({ length: 12 }, (_, i) => ({
          x: p.x - 1 + (i % 4),
          y: p.y - 1 + Math.floor(i / 4),
        }))
      : ["tree", "cherry", "bamboo", "rock"].includes(p.type)
        ? [{ x: p.x, y: p.y }]
        : [],
  );
}
export const maps: MapDefinition[] = [
  {
    id: "village",
    name: "Tân Thủ Thôn",
    subtitle: "Nơi hành trình bắt đầu",
    width: 30,
    height: 30,
    spawn: { x: 14, y: 14 },
    palette: "village",
    props: villageProps,
    blocked: [
      ...blocked(villageProps),
      ...Array.from({ length: 36 }, (_, i) => ({
        x: 1 + (i % 3),
        y: 17 + Math.floor(i / 3),
      })),
    ],
    spawns: [
      { monsterId: "bandit", x: 22, y: 20 },
      { monsterId: "bandit", x: 24, y: 23 },
      { monsterId: "bandit", x: 23, y: 17 },
      { monsterId: "bandit", x: 19, y: 24 },
      { monsterId: "bandit", x: 26, y: 19 },
    ],
    portals: [
      {
        id: "forest",
        name: "Thanh Trúc Lâm",
        x: 23,
        y: 25,
        to: "forest",
        destination: { x: 5, y: 5 },
      },
    ],
  },
  {
    id: "forest",
    name: "Thanh Trúc Lâm",
    subtitle: "Gió trúc gọi người lữ khách",
    width: 30,
    height: 30,
    spawn: { x: 5, y: 5 },
    palette: "forest",
    props: forestProps,
    blocked: blocked(forestProps),
    spawns: [
      { monsterId: "bandit", x: 10, y: 12 },
      { monsterId: "wolf", x: 14, y: 13 },
      { monsterId: "wolf", x: 17, y: 17 },
      { monsterId: "wolf", x: 20, y: 19 },
      { monsterId: "wolf", x: 21, y: 23 },
      { monsterId: "archer", x: 23, y: 15 },
      { monsterId: "viper", x: 12, y: 19 },
    ],
    portals: [
      {
        id: "village",
        name: "Tân Thủ Thôn",
        x: 4,
        y: 4,
        to: "village",
        destination: { x: 22, y: 24 },
      },
      {
        id: "camp",
        name: "Hắc Phong Trại",
        x: 25,
        y: 25,
        to: "camp",
        destination: { x: 7, y: 22 },
      },
    ],
  },
  {
    id: "camp",
    name: "Hắc Phong Trại",
    subtitle: "Một kiếm định giang hồ",
    width: 30,
    height: 30,
    spawn: { x: 7, y: 22 },
    palette: "camp",
    props: campProps,
    blocked: blocked(campProps),
    spawns: [
      { monsterId: "bandit", x: 11, y: 19 },
      { monsterId: "bandit", x: 19, y: 20 },
      { monsterId: "wolf", x: 21, y: 16 },
      { monsterId: "boss", x: 16, y: 14 },
      { monsterId: "assassin", x: 24, y: 20 },
      { monsterId: "archer", x: 12, y: 15 },
    ],
    portals: [
      {
        id: "forest",
        name: "Thanh Trúc Lâm",
        x: 6,
        y: 24,
        to: "forest",
        destination: { x: 24, y: 24 },
      },
    ],
  },
];
maps.push(highlands);
maps.push(riverlands);
highlands.portals.push({
  id: "riverlands",
  name: "Vân Khê Sơn Dã · Cấp 4–9",
  x: 22,
  y: 20,
  to: "riverlands",
  destination: { x: 22, y: 27 },
});
maps[0].portals.push({
  id: "highlands",
  name: "Thanh Sơn Ngoại Vực",
  x: 26,
  y: 13,
  to: "highlands",
  destination: { x: 16, y: 17 },
});
maps.push(thanhvanson);
riverlands.portals.push({
  id: "thanhvanson",
  name: "Thanh Vân Sơn · Cấp 9–16",
  x: 57,
  y: 41,
  to: "thanhvanson",
  destination: { x: 34, y: 288 },
});
export { highlandAreas, segmentDistance } from "./highlands";
export { riverlandAreas } from "./riverlands";
export { thanhvansonAreas } from "./thanhvanson";
npcs.push(
  {
    id: "river-scout",
    name: "Đỗ tuần khê",
    role: "Nhiệm vụ",
    mapId: "riverlands",
    x: 24,
    y: 26,
    appearance: "elder",
    dialogue:
      "Ba cầu là lối qua dòng Vân Khê. Hãy khảo sát Cầu Mây trước khi tiến sâu; phía đông có đồn cung thủ, phía nam là cổ trại.",
  },
  {
    id: "reed-herbalist",
    name: "Lau dược bà",
    role: "Thảo dược",
    mapId: "riverlands",
    x: 91,
    y: 123,
    appearance: "female",
    dialogue:
      "Sói xuống khe, độc xà chiếm bờ đông. Mang Linh Thảo về đây, ta sẽ giúp thiếu hiệp chuẩn bị trước trận ở cổ trại.",
  },
);
quests.push(
  {
    id: "river-bridge",
    name: "Dò đường Cầu Mây",
    chapter: "VÂN KHÊ",
    description:
      "Từ Trạm Vân Khê theo đường đất đến Cầu Mây. Dòng sông chỉ có thể qua ở ba cây cầu.",
    objectiveKind: "explore",
    target: "river-crossing",
    count: 1,
    exp: 170,
    gold: 100,
    rewardItem: "hp",
    requires: null,
    npc: "river-scout",
    repeatTicks: 0,
    mapId: "riverlands",
  },
  {
    id: "river-wolves",
    name: "Dẹp đàn sói Khe Lang",
    chapter: "VÂN KHÊ",
    description:
      "Giữ an toàn đường tiếp tế phía tây, hạ 12 sói ở Khe Lang hoặc Mai Trang Hoang rồi báo Lau dược bà.",
    objectiveKind: "kill",
    target: "wolf",
    count: 12,
    exp: 280,
    gold: 160,
    rewardItem: "mp",
    requires: "river-bridge",
    npc: "reed-herbalist",
    repeatTicks: 3600,
    mapId: "riverlands",
  },
  {
    id: "river-antidote",
    name: "Thuốc cho người qua khe",
    chapter: "VÂN KHÊ",
    description:
      "Nhặt 12 Linh Thảo do độc xà đánh rơi tại Vân Khê để chuẩn bị thuốc giải.",
    objectiveKind: "collect",
    target: "herb",
    count: 12,
    exp: 240,
    gold: 140,
    rewardItem: "hp",
    requires: "river-bridge",
    npc: "reed-herbalist",
    repeatTicks: 3600,
    mapId: "riverlands",
  },
  {
    id: "river-fort",
    name: "Phá Cổ Trại Vân Khê",
    chapter: "VÂN KHÊ",
    description:
      "Tìm ba cầu, vòng xuống phía nam và hạ thủ lĩnh ở Cổ Trại. Thuộc hạ cùng cung thủ bảo vệ lối vào.",
    objectiveKind: "kill",
    target: "boss",
    count: 1,
    exp: 650,
    gold: 380,
    rewardItem: "ore",
    requires: "river-wolves",
    npc: "river-scout",
    repeatTicks: 0,
    mapId: "riverlands",
  },
);
for (const [id, x, y, kind, itemId, name] of [
  ["river-bamboo", 57, 51, "logging", "wood", "Trúc Vân Khê"],
  ["river-ore", 217, 82, "mining", "ore", "Thiết Sa"],
  ["river-herb", 151, 126, "herbalism", "herb", "Độc Thảo Ven Sông"],
  ["river-garden", 41, 169, "herbalism", "herb", "Linh Thảo Mai Trang"],
  ["river-reeds", 87, 123, "logging", "wood", "Gỗ Trạm Lau"],
] as const)
  resourceNodes.push({
    id,
    x,
    y,
    kind,
    itemId,
    name,
    mapId: "riverlands",
    quantity: 3,
    respawnTicks: 1600,
    requiredLevel: 1,
  });
// ---------------------------------------------------------------------------
// Nội dung Thanh Vân Sơn (cấp 9–16): kỹ năng quái, quái, vật phẩm, NPC,
// nhiệm vụ và tài nguyên. Đây là nội dung chơi thật của bản đồ 320×320.
// ---------------------------------------------------------------------------
/** Kỹ năng chỉ quái dùng; không gắn classId nên không xuất hiện trong bảng phái. */
skills.push(
  ...[
    {
      id: "mon-venom-bolt",
      name: "Độc Tiễn",
      icon: "lightning",
      kind: "projectile",
      cooldownTicks: 90,
      manaCost: 6,
      range: 6,
      power: 0.9,
      requiredLevel: 1,
      maxLevel: 1,
      projectileSpeed: 7,
      effects: [
        { kind: "poison", durationTicks: 60, magnitude: 0.06, intervalTicks: 20 },
      ],
      description: "Bắn mũi độc gây sát thương và nhiễm độc theo thời gian.",
    },
    {
      id: "mon-stone-crush",
      name: "Thạch Toái",
      icon: "sword",
      kind: "melee",
      cooldownTicks: 120,
      manaCost: 8,
      range: 1.8,
      power: 1.4,
      requiredLevel: 1,
      maxLevel: 1,
      effects: [{ kind: "armorBreak", durationTicks: 80, magnitude: 0.25 }],
      description: "Đập mạnh làm giảm phòng ngự mục tiêu.",
    },
    {
      id: "mon-thunder-cry",
      name: "Lôi Minh",
      icon: "lightning",
      kind: "line",
      cooldownTicks: 150,
      manaCost: 10,
      range: 6,
      power: 1.2,
      requiredLevel: 1,
      maxLevel: 1,
      element: "metal",
      effects: [{ kind: "stun", durationTicks: 18, magnitude: 1 }],
      description: "Phóng tia sét làm choáng mục tiêu trong chốc lát.",
    },
  ].map((s) => skillSchema.parse(s)),
);
monsters.push(
  {
    id: "mist-wolf",
    name: "Vân Lang",
    brain: "pack",
    skillIds: [],
    bossMechanic: null,
    level: 9,
    hp: 210,
    attack: 26,
    defense: 8,
    element: "wood",
    exp: 130,
    gold: 55,
    detect: 6,
    range: 1.3,
    respawn: 420,
    speed: 2.4,
    loot: [
      { itemId: "moon-herb", chance: 0.5 },
      { itemId: "beast-hide", chance: 0.3 },
      { itemId: "mist-treads", chance: 0.06 },
    ],
  },
  {
    id: "stone-ape",
    name: "Thạch Viên",
    brain: "melee",
    skillIds: ["mon-stone-crush"],
    bossMechanic: null,
    level: 10,
    hp: 420,
    attack: 30,
    defense: 18,
    element: "earth",
    exp: 170,
    gold: 70,
    detect: 4.5,
    range: 1.7,
    respawn: 520,
    speed: 1.3,
    loot: [
      { itemId: "jade-ore", chance: 0.4 },
      { itemId: "spirit-wood", chance: 0.3 },
      { itemId: "bamboo-hat", chance: 0.07 },
    ],
  },
  {
    id: "cloud-archer",
    name: "Vân Tiễn Thủ",
    brain: "ranged",
    skillIds: [],
    bossMechanic: null,
    level: 10,
    hp: 240,
    attack: 28,
    defense: 9,
    element: "wood",
    exp: 150,
    gold: 62,
    detect: 8,
    range: 6,
    respawn: 440,
    speed: 1.9,
    loot: [
      { itemId: "spirit-wood", chance: 0.5 },
      { itemId: "cloud-silk", chance: 0.3 },
      { itemId: "bamboo-robe", chance: 0.07 },
    ],
  },
  {
    id: "shadow-blade",
    name: "Ảnh Đao Khách",
    brain: "assassin",
    skillIds: [],
    bossMechanic: null,
    level: 11,
    hp: 260,
    attack: 34,
    defense: 10,
    element: "fire",
    exp: 175,
    gold: 72,
    detect: 7,
    range: 1.4,
    respawn: 460,
    speed: 3,
    loot: [
      { itemId: "storm-iron", chance: 0.3 },
      { itemId: "beast-hide", chance: 0.35 },
      { itemId: "wolf-fang", chance: 0.05 },
    ],
  },
  {
    id: "venom-moth",
    name: "Độc Nga",
    brain: "poison",
    skillIds: ["mon-venom-bolt"],
    bossMechanic: null,
    level: 11,
    hp: 200,
    attack: 24,
    defense: 8,
    element: "wood",
    exp: 165,
    gold: 68,
    detect: 6,
    range: 5,
    respawn: 430,
    speed: 2.1,
    loot: [
      { itemId: "moon-herb", chance: 0.6 },
      { itemId: "cloud-silk", chance: 0.35 },
      { itemId: "jade-pendant", chance: 0.04 },
    ],
  },
  {
    id: "thunder-crane",
    name: "Lôi Hạc",
    brain: "ranged",
    skillIds: ["mon-thunder-cry"],
    bossMechanic: null,
    level: 12,
    hp: 280,
    attack: 36,
    defense: 12,
    element: "metal",
    exp: 200,
    gold: 80,
    detect: 9,
    range: 6.5,
    respawn: 480,
    speed: 2.6,
    loot: [
      { itemId: "storm-iron", chance: 0.45 },
      { itemId: "cloud-silk", chance: 0.3 },
      { itemId: "thunder-helm", chance: 0.03 },
    ],
  },
  {
    id: "bandit-lord",
    name: "Sơn tặc thủ lĩnh",
    brain: "pack",
    skillIds: [],
    bossMechanic: null,
    level: 12,
    hp: 380,
    attack: 38,
    defense: 14,
    element: "fire",
    exp: 210,
    gold: 95,
    detect: 6,
    range: 1.6,
    respawn: 520,
    speed: 1.8,
    loot: [
      { itemId: "cloud-silk", chance: 0.5 },
      { itemId: "jade-ore", chance: 0.4 },
      { itemId: "scale-mail", chance: 0.05 },
    ],
  },
  {
    id: "jade-serpent",
    name: "Bích Xà",
    brain: "poison",
    skillIds: ["mon-venom-bolt"],
    bossMechanic: null,
    level: 13,
    hp: 320,
    attack: 40,
    defense: 13,
    element: "water",
    exp: 220,
    gold: 88,
    detect: 5,
    range: 1.6,
    respawn: 500,
    speed: 2.2,
    loot: [
      { itemId: "jade-ore", chance: 0.55 },
      { itemId: "moon-herb", chance: 0.35 },
      { itemId: "jade-crown", chance: 0.04 },
    ],
  },
  {
    id: "storm-drummer",
    name: "Lôi Cổ Sư",
    brain: "pack",
    skillIds: ["mon-thunder-cry"],
    bossMechanic: null,
    level: 14,
    hp: 300,
    attack: 42,
    defense: 15,
    element: "metal",
    exp: 250,
    gold: 105,
    detect: 7,
    range: 4.5,
    respawn: 560,
    speed: 1.7,
    loot: [
      { itemId: "storm-iron", chance: 0.6 },
      { itemId: "jade-ore", chance: 0.3 },
      { itemId: "cloud-ring", chance: 0.03 },
    ],
  },
  {
    id: "cloud-beast",
    name: "Vân Sơn Yêu Vương",
    brain: "boss",
    skillIds: ["mon-thunder-cry"],
    bossMechanic: "storm",
    level: 16,
    hp: 2400,
    attack: 58,
    defense: 24,
    element: "water",
    exp: 900,
    gold: 900,
    detect: 8,
    range: 2.4,
    respawn: 2600,
    speed: 1.6,
    loot: [
      { itemId: "cloud-blade", chance: 1 },
      { itemId: "summit-robe", chance: 0.6 },
      { itemId: "dragon-seal", chance: 0.4 },
      { itemId: "storm-iron", chance: 1 },
    ],
  },
);
items.push(
  ...[
    {
      id: "pine-blade",
      name: "Tùng Phong Kiếm",
      kind: "weapon",
      icon: "sword",
      rarity: "rare",
      stack: 1,
      price: 900,
      level: 9,
      requiredLevel: 9,
      attack: 22,
      description: "Kiếm rèn từ thép rừng tùng, lưỡi mỏng mà bền.",
    },
    {
      id: "cloud-spear",
      name: "Vân Ảnh Thương",
      kind: "weapon",
      icon: "sword",
      rarity: "epic",
      stack: 1,
      price: 2100,
      level: 12,
      requiredLevel: 12,
      attack: 34,
      description: "Thương dài phủ mây, thích hợp đánh xa trong sương.",
    },
    {
      id: "thunder-saber",
      name: "Lôi Đình Đao",
      kind: "weapon",
      icon: "sword",
      rarity: "epic",
      stack: 1,
      price: 3200,
      level: 14,
      requiredLevel: 14,
      attack: 40,
      maxMp: 20,
      description: "Đao khắc phù lôi văn, mỗi nhát chém vang như sấm.",
    },
    {
      id: "jade-fan",
      name: "Bích Ngọc Phiến",
      kind: "weapon",
      icon: "sword",
      rarity: "legendary",
      stack: 1,
      price: 5200,
      level: 15,
      requiredLevel: 15,
      attack: 48,
      maxMp: 40,
      description: "Quạt ngọc của ẩn sĩ Thanh Vân, vừa công vừa dưỡng khí.",
    },
    {
      id: "cloud-blade",
      name: "Vân Long Kiếm",
      kind: "weapon",
      icon: "sword",
      rarity: "mythic",
      stack: 1,
      price: 9000,
      level: 16,
      requiredLevel: 16,
      attack: 60,
      maxHp: 120,
      description: "Bảo kiếm lấy từ Vân Sơn Yêu Vương; thân kiếm như mây cuộn.",
    },
    {
      id: "bamboo-robe",
      name: "Trúc Lâm Bào",
      kind: "armor",
      icon: "robe",
      rarity: "uncommon",
      stack: 1,
      price: 700,
      level: 9,
      requiredLevel: 9,
      defense: 12,
      description: "Áo dệt từ trúc non, nhẹ và dai.",
    },
    {
      id: "scale-mail",
      name: "Vân Giáp",
      kind: "armor",
      icon: "robe",
      rarity: "rare",
      stack: 1,
      price: 1500,
      level: 11,
      requiredLevel: 11,
      defense: 20,
      maxHp: 60,
      description: "Giáp vảy xếp lớp, chịu được đòn của thú lớn.",
    },
    {
      id: "jade-plate",
      name: "Ngọc Lân Giáp",
      kind: "armor",
      icon: "robe",
      rarity: "epic",
      stack: 1,
      price: 2800,
      level: 13,
      requiredLevel: 13,
      defense: 28,
      maxHp: 90,
      description: "Giáp khảm ngọc khoáng Ngọc Khoáng Động.",
    },
    {
      id: "summit-robe",
      name: "Vân Đỉnh Đạo Bào",
      kind: "armor",
      icon: "robe",
      rarity: "legendary",
      stack: 1,
      price: 4600,
      level: 15,
      requiredLevel: 15,
      defense: 34,
      maxHp: 140,
      description: "Đạo bào của người từng đứng trên Vân Đỉnh.",
    },
    {
      id: "mist-treads",
      name: "Mê Vụ Ngoa",
      kind: "boots",
      icon: "boots",
      rarity: "uncommon",
      stack: 1,
      price: 500,
      level: 9,
      requiredLevel: 9,
      defense: 8,
      description: "Giày bện cỏ sương, đi trong Mê Vụ Lâm không trượt.",
    },
    {
      id: "cliff-boots",
      name: "Vọng Nhai Ngoa",
      kind: "boots",
      icon: "boots",
      rarity: "rare",
      stack: 1,
      price: 1300,
      level: 12,
      requiredLevel: 12,
      defense: 14,
      description: "Giày bám đá của người canh vách đá.",
    },
    {
      id: "wind-boots",
      name: "Truy Phong Ngoa",
      kind: "boots",
      icon: "boots",
      rarity: "epic",
      stack: 1,
      price: 2400,
      level: 14,
      requiredLevel: 14,
      defense: 18,
      maxHp: 40,
      description: "Giày nhẹ như gió, bước nhanh mà vẫn vững.",
    },
    {
      id: "bamboo-hat",
      name: "Trúc Lạp Mạo",
      kind: "helmet",
      icon: "robe",
      rarity: "uncommon",
      stack: 1,
      price: 420,
      level: 9,
      requiredLevel: 9,
      defense: 6,
      description: "Nón lá trúc che mưa nắng đường dài.",
    },
    {
      id: "jade-crown",
      name: "Ngọc Quan",
      kind: "helmet",
      icon: "robe",
      rarity: "rare",
      stack: 1,
      price: 1400,
      level: 12,
      requiredLevel: 12,
      defense: 12,
      maxMp: 20,
      description: "Mũ ngọc giúp giữ tâm thần tĩnh lặng.",
    },
    {
      id: "thunder-helm",
      name: "Lôi Văn Khôi",
      kind: "helmet",
      icon: "robe",
      rarity: "epic",
      stack: 1,
      price: 2600,
      level: 14,
      requiredLevel: 14,
      defense: 16,
      description: "Mũ trụ khắc vân sấm, chống choáng tốt hơn.",
    },
    {
      id: "jade-pendant",
      name: "Bích Ngọc Bội",
      kind: "accessory",
      icon: "gem",
      rarity: "rare",
      stack: 1,
      price: 1100,
      level: 10,
      requiredLevel: 10,
      defense: 5,
      maxMp: 25,
      description: "Ngọc bội hộ thân, tăng nội lực.",
    },
    {
      id: "wolf-fang",
      name: "Lang Nha Hoàn",
      kind: "accessory",
      icon: "gem",
      rarity: "rare",
      stack: 1,
      price: 1200,
      level: 11,
      requiredLevel: 11,
      attack: 8,
      description: "Vòng nanh sói, nhắc kẻ mang nó về bầy đàn.",
    },
    {
      id: "cloud-ring",
      name: "Vân Văn Giới",
      kind: "accessory",
      icon: "gem",
      rarity: "epic",
      stack: 1,
      price: 2500,
      level: 13,
      requiredLevel: 13,
      attack: 12,
      maxHp: 50,
      description: "Nhẫn khắc mây, hợp người luyện nội công.",
    },
    {
      id: "dragon-seal",
      name: "Long Ấn",
      kind: "accessory",
      icon: "gem",
      rarity: "legendary",
      stack: 1,
      price: 4800,
      level: 15,
      requiredLevel: 15,
      attack: 16,
      defense: 10,
      maxHp: 80,
      description: "Ấn rồng lấy từ đỉnh Vân Sơn, cân bằng công thủ.",
    },
    {
      id: "hp-great",
      name: "Đại Hoàn Đan",
      kind: "consumable",
      icon: "potion-red",
      rarity: "uncommon",
      stack: 99,
      price: 60,
      level: 9,
      restore: "hp",
      description: "Hồi 65% sinh lực. Dùng được từ cấp 9.",
    },
    {
      id: "mp-great",
      name: "Đại Tụ Khí Đan",
      kind: "consumable",
      icon: "potion-blue",
      rarity: "uncommon",
      stack: 99,
      price: 55,
      level: 9,
      restore: "mp",
      description: "Hồi 65% nội lực. Dùng được từ cấp 9.",
    },
    {
      id: "antidote",
      name: "Giải Độc Tán",
      kind: "consumable",
      icon: "potion-red",
      rarity: "common",
      stack: 99,
      price: 30,
      level: 9,
      restore: "hp",
      description: "Bột giải độc, hồi nhẹ sinh lực khi trúng độc.",
    },
    {
      id: "elixir",
      name: "Vân Tâm Đan",
      kind: "consumable",
      icon: "potion-red",
      rarity: "rare",
      stack: 99,
      price: 180,
      level: 12,
      restore: "hp",
      description: "Linh đan của Thanh Vân, hồi 75% sinh lực.",
    },
    {
      id: "revive-pill",
      name: "Hồi Hồn Đan",
      kind: "consumable",
      icon: "potion-red",
      rarity: "epic",
      stack: 20,
      price: 400,
      level: 14,
      restore: "hp",
      description: "Đan quý cứu người giữa vòng vây, hồi 90% sinh lực.",
    },
    {
      id: "jade-ore",
      name: "Ngọc Thạch",
      kind: "material",
      icon: "gem",
      rarity: "rare",
      stack: 99,
      price: 60,
      level: 9,
      description: "Khoáng ngọc thô trong Ngọc Khoáng Động, dùng chế trang bị.",
    },
    {
      id: "cloud-silk",
      name: "Vân Ti",
      kind: "material",
      icon: "herb",
      rarity: "uncommon",
      stack: 99,
      price: 40,
      level: 9,
      description: "Tơ mềm hái ở bờ hồ, dệt được đạo bào.",
    },
    {
      id: "storm-iron",
      name: "Lôi Thiết",
      kind: "material",
      icon: "gem",
      rarity: "epic",
      stack: 99,
      price: 150,
      level: 12,
      description: "Sắt nhiễm sét ở Đông Lĩnh, nguyên liệu trang bị cao cấp.",
    },
    {
      id: "spirit-wood",
      name: "Linh Mộc",
      kind: "material",
      icon: "herb",
      rarity: "uncommon",
      stack: 99,
      price: 45,
      level: 10,
      description: "Gỗ thơm của Cổ Mộc Lâm, còn giữ khí trời.",
    },
    {
      id: "moon-herb",
      name: "Nguyệt Thảo",
      kind: "material",
      icon: "herb",
      rarity: "uncommon",
      stack: 99,
      price: 35,
      level: 9,
      description: "Cỏ chỉ nở về đêm, nguyên liệu luyện đan.",
    },
    {
      id: "beast-hide",
      name: "Yêu Thú Bì",
      kind: "material",
      icon: "herb",
      rarity: "rare",
      stack: 99,
      price: 70,
      level: 11,
      description: "Da dày của thú núi, thuộc được thành giáp.",
    },
    {
      id: "enhance-stone",
      name: "Đá Cường Hóa",
      kind: "material",
      icon: "gem",
      rarity: "rare",
      stack: 50,
      price: 180,
      level: 9,
      description: "Đá dùng cho công thức rèn cấp cao ở tiền tiêu.",
    },
    {
      id: "jade-gem-deep",
      name: "Bích Hải Ngọc",
      kind: "gem",
      icon: "gem",
      rarity: "epic",
      stack: 20,
      price: 520,
      level: 12,
      gemStats: { attack: 8, defense: 0 },
      description: "Khảm vào trang bị để tăng 8 công kích.",
    },
    {
      id: "amber-gem-deep",
      name: "Hổ Phách Tinh",
      kind: "gem",
      icon: "gem",
      rarity: "epic",
      stack: 20,
      price: 540,
      level: 12,
      gemStats: { attack: 0, defense: 6 },
      description: "Khảm vào trang bị để tăng 6 phòng ngự.",
    },
  ].map((i) => itemSchema.parse(i)),
);
recipes.push(
  {
    id: "forge-pine-blade",
    name: "Rèn Tùng Phong Kiếm",
    profession: "weaponsmith",
    requiredLevel: 2,
    station: "smith",
    gold: 260,
    materials: [
      { itemId: "ore", quantity: 4 },
      { itemId: "jade-ore", quantity: 2 },
      { itemId: "spirit-wood", quantity: 3 },
    ],
    output: { itemId: "pine-blade", quantity: 1 },
    experience: 60,
  },
  {
    id: "forge-jade-plate",
    name: "Chế Ngọc Lân Giáp",
    profession: "armorer",
    requiredLevel: 4,
    station: "smith",
    gold: 420,
    materials: [
      { itemId: "storm-iron", quantity: 3 },
      { itemId: "beast-hide", quantity: 4 },
      { itemId: "cloud-silk", quantity: 4 },
    ],
    output: { itemId: "jade-plate", quantity: 1 },
    experience: 95,
  },
  {
    id: "brew-elixir",
    name: "Luyện Vân Tâm Đan",
    profession: "alchemy",
    requiredLevel: 2,
    station: "merchant",
    gold: 90,
    materials: [
      { itemId: "moon-herb", quantity: 3 },
      { itemId: "cloud-silk", quantity: 1 },
    ],
    output: { itemId: "elixir", quantity: 2 },
    experience: 45,
  },
  {
    id: "cut-jade-deep",
    name: "Mài Bích Hải Ngọc",
    profession: "jeweler",
    requiredLevel: 3,
    station: "smith",
    gold: 160,
    materials: [
      { itemId: "jade-ore", quantity: 3 },
      { itemId: "enhance-stone", quantity: 1 },
    ],
    output: { itemId: "jade-gem-deep", quantity: 1 },
    experience: 70,
  },
);
npcs.push(
  {
    id: "tv-master",
    name: "Thanh Vân Chưởng Môn",
    role: "Sư phụ",
    mapId: "thanhvanson",
    x: 44,
    y: 276,
    appearance: "elder",
    dialogue:
      "Sơn môn này mở cho kẻ có chí. Luyện tới khi đủ sức lên Vân Đỉnh rồi hãy nói chuyện tiếp.",
  },
  {
    id: "tv-smith",
    name: "Lò rèn tiền tiêu",
    role: "Trang bị",
    mapId: "thanhvanson",
    x: 28,
    y: 280,
    appearance: "smith",
    service: "smith",
    dialogue:
      "Lửa lò ở đây không tắt. Đem nguyên liệu tới, ta rèn cho ngươi món vừa tay.",
  },
  {
    id: "tv-merchant",
    name: "Tiệm thuốc tiền tiêu",
    role: "Dược phẩm",
    mapId: "thanhvanson",
    x: 36,
    y: 280,
    appearance: "female",
    service: "merchant",
    dialogue:
      "Đường lên Vân Đỉnh dài lắm. Mang đủ đan dược rồi hãy đi, đừng tiếc bạc.",
  },
  {
    id: "tv-quartermaster",
    name: "Quản kho tiền tiêu",
    role: "Kho đồ",
    mapId: "thanhvanson",
    x: 22,
    y: 284,
    appearance: "elder",
    service: "elder",
    dialogue:
      "Đồ quý thì gửi kho, đừng vác hết lên núi. Ta giữ giúp ngươi, mất mát tự chịu.",
  },
  {
    id: "tv-ferryman",
    name: "Lão đưa đò",
    role: "Dẫn đường",
    mapId: "thanhvanson",
    x: 168,
    y: 126,
    appearance: "elder",
    dialogue:
      "Hồ Vân sâu lắm, đừng lội. Đi theo Cầu Đá Vân mà sang bờ đông, qua Vân Hồ Từ rồi hẵng lên núi.",
  },
  {
    id: "tv-prospector",
    name: "Lão khoáng",
    role: "Nhiệm vụ",
    mapId: "thanhvanson",
    x: 64,
    y: 222,
    appearance: "smith",
    dialogue:
      "Trong động có ngọc, cũng có rắn. Ngươi muốn ngọc thì đuổi rắn trước đã.",
  },
  {
    id: "tv-shrine-keeper",
    name: "Từ chủ Vân Hồ",
    role: "Nhiệm vụ",
    mapId: "thanhvanson",
    x: 240,
    y: 228,
    appearance: "elder",
    dialogue:
      "Miếu này thờ người giữ núi. Lễ vật không cần vàng bạc, chỉ cần lòng thành.",
  },
);
quests.push(
  {
    id: "tv-scout",
    name: "Dấu chân trong sương",
    chapter: "Chương IV · Thanh Vân Sơn",
    description:
      "Chưởng môn cần biết vì sao đàn Vân Lang kéo xuống tận sơn môn. Dẹp sáu con đầu đàn.",
    objectiveKind: "kill",
    target: "mist-wolf",
    count: 6,
    exp: 320,
    gold: 260,
    rewardItem: "mist-treads",
    requires: null,
    npc: "tv-master",
    repeatTicks: 0,
    mapId: "thanhvanson",
  },
  {
    id: "tv-pass",
    name: "Đèo Tùng Phong",
    chapter: "Chương IV · Thanh Vân Sơn",
    description:
      "Đá lở chặn đèo vì Thạch Viên đập phá. Hạ năm con để mở lại lối lên bắc.",
    objectiveKind: "kill",
    target: "stone-ape",
    count: 5,
    exp: 420,
    gold: 330,
    rewardItem: "bamboo-hat",
    requires: "tv-scout",
    npc: "tv-master",
    repeatTicks: 0,
    mapId: "thanhvanson",
  },
  {
    id: "tv-boss",
    name: "Yêu vương Vân Đỉnh",
    chapter: "Chương IV · Thanh Vân Sơn",
    description:
      "Vân Sơn Yêu Vương chiếm đỉnh núi. Chỉ khi hạ được nó, con đường lên Vân Đỉnh mới yên.",
    objectiveKind: "kill",
    target: "cloud-beast",
    count: 1,
    exp: 1400,
    gold: 1200,
    rewardItem: "summit-robe",
    requires: "tv-pass",
    npc: "tv-master",
    repeatTicks: 0,
    mapId: "thanhvanson",
  },
  {
    id: "tv-bridge",
    name: "Cầu Đá Vân",
    chapter: "Nhiệm vụ khu vực · Thanh Vân Sơn",
    description:
      "Lão đưa đò muốn biết cây cầu đá còn vững. Hãy tới tận nơi xem xét.",
    objectiveKind: "explore",
    target: "stone-bridge",
    count: 1,
    exp: 180,
    gold: 150,
    rewardItem: "cloud-silk",
    requires: null,
    npc: "tv-ferryman",
    repeatTicks: 0,
    mapId: "thanhvanson",
  },
  {
    id: "tv-shrine",
    name: "Lễ ở Vân Hồ Từ",
    chapter: "Nhiệm vụ khu vực · Thanh Vân Sơn",
    description: "Từ chủ nhờ mang lời cầu an tới miếu cổ bên bờ đông hồ Vân.",
    objectiveKind: "explore",
    target: "sky-shrine",
    count: 1,
    exp: 200,
    gold: 160,
    rewardItem: "jade-pendant",
    requires: "tv-bridge",
    npc: "tv-shrine-keeper",
    repeatTicks: 0,
    mapId: "thanhvanson",
  },
  {
    id: "tv-serpent",
    name: "Rắn trong mỏ ngọc",
    chapter: "Nhiệm vụ khu vực · Thanh Vân Sơn",
    description:
      "Bích Xà ẩn trong Ngọc Khoáng Động. Dẹp sáu con để thợ mỏ quay lại làm việc.",
    objectiveKind: "kill",
    target: "jade-serpent",
    count: 6,
    exp: 480,
    gold: 380,
    rewardItem: "jade-crown",
    requires: null,
    npc: "tv-prospector",
    repeatTicks: 0,
    mapId: "thanhvanson",
  },
  {
    id: "tv-mine",
    name: "Ngọc thô trong đá",
    chapter: "Nghề nghiệp · Khai khoáng",
    description: "Lão khoáng cần bốn khối Ngọc Thạch để thử lò rèn tiền tiêu.",
    objectiveKind: "collect",
    target: "jade-ore",
    count: 4,
    exp: 260,
    gold: 220,
    rewardItem: "enhance-stone",
    requires: "tv-serpent",
    npc: "tv-prospector",
    repeatTicks: 0,
    mapId: "thanhvanson",
  },
  {
    id: "tv-craft",
    name: "Lò rèn tiền tiêu",
    chapter: "Nghề nghiệp · Rèn vũ khí",
    description:
      "Quản kho muốn một thanh Tùng Phong Kiếm do chính tay ngươi rèn ở tiền tiêu.",
    objectiveKind: "craft",
    target: "forge-pine-blade",
    count: 1,
    exp: 300,
    gold: 260,
    rewardItem: "jade-ore",
    requires: "tv-mine",
    npc: "tv-quartermaster",
    repeatTicks: 0,
    mapId: "thanhvanson",
  },
  {
    id: "tv-gear",
    name: "Mặc giáp lên núi",
    chapter: "Nhiệm vụ khu vực · Thanh Vân Sơn",
    description:
      "Không ai lên Vân Đỉnh với áo vải. Trang bị Tùng Phong Kiếm rồi hãy quay lại.",
    objectiveKind: "equip",
    target: "pine-blade",
    count: 1,
    exp: 340,
    gold: 300,
    rewardItem: "scale-mail",
    requires: "tv-craft",
    npc: "tv-quartermaster",
    repeatTicks: 0,
    mapId: "thanhvanson",
  },
);
resourceNodes.push(
  {
    id: "tv-jade-vein",
    mapId: "thanhvanson",
    x: 66,
    y: 236,
    kind: "mining",
    name: "Mạch Ngọc Thạch",
    itemId: "jade-ore",
    quantity: 3,
    respawnTicks: 1600,
    requiredLevel: 1,
  },
  {
    id: "tv-jade-vein-deep",
    mapId: "thanhvanson",
    x: 50,
    y: 240,
    kind: "mining",
    name: "Vỉa Ngọc Sâu",
    itemId: "jade-ore",
    quantity: 2,
    respawnTicks: 2200,
    requiredLevel: 1,
  },
  {
    id: "tv-storm-vein",
    mapId: "thanhvanson",
    x: 140,
    y: 88,
    kind: "mining",
    name: "Mạch Lôi Thiết",
    itemId: "storm-iron",
    quantity: 2,
    respawnTicks: 2000,
    requiredLevel: 1,
  },
  {
    id: "tv-moon-herb",
    mapId: "thanhvanson",
    x: 152,
    y: 142,
    kind: "herbalism",
    name: "Bụi Nguyệt Thảo",
    itemId: "moon-herb",
    quantity: 3,
    respawnTicks: 1300,
    requiredLevel: 1,
  },
  {
    id: "tv-spirit-grove",
    mapId: "thanhvanson",
    x: 100,
    y: 290,
    kind: "logging",
    name: "Gốc Linh Mộc",
    itemId: "spirit-wood",
    quantity: 3,
    respawnTicks: 1500,
    requiredLevel: 1,
  },
  {
    id: "tv-silk-bush",
    mapId: "thanhvanson",
    x: 268,
    y: 200,
    kind: "herbalism",
    name: "Bụi Vân Ti",
    itemId: "cloud-silk",
    quantity: 2,
    respawnTicks: 1700,
    requiredLevel: 1,
  },
);

export const assetManifest = {
  version: 1,
  license: "Original procedural artwork — Kiếm Hiệp Web",
  tiles: "procedural:terrain-v1",
  character: "/assets/hero.svg",
  portrait: "/assets/portrait.svg",
  props: "procedural:props-v1",
};
export function validateContent(): string[] {
  const errors: string[] = [];
  for (const [schema, data] of [
    [monsterSchema, monsters],
    [questSchema, quests],
    [npcSchema, npcs],
    [mapSchema, maps],
    [classSchema, classDefinitions],
  ] as const) {
    const result = z.array(schema).safeParse(data);
    if (!result.success) errors.push(result.error.message);
  }
  for (const [name, list] of Object.entries({
    skills,
    items,
    monsters,
    quests,
    maps,
    npcs,
  })) {
    const ids = new Set<string>();
    for (const d of list) {
      if (ids.has(d.id)) errors.push(`${name}: ID trùng ${d.id}`);
      ids.add(d.id);
    }
  }
  for (const m of monsters)
    for (const l of m.loot)
      if (!items.some((i) => i.id === l.itemId) || l.chance < 0 || l.chance > 1)
        errors.push(`Loot không hợp lệ: ${m.id}`);
  for (const q of quests) {
    if (
      (q.objectiveKind === "kill" &&
        !monsters.some((m) => m.id === q.target)) ||
      !items.some((i) => i.id === q.rewardItem) ||
      !npcs.some((n) => n.id === q.npc) ||
      (q.requires && !quests.some((p) => p.id === q.requires))
    )
      errors.push(`Quest không hợp lệ: ${q.id}`);
  }
  for (const m of maps) {
    const zoneIds = new Set<string>();
    for (const zone of m.spawnZones ?? []) {
      const parsed = spawnZoneSchema.safeParse(zone);
      const points =
        zone.area.kind === "circle"
          ? [
              {
                x: zone.area.x - zone.area.radius,
                y: zone.area.y - zone.area.radius,
              },
              {
                x: zone.area.x + zone.area.radius,
                y: zone.area.y + zone.area.radius,
              },
            ]
          : zone.area.points;
      if (
        !parsed.success ||
        zoneIds.has(zone.id) ||
        zone.minPopulation > zone.maxPopulation ||
        zone.respawnTicks[0] > zone.respawnTicks[1] ||
        zone.pool.some((p) => !monsters.some((d) => d.id === p.monsterId)) ||
        points.some(
          (p) =>
            p.x < 1 || p.y < 1 || p.x >= m.width - 1 || p.y >= m.height - 1,
        )
      )
        errors.push(`Spawn zone không hợp lệ: ${m.id}:${zone.id}`);
      zoneIds.add(zone.id);
    }
    for (const p of m.portals)
      if (!maps.some((n) => n.id === p.to))
        errors.push(`Portal không hợp lệ: ${p.id}`);
    for (const s of m.spawns)
      if (
        !monsters.some((d) => d.id === s.monsterId) ||
        s.x < 1 ||
        s.y < 1 ||
        s.x >= m.width - 1 ||
        s.y >= m.height - 1 ||
        m.blocked.some((b) => b.x === s.x && b.y === s.y)
      )
        errors.push(`Spawn không hợp lệ: ${m.id}`);
  }
  for (const c of classDefinitions)
    for (const b of c.branches) {
      if (getClassSkills(c.id, b.id).filter((d) => d.id !== "slash").length < 7)
        errors.push(`Nhánh thiếu kỹ năng: ${c.id}:${b.id}`);
      for (const id of b.startingSkills)
        if (!skills.some((d) => d.id === id))
          errors.push(`Thanh chiêu không tồn tại: ${id}`);
    }
  for (const skill of skills)
    if (
      skill.classId &&
      !classDefinitions.some(
        (c) =>
          c.id === skill.classId &&
          c.branches.some((b) => b.id === skill.branchId),
      )
    )
      errors.push(`Môn phái/nhánh sai ở ${skill.id}`);
  for (const r of recipes) {
    if (
      !items.some((i) => i.id === r.output.itemId) ||
      r.materials.some(
        (m) =>
          m.quantity < 1 ||
          !Number.isInteger(m.quantity) ||
          !items.some((i) => i.id === m.itemId),
      )
    )
      errors.push(`Công thức sai: ${r.id}`);
  }
  for (const n of resourceNodes) {
    const map = maps.find((m) => m.id === n.mapId);
    if (
      !map ||
      n.x < 1 ||
      n.y < 1 ||
      n.x >= map.width - 1 ||
      n.y >= map.height - 1 ||
      map.blocked.some((b) => b.x === n.x && b.y === n.y) ||
      !items.some((i) => i.id === n.itemId)
    )
      errors.push(`Tài nguyên sai: ${n.id}`);
  }
  for (const q of quests) {
    if (
      (q.objectiveKind === "craft" &&
        !recipes.some((r) => r.id === q.target)) ||
      (q.objectiveKind === "collect" &&
        !items.some((i) => i.id === q.target)) ||
      (q.objectiveKind === "explore" &&
        !maps.some(
          (m) => m.id === q.target || m.areas?.some((a) => a.id === q.target),
        ))
    )
      errors.push(`Objective sai: ${q.id}`);
    const seen = new Set<string>();
    let current: typeof q | undefined = q;
    while (current) {
      if (seen.has(current.id)) {
        errors.push(`Chu kỳ quest: ${q.id}`);
        break;
      }
      seen.add(current.id);
      current = quests.find((d) => d.id === current?.requires);
    }
  }
  return errors;
}
export const getMap = (id: string) => {
  const value = maps.find((m) => m.id === id);
  if (!value) throw new Error(`Không tìm thấy bản đồ ${id}`);
  return value;
};
export const getItem = (id: string) => {
  const value = items.find((i) => i.id === id);
  if (!value) throw new Error(`Không tìm thấy vật phẩm ${id}`);
  return value;
};

const positive = z.number().finite().positive();
const positionSchema = z.object({
  x: z.number().finite().nonnegative(),
  y: z.number().finite().nonnegative(),
});
const elementSchema = z.enum(["metal", "wood", "water", "fire", "earth"]);
export const monsterSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.number().int().min(1),
  hp: positive,
  attack: positive,
  defense: z.number().nonnegative(),
  element: elementSchema,
  exp: positive,
  gold: z.number().int().nonnegative(),
  detect: positive,
  range: positive,
  respawn: z.number().int().positive(),
  speed: positive,
  brain: z.enum(["melee", "pack", "boss", "ranged", "assassin", "poison"]),
  skillIds: z.array(z.string()),
  bossMechanic: z.string().nullable(),
  loot: z.array(
    z.object({ itemId: z.string(), chance: z.number().min(0).max(1) }),
  ),
});
export const questSchema = z.object({
  mapId: z.string().optional(),
  objectiveKind: z.enum([
    "kill",
    "collect",
    "craft",
    "equip",
    "explore",
    "talk",
    "level",
  ]),
  repeatTicks: z.number().int().nonnegative(),
  id: z.string(),
  name: z.string(),
  chapter: z.string(),
  description: z.string(),
  target: z.string(),
  count: z.number().int().positive(),
  exp: positive,
  gold: z.number().int().nonnegative(),
  rewardItem: z.string(),
  requires: z.string().nullable(),
  npc: z.string(),
});
export const npcSchema = positionSchema.extend({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  mapId: z.string(),
  appearance: z.string(),
  dialogue: z.string(),
  service: z.enum(["smith", "merchant", "elder"]).optional(),
});
export const classSchema = z.object({
  id: z.string(),
  name: z.string(),
  element: elementSchema,
  weapon: z.string(),
  role: z.string(),
  color: z.string(),
  enabled: z.boolean(),
});
export const mapSchema = z.object({
  id: z.string(),
  name: z.string(),
  subtitle: z.string(),
  width: z.number().int().min(3),
  height: z.number().int().min(3),
  spawn: positionSchema,
  maxMonsters: z.number().int().min(1).max(512).optional(),
  spawnZones: z.array(z.lazy(() => spawnZoneSchema)).optional(),
  water: z.array(positionSchema).optional(),
  bridges: z.array(positionSchema).optional(),
  palette: z.enum(["village", "forest", "camp"]),
  props: z.array(
    positionSchema.extend({
      type: z.enum([
        "house",
        "tree",
        "cherry",
        "rock",
        "lantern",
        "bamboo",
        "gate",
      ]),
      variant: z.number().int().min(0).max(2).optional(),
    }),
  ),
  blocked: z.array(positionSchema),
  spawns: z.array(positionSchema.extend({ monsterId: z.string() })),
  portals: z.array(
    positionSchema.extend({
      id: z.string(),
      name: z.string(),
      to: z.string(),
      destination: positionSchema,
    }),
  ),
});
export const spawnZoneSchema = z.object({
  id: z.string().min(1),
  area: z.discriminatedUnion("kind", [
    positionSchema.extend({
      kind: z.literal("circle"),
      radius: z.number().positive(),
    }),
    z.object({
      kind: z.literal("polygon"),
      points: z.array(positionSchema).min(3).max(32),
    }),
  ]),
  pool: z
    .array(z.object({ monsterId: z.string(), weight: z.number().positive() }))
    .min(1),
  minPopulation: z.number().int().min(0).max(128),
  maxPopulation: z.number().int().min(1).max(128),
  density: z.number().positive().max(1),
  respawnTicks: z.tuple([
    z.number().int().positive(),
    z.number().int().positive(),
  ]),
  levels: z
    .array(
      z.object({
        level: z.number().int().min(1).max(100),
        weight: z.number().positive(),
      }),
    )
    .min(1),
  eliteChance: z.number().min(0).max(1),
  activationRadius: z.number().positive().max(128),
});

export * from "./visuals";

export * from "./clock";

export * from "./visual-assets";
