import type { MapDefinition, MapProp, SpawnZoneDefinition } from "./index";
import { segmentDistance } from "./highlands";
export const riverlandAreas = [
  {
    id: "river-outpost",
    name: "Trạm Vân Khê",
    x: 22,
    y: 26,
    radius: 10,
    kind: "safe" as const,
    level: 4,
  },
  {
    id: "west-bamboo",
    name: "Trúc Lâm Tây",
    x: 57,
    y: 47,
    radius: 13,
    kind: "combat" as const,
    level: 4,
  },
  {
    id: "river-crossing",
    name: "Cầu Mây",
    x: 124,
    y: 46,
    radius: 8,
    kind: "explore" as const,
    level: 5,
  },
  {
    id: "east-stockade",
    name: "Đồn Đông Khê",
    x: 173,
    y: 46,
    radius: 14,
    kind: "combat" as const,
    level: 5,
  },
  {
    id: "stone-pit",
    name: "Mỏ Thiết Sa",
    x: 217,
    y: 82,
    radius: 13,
    kind: "resource" as const,
    level: 6,
  },
  {
    id: "wolf-valley",
    name: "Khe Lang",
    x: 54,
    y: 102,
    radius: 16,
    kind: "combat" as const,
    level: 5,
  },
  {
    id: "reed-camp",
    name: "Trạm Lau",
    x: 90,
    y: 123,
    radius: 9,
    kind: "safe" as const,
    level: 5,
  },
  {
    id: "venom-bank",
    name: "Bờ Độc Thảo",
    x: 151,
    y: 126,
    radius: 14,
    kind: "combat" as const,
    level: 6,
  },
  {
    id: "abandoned-garden",
    name: "Mai Trang Hoang",
    x: 41,
    y: 169,
    radius: 12,
    kind: "explore" as const,
    level: 6,
  },
  {
    id: "south-watch",
    name: "Vọng Gác Nam",
    x: 91,
    y: 202,
    radius: 14,
    kind: "combat" as const,
    level: 7,
  },
  {
    id: "hidden-ravine",
    name: "Khe Ảnh Nhẫn",
    x: 191,
    y: 166,
    radius: 15,
    kind: "combat" as const,
    level: 7,
  },
  {
    id: "river-fort",
    name: "Cổ Trại Vân Khê",
    x: 216,
    y: 220,
    radius: 17,
    kind: "boss" as const,
    level: 8,
  },
];
const roads = [
  [
    { x: 22, y: 26 },
    { x: 57, y: 47 },
    { x: 124, y: 46 },
    { x: 173, y: 46 },
    { x: 217, y: 82 },
  ],
  [
    { x: 22, y: 26 },
    { x: 54, y: 102 },
    { x: 90, y: 123 },
    { x: 113, y: 122 },
    { x: 151, y: 126 },
    { x: 191, y: 166 },
    { x: 216, y: 220 },
  ],
  [
    { x: 54, y: 102 },
    { x: 41, y: 169 },
    { x: 91, y: 202 },
    { x: 121, y: 206 },
    { x: 169, y: 209 },
    { x: 216, y: 220 },
  ],
  [
    { x: 173, y: 46 },
    { x: 151, y: 126 },
  ],
  [
    { x: 217, y: 82 },
    { x: 191, y: 166 },
  ],
  [
    { x: 90, y: 123 },
    { x: 91, y: 202 },
  ],
];
const roadDistance = (x: number, y: number) =>
  Math.min(
    ...roads.flatMap((r) =>
      r.slice(1).map((b, i) => segmentDistance(x, y, r[i], b)),
    ),
  );
const riverX = (y: number) => 116 + Math.sin(y / 23) * 8;
const bridge = (y: number) => [46, 122, 206].some((v) => Math.abs(y - v) <= 2);
const water: { x: number; y: number }[] = [],
  bridges: { x: number; y: number }[] = [];
for (let y = 1; y < 255; y++)
  for (let x = 104; x <= 128; x++)
    if (Math.abs(x - riverX(y)) <= 3)
      (bridge(y) ? bridges : water).push({ x, y });
const props: MapProp[] = [];
for (let y = 5; y < 252; y += 3)
  for (let x = 5; x < 252; x += 3) {
    const seed = (x * 73 + y * 37) % 19;
    if (
      seed < 5 ||
      roadDistance(x, y) < 3 ||
      Math.abs(x - riverX(y)) < 7 ||
      riverlandAreas.some((a) => Math.hypot(x - a.x, y - a.y) < a.radius * 0.65)
    )
      continue;
    props.push({
      type:
        x > 199
          ? "rock"
          : y > 145 && x < 70
            ? "cherry"
            : x < 100
              ? "bamboo"
              : "tree",
      x,
      y,
      variant: seed % 3,
    });
  }
for (const [x, y, variant] of [
  [18, 20, 0],
  [29, 20, 1],
  [85, 117, 2],
  [179, 40, 2],
  [211, 213, 2],
  [224, 214, 1],
])
  props.push({ type: "house", x, y, variant });
props.push({ type: "gate", x: 213, y: 207 }, { type: "gate", x: 173, y: 36 });
for (const a of riverlandAreas)
  props.push({ type: "lantern", x: a.x - 5, y: a.y + 4 });
const blocked = [
  ...water,
  ...props.flatMap((p) =>
    p.type === "house"
      ? Array.from({ length: 12 }, (_, i) => ({
          x: p.x - 1 + (i % 4),
          y: p.y - 1 + Math.floor(i / 4),
        }))
      : ["tree", "bamboo", "cherry", "rock"].includes(p.type)
        ? [{ x: p.x, y: p.y }]
        : [],
  ),
];
const camp = (
  id: string,
  x: number,
  y: number,
  monsters: [string, number][],
  level: number,
  maxPopulation = 10,
): SpawnZoneDefinition => ({
  id,
  area: { kind: "circle", x, y, radius: 13 },
  pool: monsters.map(([monsterId, weight]) => ({ monsterId, weight })),
  minPopulation: Math.min(6, maxPopulation),
  maxPopulation,
  density: 0.025,
  respawnTicks: [400, 720],
  levels: [
    { level, weight: 3 },
    { level: level + 1, weight: 1 },
  ],
  eliteChance: 0.08,
  activationRadius: 42,
});
export const riverlands: MapDefinition = {
  id: "riverlands",
  name: "Vân Khê Sơn Dã",
  subtitle: "Bãi luyện cấp 4–9 · Ba cầu nối hai bờ",
  width: 256,
  height: 256,
  spawn: { x: 22, y: 27 },
  palette: "forest",
  areas: riverlandAreas,
  paths: roads,
  props,
  blocked,
  water,
  bridges,
  spawns: [],
  maxMonsters: 128,
  spawnZones: [
    camp(
      "west-bamboo",
      57,
      47,
      [
        ["bandit", 3],
        ["archer", 1],
      ],
      4,
    ),
    camp(
      "east-stockade",
      173,
      46,
      [
        ["archer", 2],
        ["bandit", 3],
      ],
      5,
    ),
    camp(
      "stone-pit",
      217,
      82,
      [
        ["bandit", 2],
        ["assassin", 1],
      ],
      6,
    ),
    camp("wolf-valley", 54, 102, [["wolf", 1]], 5, 12),
    camp(
      "venom-bank",
      151,
      126,
      [
        ["viper", 4],
        ["assassin", 1],
      ],
      6,
    ),
    camp(
      "garden-wolves",
      41,
      169,
      [
        ["wolf", 3],
        ["viper", 1],
      ],
      6,
    ),
    camp(
      "south-watch",
      91,
      202,
      [
        ["archer", 2],
        ["bandit", 2],
      ],
      7,
    ),
    {
      ...camp(
        "hidden-ravine",
        191,
        166,
        [
          ["assassin", 3],
          ["archer", 1],
        ],
        7,
      ),
      area: {
        kind: "polygon",
        points: [
          { x: 177, y: 157 },
          { x: 203, y: 151 },
          { x: 207, y: 177 },
          { x: 181, y: 181 },
        ],
      },
    },
    {
      ...camp("river-fort", 216, 220, [["boss", 1]], 8, 1),
      eliteChance: 0,
      respawnTicks: [2400, 3000],
    },
    camp(
      "fort-guards",
      221,
      204,
      [
        ["assassin", 2],
        ["archer", 1],
      ],
      8,
      8,
    ),
  ],
  portals: [
    {
      id: "highlands",
      name: "Thanh Sơn Ngoại Vực",
      x: 18,
      y: 29,
      to: "highlands",
      destination: { x: 22, y: 20 },
    },
  ],
};
