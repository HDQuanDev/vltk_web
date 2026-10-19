import type { MapDefinition, MapProp } from "./index";
export const highlandAreas = [
  {
    id: "wayfarer-hamlet",
    name: "Trạm Thanh Sơn",
    x: 16,
    y: 16,
    radius: 9,
    kind: "safe" as const,
    level: 1,
  },
  {
    id: "bamboo-pass",
    name: "Đèo Trúc Ảnh",
    x: 43,
    y: 24,
    radius: 9,
    kind: "combat" as const,
    level: 3,
  },
  {
    id: "old-quarry",
    name: "Mỏ Đá Cũ",
    x: 72,
    y: 20,
    radius: 10,
    kind: "resource" as const,
    level: 4,
  },
  {
    id: "plum-garden",
    name: "Mai Viên",
    x: 26,
    y: 55,
    radius: 10,
    kind: "explore" as const,
    level: 3,
  },
  {
    id: "hunter-rest",
    name: "Lều Thợ Săn",
    x: 65,
    y: 60,
    radius: 9,
    kind: "safe" as const,
    level: 4,
  },
  {
    id: "serpent-marsh",
    name: "Đầm Xà Ảnh",
    x: 101,
    y: 58,
    radius: 11,
    kind: "combat" as const,
    level: 5,
  },
  {
    id: "ruined-shrine",
    name: "Phế Miếu",
    x: 40,
    y: 96,
    radius: 10,
    kind: "explore" as const,
    level: 5,
  },
  {
    id: "black-watch",
    name: "Hắc Phong Tiền Tiêu",
    x: 95,
    y: 99,
    radius: 12,
    kind: "boss" as const,
    level: 6,
  },
];
const roads = [
  [
    { x: 16, y: 16 },
    { x: 43, y: 24 },
    { x: 72, y: 20 },
    { x: 101, y: 58 },
    { x: 95, y: 99 },
  ],
  [
    { x: 16, y: 16 },
    { x: 26, y: 55 },
    { x: 40, y: 96 },
    { x: 95, y: 99 },
  ],
  [
    { x: 26, y: 55 },
    { x: 65, y: 60 },
    { x: 101, y: 58 },
  ],
  [
    { x: 43, y: 24 },
    { x: 65, y: 60 },
    { x: 40, y: 96 },
  ],
];
export function segmentDistance(
  x: number,
  y: number,
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    t = Math.max(
      0,
      Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)),
    );
  return Math.hypot(x - a.x - t * dx, y - a.y - t * dy);
}
const roadDistance = (x: number, y: number) =>
  Math.min(
    ...roads.flatMap((r) =>
      r.slice(1).map((b, i) => segmentDistance(x, y, r[i], b)),
    ),
  );
const props: MapProp[] = [];
// Mật độ cụm cây theo vùng, chừa đường và khoảng hoạt động của mỗi landmark.
for (let y = 5; y < 124; y += 4)
  for (let x = 5; x < 124; x += 4) {
    const j = ((x * 73 + y * 37) % 5) - 2,
      px = x + j * 0.35,
      py = y - j * 0.25;
    if (
      roadDistance(px, py) < 3.2 ||
      highlandAreas.some((a) => Math.hypot(a.x - px, a.y - py) < 7)
    )
      continue;
    props.push({
      type:
        y > 75
          ? "tree"
          : x > 78
            ? "rock"
            : y > 40 && x < 46
              ? "cherry"
              : "bamboo",
      x: Math.round(px),
      y: Math.round(py),
    });
  }
for (const a of highlandAreas) {
  props.push(
    { type: "lantern", x: a.x - 4, y: a.y + 3 },
    { type: "lantern", x: a.x + 4, y: a.y - 3 },
  );
}
props.push(
  { type: "house", x: 12, y: 12 },
  { type: "house", x: 20, y: 12, variant: 1 },
  { type: "house", x: 61, y: 56, variant: 2 },
  { type: "gate", x: 40, y: 92 },
  { type: "house", x: 94, y: 94, variant: 2 },
);
const blocked = props.flatMap((p) =>
  p.type === "house"
    ? Array.from({ length: 12 }, (_, i) => ({
        x: p.x - 1 + (i % 4),
        y: p.y - 1 + Math.floor(i / 4),
      }))
    : ["tree", "cherry", "bamboo", "rock"].includes(p.type)
      ? [{ x: p.x, y: p.y }]
      : [],
);
export const highlands: MapDefinition = {
  id: "highlands",
  name: "Thanh Sơn Ngoại Vực",
  subtitle: "Tám địa danh trên đường sơn lộ",
  width: 128,
  height: 128,
  spawn: { x: 16, y: 17 },
  palette: "forest",
  areas: highlandAreas,
  paths: roads,
  props,
  blocked,
  spawns: [
    { monsterId: "bandit", x: 42, y: 22 },
    { monsterId: "bandit", x: 46, y: 26 },
    { monsterId: "archer", x: 47, y: 22 },
    { monsterId: "wolf", x: 31, y: 51 },
    { monsterId: "wolf", x: 29, y: 58 },
    { monsterId: "wolf", x: 33, y: 59 },
    { monsterId: "bandit", x: 70, y: 17 },
    { monsterId: "archer", x: 76, y: 23 },
    { monsterId: "assassin", x: 75, y: 17 },
    { monsterId: "viper", x: 98, y: 55 },
    { monsterId: "viper", x: 103, y: 61 },
    { monsterId: "viper", x: 100, y: 63 },
    { monsterId: "assassin", x: 37, y: 98 },
    { monsterId: "archer", x: 43, y: 99 },
    { monsterId: "bandit", x: 44, y: 94 },
    { monsterId: "boss", x: 96, y: 100 },
    { monsterId: "assassin", x: 100, y: 98 },
    { monsterId: "archer", x: 91, y: 101 },
  ],
  portals: [
    {
      id: "village",
      name: "Tân Thủ Thôn",
      x: 14,
      y: 18,
      to: "village",
      destination: { x: 25, y: 13 },
    },
  ],
};
// Bãi quái và lối đến landmark phải luôn trống, kể cả khi trang trí đổi vị trí.
const reserved = [
  ...highlands.spawns,
  ...highlandAreas,
  highlands.spawn,
  ...highlands.portals,
];
highlands.blocked = highlands.blocked.filter(
  (p) => !reserved.some((r) => Math.hypot(r.x - p.x, r.y - p.y) < 2),
);
