export const enhancementRules = {
  maxLevel: 15,
  /** Dưới mốc này cường hóa luôn thành công và không mất cấp. */
  safeLevel: 5,
  baseGold: 50,
  goldPerLevel: 35,
  baseOre: 1,
  orePerLevel: 1,
  statPerLevel: 0.15,
  /** Tỉ lệ thành công theo cấp hiện tại, chỉ dùng từ safeLevel trở lên. */
  successRates: {
    5: 0.9,
    6: 0.85,
    7: 0.75,
    8: 0.7,
    9: 0.6,
    10: 0.55,
    11: 0.45,
    12: 0.4,
    13: 0.3,
    14: 0.25,
  } as Record<number, number>,
  /** Từ cấp này thất bại mất 1 cấp, từ `heavyFailureFrom` mất 2 cấp. */
  downgradeFrom: 8,
  heavyFailureFrom: 13,
  /** Đá bảo vệ: tiêu hao mỗi lần đập có bật bảo vệ, đổi lấy việc không mất cấp. */
  protectionItemId: "ward-stone",
  protectionGold: 120,
};
export const enhanceCost = (level: number) => ({
  gold: enhancementRules.baseGold + level * enhancementRules.goldPerLevel,
  ore: enhancementRules.baseOre + level * enhancementRules.orePerLevel,
});
export const enhanceSuccessRate = (level: number) =>
  level < enhancementRules.safeLevel
    ? 1
    : (enhancementRules.successRates[level] ?? 0.2);
export const enhanceFailureLoss = (level: number) =>
  level < enhancementRules.downgradeFrom
    ? 0
    : level < enhancementRules.heavyFailureFrom
      ? 1
      : 2;
export interface RecipeDefinition {
  id: string;
  name: string;
  profession: "alchemy" | "weaponsmith" | "armorer" | "jeweler";
  requiredLevel: number;
  station: "merchant" | "smith";
  gold: number;
  materials: { itemId: string; quantity: number }[];
  output: { itemId: string; quantity: number };
  experience: number;
}
export const recipes: RecipeDefinition[] = [
  {
    id: "brew-hp",
    name: "Luyện Tiểu Hoàn Đan",
    profession: "alchemy",
    requiredLevel: 1,
    station: "merchant",
    gold: 10,
    materials: [{ itemId: "herb", quantity: 3 }],
    output: { itemId: "hp", quantity: 3 },
    experience: 12,
  },
  {
    id: "brew-mp",
    name: "Luyện Tụ Khí Đan",
    profession: "alchemy",
    requiredLevel: 1,
    station: "merchant",
    gold: 10,
    materials: [
      { itemId: "herb", quantity: 2 },
      { itemId: "wood", quantity: 1 },
    ],
    output: { itemId: "mp", quantity: 3 },
    experience: 12,
  },
  {
    id: "forge-sword",
    name: "Rèn Thanh Phong Kiếm",
    profession: "weaponsmith",
    requiredLevel: 1,
    station: "smith",
    gold: 60,
    materials: [
      { itemId: "ore", quantity: 3 },
      { itemId: "wood", quantity: 2 },
    ],
    output: { itemId: "sword", quantity: 1 },
    experience: 25,
  },
  {
    id: "weave-robe",
    name: "May Đạo Bào Thanh Vân",
    profession: "armorer",
    requiredLevel: 1,
    station: "smith",
    gold: 50,
    materials: [
      { itemId: "herb", quantity: 4 },
      { itemId: "wood", quantity: 2 },
    ],
    output: { itemId: "robe", quantity: 1 },
    experience: 25,
  },
  {
    id: "craft-boots",
    name: "Chế Lưu Vân Ngoa",
    profession: "armorer",
    requiredLevel: 2,
    station: "smith",
    gold: 80,
    materials: [
      { itemId: "ore", quantity: 2 },
      { itemId: "wood", quantity: 4 },
    ],
    output: { itemId: "boots", quantity: 1 },
    experience: 35,
  },
  {
    id: "cut-jade",
    name: "Mài Bích Ngọc",
    profession: "jeweler",
    requiredLevel: 1,
    station: "smith",
    gold: 75,
    materials: [
      { itemId: "ore", quantity: 4 },
      { itemId: "herb", quantity: 2 },
    ],
    output: { itemId: "jade-gem", quantity: 1 },
    experience: 30,
  },
  {
    id: "cut-amber",
    name: "Mài Hổ Phách",
    profession: "jeweler",
    requiredLevel: 2,
    station: "smith",
    gold: 90,
    materials: [
      { itemId: "ore", quantity: 5 },
      { itemId: "wood", quantity: 2 },
    ],
    output: { itemId: "amber-gem", quantity: 1 },
    experience: 35,
  },
];
export interface ResourceDefinition {
  id: string;
  mapId: string;
  x: number;
  y: number;
  kind: "herbalism" | "mining" | "logging";
  name: string;
  itemId: string;
  quantity: number;
  respawnTicks: number;
  requiredLevel: number;
}
export const resourceNodes: ResourceDefinition[] = [
  {
    id: "village-herb",
    mapId: "village",
    x: 12,
    y: 19,
    kind: "herbalism",
    name: "Bụi Linh Thảo",
    itemId: "herb",
    quantity: 2,
    respawnTicks: 1200,
    requiredLevel: 1,
  },
  {
    id: "village-wood",
    mapId: "village",
    x: 22,
    y: 15,
    kind: "logging",
    name: "Gỗ Thanh Tùng",
    itemId: "wood",
    quantity: 2,
    respawnTicks: 1600,
    requiredLevel: 1,
  },
  {
    id: "forest-ore",
    mapId: "forest",
    x: 12,
    y: 15,
    kind: "mining",
    name: "Mạch Huyền Thiết",
    itemId: "ore",
    quantity: 2,
    respawnTicks: 1800,
    requiredLevel: 1,
  },
  {
    id: "forest-herb",
    mapId: "forest",
    x: 19,
    y: 20,
    kind: "herbalism",
    name: "Linh Thảo Rừng",
    itemId: "herb",
    quantity: 3,
    respawnTicks: 1400,
    requiredLevel: 1,
  },
  {
    id: "forest-wood",
    mapId: "forest",
    x: 15,
    y: 18,
    kind: "logging",
    name: "Trúc Già",
    itemId: "wood",
    quantity: 3,
    respawnTicks: 1800,
    requiredLevel: 1,
  },
  {
    id: "camp-ore",
    mapId: "camp",
    x: 20,
    y: 23,
    kind: "mining",
    name: "Mạch Thiết Trại",
    itemId: "ore",
    quantity: 3,
    respawnTicks: 1600,
    requiredLevel: 2,
  },
];
export const professionNames: Record<string, string> = {
  herbalism: "Hái thuốc",
  mining: "Khai khoáng",
  logging: "Thu thập gỗ",
  alchemy: "Luyện dược",
  weaponsmith: "Rèn vũ khí",
  armorer: "Chế giáp",
  jeweler: "Chế tác ngọc",
};
export const professionLevel = (experience: number) =>
  1 + Math.floor(Math.sqrt(experience / 30));

resourceNodes.push(
  {
    id: "highland-quarry",
    mapId: "highlands",
    x: 72,
    y: 20,
    kind: "mining",
    name: "Quặng Mỏ Đá Cũ",
    itemId: "ore",
    quantity: 3,
    respawnTicks: 1800,
    requiredLevel: 1,
  },
  {
    id: "highland-plum-herb",
    mapId: "highlands",
    x: 26,
    y: 55,
    kind: "herbalism",
    name: "Linh Thảo Mai Viên",
    itemId: "herb",
    quantity: 3,
    respawnTicks: 1200,
    requiredLevel: 1,
  },
  {
    id: "highland-marsh-herb",
    mapId: "highlands",
    x: 101,
    y: 58,
    kind: "herbalism",
    name: "Thuốc Giải Đầm Độc",
    itemId: "herb",
    quantity: 3,
    respawnTicks: 1200,
    requiredLevel: 1,
  },
  {
    id: "highland-rest-wood",
    mapId: "highlands",
    x: 65,
    y: 60,
    kind: "logging",
    name: "Gỗ Tùng Trạm Săn",
    itemId: "wood",
    quantity: 4,
    respawnTicks: 1600,
    requiredLevel: 1,
  },
  {
    id: "highland-shrine-ore",
    mapId: "highlands",
    x: 40,
    y: 96,
    kind: "mining",
    name: "Huyền Thiết Phế Miếu",
    itemId: "ore",
    quantity: 4,
    respawnTicks: 1800,
    requiredLevel: 2,
  },
);
