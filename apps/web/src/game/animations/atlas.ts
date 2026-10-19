import type Phaser from "phaser";
import {
  actorVisualManifest,
  type SkillDefinition,
} from "@kiem-hiep/game-content";
import type { AnimationState, Direction8 } from "@kiem-hiep/game-protocol";
type Point = { x: number; y: number };
function polygon(
  g: CanvasRenderingContext2D,
  points: Point[],
  fill: string,
  stroke = "#17292b",
) {
  g.beginPath();
  points.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = stroke;
  g.lineWidth = 0.7;
  g.stroke();
}
function line(
  g: CanvasRenderingContext2D,
  a: Point,
  b: Point,
  color: string,
  width = 1,
) {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(a.x, a.y);
  g.lineTo(b.x, b.y);
  g.stroke();
}
function oval(
  g: CanvasRenderingContext2D,
  p: Point,
  rx: number,
  ry: number,
  color: string,
  angle = 0,
) {
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(p.x, p.y, rx, ry, angle, 0, Math.PI * 2);
  g.fill();
}
function human(
  g: CanvasRenderingContext2D,
  direction: Direction8,
  state: AnimationState,
  frame: number,
  weapon: string,
  female = false,
) {
  const a = (direction * Math.PI) / 4,
    cycle = (frame / 6) * Math.PI * 2,
    swing = state === "walk" ? Math.sin(cycle) : 0,
    breath = state === "idle" ? Math.sin(cycle) * 0.6 : 0,
    death =
      state === "dead" ? frame / 5 : state === "revive" ? 1 - frame / 5 : 0,
    hit = state === "hit" ? Math.sin((frame / 5) * Math.PI) * 3 : 0,
    attack = state === "attack" ? Math.sin((frame / 5) * Math.PI) : 0;
  const f = { x: Math.cos(a), y: Math.sin(a) },
    r = { x: -Math.sin(a), y: Math.cos(a) };
  const project = (l: number, v: number, z: number): Point => ({
    x: 32 + r.x * l + f.x * (v + death * 15 - hit),
    y:
      88 +
      (r.y * l + f.y * (v + death * 15 - hit)) * 0.45 -
      z * (1 - death * 0.84) +
      breath,
  });
  const shoulderL = project(-7, 0, 51),
    shoulderR = project(7, 0, 51),
    leftFoot = project(-4, swing * 5, 3 + Math.max(0, -swing) * 3),
    rightFoot = project(4, -swing * 5, 3 + Math.max(0, swing) * 3),
    pelvisL = project(-4, 0, 27),
    pelvisR = project(4, 0, 27);
  line(g, pelvisL, leftFoot, "#263844", 5);
  line(g, pelvisR, rightFoot, "#263844", 5);
  line(g, leftFoot, project(-4, swing * 5 + 5, 1), "#172a33", 4);
  line(g, rightFoot, project(4, -swing * 5 + 5, 1), "#172a33", 4);
  // Bao lồi của thân áo có bề dày để góc nhìn nghiêng không biến thành một đường.
  const points = [-1, 1].flatMap((side) =>
    [-1, 1].flatMap((front) => [
      project(side * 7, front * 4, 51),
      project(
        side * (female ? 12 : 10),
        front * 5 + swing * side * 1.5,
        female ? 8 : 14,
      ),
    ]),
  );
  points.sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (a: Point, b: Point, c: Point) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const half = (source: Point[]) => {
    const out: Point[] = [];
    for (const point of source) {
      while (
        out.length > 1 &&
        cross(out[out.length - 2], out[out.length - 1], point) <= 0
      )
        out.pop();
      out.push(point);
    }
    return out.slice(0, -1);
  };
  const hull = [...half(points), ...half([...points].reverse())];
  g.beginPath();
  hull.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
  g.closePath();
  const gradient = g.createLinearGradient(20, 34, 46, 78);
  gradient.addColorStop(0, "#294555");
  gradient.addColorStop(0.48, "#88adb3");
  gradient.addColorStop(1, "#345b68");
  g.fillStyle = gradient;
  g.fill();
  g.strokeStyle = "#172d36";
  g.lineWidth = 0.8;
  g.stroke();
  for (let j = -6; j <= 6; j += 3)
    line(g, project(j, 2, 39), project(j * 1.3, 2, 16), "#92b1b24a", 0.6);
  const arm = (side: number, frontLayer: boolean) => {
    const shoulder = side < 0 ? shoulderL : shoulderR,
      reach =
        state === "attack" && side > 0
          ? attack * 16
          : state === "cast"
            ? 8
            : state === "interact"
              ? 8
              : side * swing * 4;
    const elbow = project(side * 10, reach * 0.5, 39 + attack * 5),
      hand = project(
        side * 9,
        reach,
        31 + (state === "cast" ? 15 : 0) + attack * 12,
      );
    line(g, shoulder, elbow, frontLayer ? "#507b8b" : "#2d5263", 6);
    line(g, elbow, hand, "#c9cebc", 4.6);
    line(g, elbow, hand, "#9dafaa", 1);
    oval(g, hand, 2.7, 2.9, "#d8b799");
    if (side > 0) drawWeapon(g, hand, f, a, state, frame, weapon);
  };
  const farSide = r.y > 0 ? -1 : 1;
  arm(farSide, false);
  polygon(
    g,
    [
      project(-7, 4, 49),
      project(0, 5, 37),
      project(7, 4, 49),
      project(5, 5, 40),
      project(0, 6, 31),
      project(-6, 5, 42),
    ],
    "#e2dfc4",
  );
  polygon(
    g,
    [
      project(-8, 3, 32),
      project(8, 3, 32),
      project(8, 3, 28),
      project(-8, 3, 28),
    ],
    "#314d54",
    "#bca469",
  );
  line(g, project(2, 5, 29), project(7, 4, 14), "#d3b56d", 1.8);
  line(g, project(-7, 3, 31), project(7, 3, 31), "#c7b27a", 0.8);
  const head = project(0, 0, 65);
  oval(g, head, 7.4, 9, "#17252c");
  if (female) {
    const tail = project(-3, -7, 39 + swing * 1.5);
    line(g, { x: head.x - f.x * 3, y: head.y - 5 }, tail, "#13242a", 5);
    line(
      g,
      { x: head.x - f.x * 3 + 1, y: head.y - 3 },
      { x: tail.x + 2, y: tail.y - 2 },
      "#426069",
      1.3,
    );
    line(g, project(-5, -4, 60), project(-8, -6, 50), "#d3b477", 1);
  }
  const back = Math.sin(a) < -0.2;
  const face = { x: head.x + f.x * 2.2, y: head.y + 2 };
  if (!back) {
    oval(g, face, Math.abs(Math.sin(a)) * 2 + 3.8, 7, "#d9bba1");
    line(
      g,
      { x: face.x + f.x * 0.5, y: face.y - 1 },
      { x: face.x + f.x * 3, y: face.y - 1 },
      "#3d3b34",
      0.9,
    );
    line(
      g,
      { x: face.x + f.x * 2, y: face.y + 2 },
      { x: face.x + f.x * 3, y: face.y + 3 },
      "#9b775f",
      0.7,
    );
  }
  polygon(
    g,
    [
      { x: head.x - 7, y: head.y - 5 },
      { x: head.x, y: head.y - 10 },
      { x: head.x + 7, y: head.y - 5 },
      { x: head.x + 5, y: head.y - 1 },
      { x: head.x, y: head.y - 6 },
      { x: head.x - 5, y: head.y + 2 },
    ],
    "#1a2b33",
  );
  oval(g, { x: head.x, y: head.y - 10 }, 3.7, 4, "#17272c");
  line(
    g,
    { x: head.x - 4, y: head.y - 8 },
    { x: head.x + 4, y: head.y - 8 },
    "#c8b782",
    1.4,
  );
  if (back) {
    line(g, project(0, -2, 64), project(0, -4, 40), "#1c2f36", 5);
    line(g, project(0, -2, 63), project(1, -4, 41), "#3d5558", 1);
    const symbol = project(0, -3, 42);
    oval(g, symbol, 3, 3, "#aaaD8a");
    oval(g, { x: symbol.x - 1, y: symbol.y }, 1.4, 1.4, "#34515a");
  }
  arm(-farSide, true);
  if (state === "cast") {
    const hand = project(9, 8, 46);
    oval(g, hand, 4, 4, "#a9dbd28a");
    oval(g, hand, 2, 2, "#e5f4da");
  }
}
function drawWeapon(
  g: CanvasRenderingContext2D,
  hand: Point,
  f: Point,
  a: number,
  state: AnimationState,
  frame: number,
  weapon: string,
) {
  const sweep = state === "attack" ? (frame / 5 - 0.5) * 2.5 : 0,
    angle = a + sweep,
    dx = Math.cos(angle),
    dy = Math.sin(angle) * 0.45;
  const tip = { x: hand.x + dx * 24, y: hand.y + dy * 24 - 12 };
  if (weapon === "bow") {
    g.strokeStyle = "#bfaa73";
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(hand.x - 6, hand.y - 13);
    g.quadraticCurveTo(hand.x + 12 * f.x, hand.y - 7, hand.x + 6, hand.y + 10);
    g.stroke();
    line(
      g,
      { x: hand.x - 6, y: hand.y - 13 },
      { x: hand.x + 6, y: hand.y + 10 },
      "#d3d5b5",
      0.5,
    );
    line(g, hand, tip, "#c5cdb9", 0.9);
    return;
  }
  if (weapon === "staff" || weapon === "spear") {
    const end = { x: hand.x - dx * 13, y: hand.y - dy * 13 + 13 };
    line(g, end, tip, "#d1b273", 2);
    line(g, end, tip, "#8c7050", 0.7);
    if (weapon === "spear")
      polygon(
        g,
        [
          { x: tip.x - dx * 3, y: tip.y - dy * 3 + 3 },
          { x: tip.x + dx * 8, y: tip.y + dy * 8 - 8 },
          { x: tip.x + 3, y: tip.y + 3 },
        ],
        "#d5e1d9",
      );
    return;
  }
  const length = weapon === "dagger" ? 14 : 24;
  const bladeTip = { x: hand.x + dx * length, y: hand.y + dy * length - 13 };
  polygon(
    g,
    [
      { x: hand.x - 1.5, y: hand.y - 1 },
      { x: bladeTip.x, y: bladeTip.y },
      { x: hand.x + 2, y: hand.y + 1 },
    ],
    "#d9e4df",
    "#829c9f",
  );
  line(
    g,
    { x: hand.x - 4, y: hand.y - 2 },
    { x: hand.x + 4, y: hand.y + 2 },
    "#cfb477",
    1.6,
  );
  line(g, hand, { x: hand.x - dx * 5, y: hand.y - dy * 5 + 3 }, "#66583b", 2);
}
function beast(
  g: CanvasRenderingContext2D,
  direction: Direction8,
  state: AnimationState,
  frame: number,
  snake: boolean,
) {
  const a = (direction * Math.PI) / 4,
    f = { x: Math.cos(a), y: Math.sin(a) * 0.55 },
    r = { x: -Math.sin(a), y: Math.cos(a) * 0.55 },
    walk = state === "walk" ? Math.sin((frame / 6) * Math.PI * 2) * 3 : 0,
    dead =
      state === "dead" ? frame / 5 : state === "revive" ? 1 - frame / 5 : 0;
  const p = (side: number, forward: number, z: number) => ({
    x: 32 + r.x * side + f.x * forward,
    y: 88 + r.y * side + f.y * forward - z * (1 - dead * 0.75),
  });
  if (snake) {
    for (let j = 8; j >= 0; j--) {
      const q = p(
        Math.sin(j * 0.8 + frame * 0.6) * 3,
        j * 3 - 15,
        3 + (j < 3 ? 10 - j * 2 : 0),
      );
      oval(g, q, 4 - j * 0.15, 3.5, "#648a5a");
      if (j % 2 === 0) oval(g, { x: q.x, y: q.y - 1 }, 2, 1.4, "#a4b67a");
    }
    const h = p(0, 14, 12);
    polygon(
      g,
      [
        { x: h.x - 5, y: h.y },
        { x: h.x + f.x * 8, y: h.y + f.y * 8 - 4 },
        { x: h.x + 5, y: h.y + 3 },
      ],
      "#819953",
    );
    oval(g, { x: h.x + 2, y: h.y - 1 }, 1, 1, "#e9d68c");
    return;
  }
  for (const side of [-1, 1])
    for (const forward of [-8, 8]) {
      const top = p(side * 4, forward, 15),
        foot = p(side * 6, forward + (forward > 0 ? walk : -walk) * side, 1);
      line(g, top, foot, "#6d8378", 4);
      line(g, foot, { x: foot.x + f.x * 4, y: foot.y + f.y * 4 }, "#b7c3a6", 3);
    }
  const tail = p(0, -15, 15),
    tailEnd = p(Math.sin(frame * 0.7) * 4, -27, 20);
  line(g, tail, tailEnd, "#889b86", 5);
  const body = p(0, 0, 17);
  oval(g, body, 16, 8, "#8d9f8a", Math.atan2(f.y, f.x));
  const neck = p(0, 13, 22);
  oval(g, neck, 8, 10, "#a9b6a0");
  const head = p(0, 18, 27);
  oval(g, head, 7, 7, "#9eaf99");
  polygon(
    g,
    [
      { x: head.x - 6, y: head.y - 3 },
      { x: head.x - 5, y: head.y - 12 },
      { x: head.x, y: head.y - 5 },
    ],
    "#6d8370",
  );
  polygon(
    g,
    [
      { x: head.x + 2, y: head.y - 5 },
      { x: head.x + 7, y: head.y - 12 },
      { x: head.x + 7, y: head.y },
    ],
    "#6d8370",
  );
  const nose = p(0, 24, 23);
  oval(g, nose, 4, 3, "#d1d6bd");
  oval(g, { x: nose.x + f.x * 2, y: nose.y }, 1.6, 1.4, "#2a4437");
  if (Math.sin(a) > -0.5) {
    oval(g, { x: head.x - 2, y: head.y - 1 }, 1, 1, "#e6cc79");
    oval(g, { x: head.x + 3, y: head.y - 1 }, 1, 1, "#e6cc79");
  }
  for (let j = 0; j < 5; j++) {
    const q = p(j - 2, 2, 22);
    line(g, q, { x: q.x + f.x * 5, y: q.y + f.y * 5 }, "#c2ccb1", 0.6);
  }
}
export function drawActorFrame(
  g: CanvasRenderingContext2D,
  direction: Direction8,
  state: AnimationState,
  frame: number,
  weapon: string,
) {
  if (weapon === "wolf" || weapon === "viper")
    beast(g, direction, state, frame, weapon === "viper");
  else
    human(
      g,
      direction,
      state,
      frame,
      weapon.replace("female:", ""),
      weapon.startsWith("female:"),
    );
}
export function actorTexture(scene: Phaser.Scene, weapon: string) {
  const key = `actor:${weapon}`;
  if (scene.textures.exists(key)) return key;
  const c = document.createElement("canvas");
  c.width = 64 * 48;
  c.height = 96 * 8;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = true;
  for (const [row, state] of actorVisualManifest.states.entries())
    for (let direction = 0; direction < 8; direction++)
      for (let frame = 0; frame < 6; frame++) {
        g.save();
        g.translate((direction * 6 + frame) * 64, row * 96);
        g.beginPath();
        g.rect(0, 0, 64, 96);
        g.clip();
        g.translate(32, 0);
        g.scale(0.74, 1);
        g.translate(-32, 0);
        drawActorFrame(g, direction as Direction8, state, frame, weapon);
        g.restore();
      }
  const texture = scene.textures.addCanvas(key, c);
  if (!texture) throw new Error("Không tạo được atlas nhân vật.");
  for (let row = 0; row < 8; row++)
    for (let col = 0; col < 48; col++)
      texture.add(row * 48 + col, 0, col * 64, row * 96, 64, 96);
  return key;
}
export function elementColor(element: SkillDefinition["element"]) {
  return {
    metal: 0xe6dca2,
    wood: 0x9fce8b,
    water: 0x9bd7e5,
    fire: 0xe9a172,
    earth: 0xcbb0ed,
  }[element ?? "earth"];
}
