import type { MapDefinition, MapProp, SpawnZoneDefinition } from "./index";
import { segmentDistance } from "./highlands";
/**
 * Thanh Vân Sơn — bãi luyện cấp lớn 320×320 (level 9–16).
 * Địa hình: rừng tùng/bamboo, dãy đá phía tây bắc, vách đá đông bắc, hồ Vân ở
 * giữa đông và sông chảy về mép đông với hai cây cầu đá. Đường chính nối sơn môn
 * ở tây nam tới Vân Đỉnh ở bắc, cùng các nhánh tới bãi quái và điểm khám phá.
 */
export const thanhvansonAreas = [
  {
    id: "thanhvan-gate",
    name: "Thanh Vân Sơn Môn",
    x: 34,
    y: 284,
    radius: 13,
    kind: "safe" as const,
    level: 9,
  },
  {
    id: "mist-woods",
    name: "Mê Vụ Lâm",
    x: 62,
    y: 150,
    radius: 16,
    kind: "combat" as const,
    level: 10,
  },
  {
    id: "pine-pass",
    name: "Đèo Tùng Phong",
    x: 104,
    y: 76,
    radius: 15,
    kind: "combat" as const,
    level: 10,
  },
  {
    id: "lake-shore",
    name: "Vân Hồ Bờ",
    x: 160,
    y: 132,
    radius: 13,
    kind: "explore" as const,
    level: 11,
  },
  {
    id: "stone-bridge",
    name: "Cầu Đá Vân",
    x: 250,
    y: 132,
    radius: 9,
    kind: "explore" as const,
    level: 11,
  },
  {
    id: "east-ridge",
    name: "Đông Lĩnh",
    x: 272,
    y: 96,
    radius: 14,
    kind: "combat" as const,
    level: 12,
  },
  {
    id: "wolf-den",
    name: "Lang Quật",
    x: 120,
    y: 192,
    radius: 14,
    kind: "combat" as const,
    level: 12,
  },
  {
    id: "jade-mine",
    name: "Ngọc Khoáng Động",
    x: 58,
    y: 228,
    radius: 13,
    kind: "resource" as const,
    level: 13,
  },
  {
    id: "cloud-terrace",
    name: "Vân Điền",
    x: 158,
    y: 260,
    radius: 15,
    kind: "combat" as const,
    level: 13,
  },
  {
    id: "hermit-hut",
    name: "Thảo Lư",
    x: 234,
    y: 234,
    radius: 11,
    kind: "safe" as const,
    level: 13,
  },
  {
    id: "sky-shrine",
    name: "Vân Hồ Từ",
    x: 228,
    y: 168,
    radius: 11,
    kind: "explore" as const,
    level: 12,
  },
  {
    id: "cliff-watch",
    name: "Vọng Vân Nhai",
    x: 294,
    y: 182,
    radius: 12,
    kind: "explore" as const,
    level: 14,
  },
  {
    id: "ancient-grove",
    name: "Cổ Mộc Lâm",
    x: 96,
    y: 298,
    radius: 13,
    kind: "explore" as const,
    level: 14,
  },
  {
    id: "shadow-camp",
    name: "Hắc Ảnh Doanh",
    x: 252,
    y: 296,
    radius: 15,
    kind: "combat" as const,
    level: 15,
  },
  {
    id: "dragon-summit",
    name: "Vân Đỉnh",
    x: 172,
    y: 40,
    radius: 17,
    kind: "boss" as const,
    level: 16,
  },
];
const roads = [
  [
    { x: 34, y: 284 },
    { x: 58, y: 228 },
    { x: 96, y: 196 },
    { x: 120, y: 192 },
    { x: 150, y: 160 },
    { x: 160, y: 132 },
  ],
  [
    { x: 160, y: 132 },
    { x: 176, y: 104 },
    { x: 196, y: 100 },
    { x: 240, y: 96 },
    { x: 272, y: 96 },
    { x: 292, y: 140 },
    { x: 294, y: 182 },
  ],
  [
    { x: 240, y: 96 },
    { x: 250, y: 132 },
    { x: 268, y: 168 },
    { x: 240, y: 200 },
    { x: 234, y: 234 },
    { x: 252, y: 296 },
  ],
  [
    { x: 160, y: 132 },
    { x: 148, y: 104 },
    { x: 104, y: 76 },
    { x: 150, y: 48 },
    { x: 172, y: 40 },
  ],
  [
    { x: 120, y: 192 },
    { x: 140, y: 228 },
    { x: 158, y: 260 },
    { x: 200, y: 288 },
    { x: 252, y: 296 },
  ],
  [
    { x: 34, y: 284 },
    { x: 60, y: 300 },
    { x: 96, y: 298 },
  ],
  [
    { x: 96, y: 196 },
    { x: 62, y: 150 },
    { x: 70, y: 110 },
    { x: 104, y: 76 },
  ],
  [
    { x: 160, y: 132 },
    { x: 226, y: 168 },
    { x: 240, y: 200 },
  ],
  [
    { x: 96, y: 196 },
    { x: 58, y: 228 },
  ],
];
const roadDistance = (x: number, y: number) =>
  Math.min(
    ...roads.flatMap((r) =>
      r.slice(1).map((b, i) => segmentDistance(x, y, r[i], b)),
    ),
  );
const lakeCenter = { x: 196, y: 132 },
  lakeRadius = { x: 30, y: 20 };
const inLake = (x: number, y: number) =>
  ((x - lakeCenter.x) / lakeRadius.x) ** 2 +
    ((y - lakeCenter.y) / lakeRadius.y) ** 2 <=
  1;
const riverY = (x: number) => 132 + Math.sin((x - 226) / 18) * 6;
const inRiver = (x: number, y: number) =>
  x >= 226 && Math.abs(y - riverY(x)) <= 3;
const onBridge = (x: number, y: number) =>
  inRiver(x, y) && (Math.abs(x - 250) <= 3 || Math.abs(x - 290) <= 3);
const water: { x: number; y: number }[] = [],
  bridges: { x: number; y: number }[] = [];
for (let y = 1; y < 319; y++)
  for (let x = 1; x < 319; x++)
    if (inLake(x, y) || inRiver(x, y))
      (onBridge(x, y) ? bridges : water).push({ x, y });
/** Vách đá: dãy tây bắc quanh đèo và mỏm đông bắc, đều là prop `rock` chặn đường. */
const inWestRidge = (x: number, y: number) =>
  x >= 56 && x <= 152 && y >= 36 && y <= 112 && roadDistance(x, y) > 4;
const inEastCliff = (x: number, y: number) =>
  x >= 246 && y >= 28 && y <= 92 && roadDistance(x, y) > 4;
/** Chỗ đặt NPC, tài nguyên, cổng và tâm bãi quái: không được có prop chặn. */
export const thanhvansonReserved = [
  { x: 34, y: 284 },
  { x: 30, y: 292 },
  { x: 44, y: 276 },
  { x: 168, y: 126 },
  { x: 64, y: 222 },
  { x: 34, y: 284 },
  { x: 30, y: 292 },
  { x: 36, y: 280 },
  { x: 28, y: 280 },
  { x: 70, y: 262 },
  { x: 96, y: 220 },
  { x: 268, y: 200 },
  { x: 62, y: 150 },
  { x: 104, y: 76 },
  { x: 126, y: 96 },
  { x: 148, y: 118 },
  { x: 22, y: 284 },
  { x: 66, y: 236 },
  { x: 50, y: 240 },
  { x: 140, y: 88 },
  { x: 152, y: 142 },
  { x: 100, y: 290 },
  { x: 262, y: 126 },
  { x: 276, y: 90 },
  { x: 120, y: 192 },
  { x: 58, y: 228 },
  { x: 158, y: 260 },
  { x: 96, y: 298 },
  { x: 294, y: 182 },
  { x: 252, y: 296 },
  { x: 186, y: 56 },
  { x: 172, y: 40 },
  ...thanhvansonAreas,
];
const props: MapProp[] = [];
for (let y = 4; y < 316; y += 4)
  for (let x = 4; x < 316; x += 4) {
    const seed = (x * 71 + y * 43) % 23;
    if (
      seed < 8 ||
      roadDistance(x, y) < 3 ||
      inLake(x, y) ||
      inRiver(x, y) ||
      thanhvansonReserved.some((r) => Math.hypot(x - r.x, y - r.y) < 3) ||
      thanhvansonAreas.some(
        (a) => Math.hypot(x - a.x, y - a.y) < a.radius * 0.7,
      )
    )
      continue;
    const type =
      inWestRidge(x, y) || inEastCliff(x, y)
        ? "rock"
        : y > 232 && x > 118 && x < 210
          ? "cherry"
          : x < 96
            ? "bamboo"
            : x > 268 && y > 240
              ? "rock"
              : "tree";
    props.push({ type, x, y, variant: seed % 3 });
  }
for (const [x, y, variant] of [
  [26, 276, 0],
  [40, 276, 1],
  [30, 292, 2],
  [236, 226, 0],
  [242, 240, 1],
  [64, 222, 2],
  [150, 254, 0],
  [166, 254, 1],
  [206, 290, 2],
  [246, 288, 0],
])
  props.push({ type: "house", x, y, variant });
props.push(
  { type: "gate", x: 34, y: 278 },
  { type: "gate", x: 252, y: 288 },
  { type: "gate", x: 172, y: 50 },
);
for (const a of thanhvansonAreas)
  props.push({ type: "lantern", x: a.x - 5, y: a.y + 4 });
const propBlocked = props.flatMap((p) => {
  if (thanhvansonReserved.some((r) => Math.hypot(r.x - p.x, r.y - p.y) < 2.5))
    return [];
  if (p.type === "house")
    return Array.from({ length: 12 }, (_, i) => ({
      x: p.x - 1 + (i % 4),
      y: p.y - 1 + Math.floor(i / 4),
    }));
  return ["tree", "bamboo", "cherry", "rock"].includes(p.type)
    ? [{ x: p.x, y: p.y }]
    : [];
});
const blocked = [...water, ...propBlocked].filter(
  (p) =>
    !bridges.some((b) => b.x === p.x && b.y === p.y) &&
    !thanhvansonReserved.some((r) => Math.hypot(r.x - p.x, r.y - p.y) < 1.5),
);
const camp = (
  id: string,
  x: number,
  y: number,
  monsters: [string, number][],
  level: number,
  maxPopulation = 10,
  eliteChance = 0.1,
): SpawnZoneDefinition => ({
  id,
  area: { kind: "circle", x, y, radius: 14 },
  pool: monsters.map(([monsterId, weight]) => ({ monsterId, weight })),
  minPopulation: Math.min(7, maxPopulation),
  maxPopulation,
  density: 0.03,
  respawnTicks: [360, 640],
  levels: [
    { level, weight: 3 },
    { level: level + 1, weight: 1 },
  ],
  eliteChance,
  activationRadius: 46,
});
export const thanhvanson: MapDefinition = {
  id: "thanhvanson",
  name: "Thanh Vân Sơn",
  subtitle: "Bãi luyện cấp 9–16 · Hồ Vân, hai cầu đá và vách đá đông bắc",
  width: 320,
  height: 320,
  spawn: { x: 34, y: 288 },
  palette: "forest",
  areas: thanhvansonAreas,
  paths: roads,
  props,
  blocked,
  water,
  bridges,
  spawns: [],
  maxMonsters: 160,
  spawnZones: [
    // Hai bãi sát sơn môn để người chơi vừa vào là có quái đánh ngay.
    camp(
      "gate-outskirts",
      70,
      262,
      [
        ["mist-wolf", 3],
        ["cloud-archer", 1],
      ],
      9,
      12,
    ),
    camp(
      "gate-road",
      96,
      220,
      [
        ["mist-wolf", 2],
        ["venom-moth", 2],
      ],
      10,
      12,
    ),

    camp(
      "gate-wolves",
      62,
      150,
      [
        ["mist-wolf", 3],
        ["cloud-archer", 1],
      ],
      10,
      12,
    ),
    camp(
      "pass-apes",
      104,
      76,
      [
        ["stone-ape", 2],
        ["mist-wolf", 2],
      ],
      10,
      12,
    ),
    camp(
      "pass-cliff",
      126,
      96,
      [
        ["stone-ape", 2],
        ["venom-moth", 1],
      ],
      11,
      10,
    ),
    {
      ...camp(
        "lake-mist",
        148,
        118,
        [
          ["venom-moth", 3],
          ["cloud-archer", 2],
        ],
        11,
        12,
      ),
      area: {
        kind: "polygon",
        points: [
          { x: 136, y: 104 },
          { x: 162, y: 104 },
          { x: 166, y: 132 },
          { x: 140, y: 134 },
        ],
      },
    },
    camp(
      "bridge-guards",
      262,
      126,
      [
        ["shadow-blade", 2],
        ["cloud-archer", 2],
      ],
      12,
      11,
    ),
    camp(
      "east-ridge",
      276,
      90,
      [
        ["thunder-crane", 2],
        ["shadow-blade", 2],
      ],
      12,
      12,
    ),
    camp(
      "wolf-den",
      120,
      192,
      [
        ["mist-wolf", 4],
        ["bandit-lord", 1],
      ],
      12,
      14,
    ),
    camp(
      "jade-mine",
      58,
      228,
      [
        ["jade-serpent", 3],
        ["stone-ape", 2],
      ],
      13,
      12,
    ),
    camp(
      "terrace-fields",
      158,
      260,
      [
        ["bandit-lord", 1],
        ["cloud-archer", 2],
        ["mist-wolf", 2],
      ],
      13,
      12,
    ),
    camp(
      "grove-guards",
      96,
      298,
      [
        ["jade-serpent", 2],
        ["venom-moth", 2],
      ],
      14,
      11,
    ),
    camp(
      "cliff-watch",
      294,
      182,
      [
        ["thunder-crane", 3],
        ["storm-drummer", 1],
      ],
      14,
      11,
    ),
    camp(
      "shadow-camp",
      252,
      296,
      [
        ["shadow-blade", 3],
        ["bandit-lord", 1],
        ["storm-drummer", 1],
      ],
      15,
      14,
      0.14,
    ),
    camp(
      "summit-guards",
      186,
      56,
      [
        ["storm-drummer", 2],
        ["thunder-crane", 2],
        ["stone-ape", 1],
      ],
      15,
      12,
      0.16,
    ),
    {
      ...camp("dragon-summit", 172, 40, [["cloud-beast", 1]], 16, 1, 0),
      eliteChance: 0,
      respawnTicks: [2400, 3000],
      area: { kind: "circle", x: 172, y: 40, radius: 15 },
    },
  ],
  portals: [
    {
      id: "riverlands",
      name: "Vân Khê Sơn Dã",
      x: 30,
      y: 292,
      to: "riverlands",
      destination: { x: 57, y: 43 },
    },
  ],
};
