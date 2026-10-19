import type { Element } from "../../game-protocol/src/index";
export interface SectDefinition {
  id: string;
  name: string;
  element: Element;
  weapon: string;
  role: string;
  color: string;
  enabled: boolean;
  identity: string;
  branches: {
    id: string;
    name: string;
    description: string;
    startingSkills: string[];
  }[];
  preferredStat: "strength" | "dexterity" | "vitality" | "energy";
}
export const classDefinitions: SectDefinition[] = [
  {
    id: "wudang",
    name: "Võ Đang",
    element: "earth",
    weapon: "Kiếm",
    role: "Kiếm khí · nội công",
    color: "#8fc0cd",
    enabled: true,
    preferredStat: "energy",
    identity: "Kiếm khí xuyên tuyến và điều hòa chân khí.",
    branches: [
      {
        id: "sword",
        name: "Kiếm tông",
        description: "Phản kích, kiếm trận và cận chiến linh hoạt.",
        startingSkills: ["thunder", "storm", "heal", "guard"],
      },
      {
        id: "qi",
        name: "Khí tông",
        description: "Vận khí chậm, xuyên nhiều địch và phong tỏa nội lực.",
        startingSkills: [
          "wd-qi-bolt",
          "wd-qi-seal",
          "wd-qi-ward",
          "wd-qi-tempest",
        ],
      },
    ],
  },
  {
    id: "shaolin",
    name: "Thiếu Lâm",
    element: "metal",
    weapon: "Côn",
    role: "Đỡ đòn · phản công",
    color: "#dcb16a",
    enabled: true,
    preferredStat: "vitality",
    identity: "Dùng khiên và choáng tạo khoảng trống giữa đám đông.",
    branches: [
      {
        id: "staff",
        name: "Côn pháp",
        description: "Quét hình quạt, đánh lui và hộ thể.",
        startingSkills: ["sl-sweep", "sl-stun", "sl-iron", "sl-roar"],
      },
      {
        id: "fist",
        name: "Quyền pháp",
        description: "Áp sát, hút sinh lực và bộc phá.",
        startingSkills: ["sl-palm", "sl-rush", "sl-meditate", "sl-buddha"],
      },
    ],
  },
  {
    id: "tianwang",
    name: "Thiên Vương",
    element: "metal",
    weapon: "Thương",
    role: "Tuyến đầu · phá giáp",
    color: "#d0b879",
    enabled: true,
    preferredStat: "strength",
    identity: "Thương dài phá giáp, tích thế lao vào tuyến địch.",
    branches: [
      {
        id: "spear",
        name: "Thương pháp",
        description: "Đâm xuyên và phá giáp theo đường thẳng.",
        startingSkills: ["tw-pierce", "tw-break", "tw-ward", "tw-charge"],
      },
      {
        id: "hammer",
        name: "Chùy pháp",
        description: "Cú đánh chậm gây choáng và chấn địa.",
        startingSkills: ["tw-crush", "tw-quake", "tw-fortify", "tw-judgment"],
      },
    ],
  },
  {
    id: "tangmen",
    name: "Đường Môn",
    element: "wood",
    weapon: "Ám khí",
    role: "Tầm xa · độc dược",
    color: "#91b78c",
    enabled: true,
    preferredStat: "dexterity",
    identity: "Đạn bay thực, xuyên địch và độc cộng dồn.",
    branches: [
      {
        id: "dart",
        name: "Phi tiêu",
        description: "Ám khí nhanh, xuyên nhiều mục tiêu.",
        startingSkills: ["tm-dart", "tm-volley", "tm-focus", "tm-piercing"],
      },
      {
        id: "trap",
        name: "Cơ quan",
        description: "Làm chậm, khóa chân và khu vực sát thương.",
        startingSkills: ["tm-net", "tm-venom", "tm-smoke", "tm-rain"],
      },
    ],
  },
  {
    id: "wudu",
    name: "Ngũ Độc",
    element: "wood",
    weapon: "Độc trượng",
    role: "Độc theo thời gian · suy yếu",
    color: "#a995bd",
    enabled: true,
    preferredStat: "energy",
    identity: "Độc cộng dồn và hút máu, cần thời gian để phát huy.",
    branches: [
      {
        id: "venom",
        name: "Độc kinh",
        description: "Độc tầm xa, xói giáp và lan diện rộng.",
        startingSkills: [
          "wu-poison",
          "wu-corrosion",
          "wu-antidote",
          "wu-plague",
        ],
      },
      {
        id: "curse",
        name: "Chú thuật",
        description: "Câm lặng, suy yếu và hút sinh lực.",
        startingSkills: ["wu-hex", "wu-drain", "wu-shell", "wu-withering"],
      },
    ],
  },
  {
    id: "emei",
    name: "Nga Mi",
    element: "water",
    weapon: "Kiếm",
    role: "Trị liệu · khống chế",
    color: "#cad5eb",
    enabled: true,
    preferredStat: "energy",
    identity: "Hồi phục theo thời gian và băng thuật làm chậm giao tranh.",
    branches: [
      {
        id: "lotus",
        name: "Từ tâm",
        description: "Hồi sinh lực, lá chắn và kiếm băng.",
        startingSkills: ["em-frost", "em-renew", "em-barrier", "em-purify"],
      },
      {
        id: "sword",
        name: "Phật kiếm",
        description: "Áp sát, băng phong và phục hồi chủ động.",
        startingSkills: ["em-cut", "em-freeze", "em-prayer", "em-blossom"],
      },
    ],
  },
  {
    id: "cuiyan",
    name: "Thúy Yên",
    element: "water",
    weapon: "Song đao",
    role: "Băng · cơ động",
    color: "#93c8d8",
    enabled: true,
    preferredStat: "dexterity",
    identity: "Băng chậm rồi dịch chuyển tạo vị trí đánh mới.",
    branches: [
      {
        id: "blade",
        name: "Đao vũ",
        description: "Lướt qua mục tiêu và đóng băng cận chiến.",
        startingSkills: ["cy-dance", "cy-icecut", "cy-mist", "cy-moon"],
      },
      {
        id: "ice",
        name: "Hàn khí",
        description: "Băng tuyến xa và vùng bão tuyết.",
        startingSkills: ["cy-shard", "cy-snow", "cy-refuge", "cy-blizzard"],
      },
    ],
  },
  {
    id: "beggar",
    name: "Cái Bang",
    element: "fire",
    weapon: "Bổng",
    role: "Thiêu đốt · cận chiến",
    color: "#c99b68",
    enabled: true,
    preferredStat: "strength",
    identity: "Cận chiến diện rộng và hỏa chưởng thiêu đốt.",
    branches: [
      {
        id: "staff",
        name: "Đả cẩu bổng",
        description: "Quét bổng, trói chân và hồi sức.",
        startingSkills: ["cb-sweep", "cb-trip", "cb-wine", "cb-dogking"],
      },
      {
        id: "dragon",
        name: "Giáng long chưởng",
        description: "Hỏa chưởng xuyên tuyến, đốt và hút máu.",
        startingSkills: ["cb-flame", "cb-dragon", "cb-breath", "cb-eighteen"],
      },
    ],
  },
  {
    id: "tianren",
    name: "Thiên Nhẫn",
    element: "fire",
    weapon: "Đao",
    role: "Ám sát · hút sinh lực",
    color: "#c98675",
    enabled: true,
    preferredStat: "dexterity",
    identity: "Lao vào, câm lặng và hồi phục bằng sát thương.",
    branches: [
      {
        id: "assassin",
        name: "Ma nhẫn",
        description: "Áp sát và bộc phá mục tiêu bị khống chế.",
        startingSkills: ["tr-ambush", "tr-silence", "tr-shroud", "tr-execute"],
      },
      {
        id: "flame",
        name: "Hỏa liên",
        description: "Đốt theo thời gian và khóa vùng.",
        startingSkills: ["tr-flare", "tr-sear", "tr-blood", "tr-inferno"],
      },
    ],
  },
  {
    id: "kunlun",
    name: "Côn Lôn",
    element: "earth",
    weapon: "Đao",
    role: "Lôi thuật · khống chế",
    color: "#bcafe0",
    enabled: true,
    preferredStat: "energy",
    identity: "Thi triển có thời gian, gây choáng và chấn động.",
    branches: [
      {
        id: "thunder",
        name: "Lôi pháp",
        description: "Lôi đạn và phong tỏa thi triển.",
        startingSkills: ["kl-spark", "kl-thunder", "kl-cloud", "kl-storm"],
      },
      {
        id: "blade",
        name: "Phong đao",
        description: "Đao khí hình quạt và tăng tốc áp sát.",
        startingSkills: ["kl-gale", "kl-rend", "kl-tailwind", "kl-cyclone"],
      },
    ],
  },
];
export const getSect = (id: string) => {
  const d = classDefinitions.find((c) => c.id === id);
  if (!d) throw new Error(`Không tìm thấy môn phái ${id}`);
  return d;
};
export const defaultBranch = (classId: string) => getSect(classId).branches[0];
