import { describe, expect, it } from "vitest";
import {
  PX_PER_UNIT,
  pxToUnits,
  spriteAnchorHeight,
  worldTo3D,
} from "../../apps/web/src/game/three/coords";
import {
  PICK_RADIUS,
  MOVE_INTERVAL,
  MOVE_STEP,
} from "../../apps/web/src/game/three/input-constants";
import { CAMERA_DIAGONAL } from "../../apps/web/src/game/three/camera-constants";
import { elementColor } from "../../apps/web/src/game/three/element-colors";

describe("hệ toạ độ 3D", () => {
  it("đổi world sang three giữ nguyên trục x/z", () => {
    const p = worldTo3D(3, 5, 1.5);
    expect(p.x).toBe(3);
    expect(p.y).toBe(1.5);
    expect(p.z).toBe(5);
  });

  it("quy đổi px 2D sang đơn vị thế giới bằng PX_PER_UNIT", () => {
    expect(PX_PER_UNIT).toBe(64);
    expect(pxToUnits(64)).toBe(1);
    expect(pxToUnits(112)).toBeCloseTo(1.75, 5);
  });

  it("neo chân đặt đường chân sprite đúng trên mặt đất", () => {
    // originY = feetY/frameHeight = 246/256 cho cả nhân vật và quái.
    const originY = 246 / 256;
    const height = pxToUnits(112);
    const center = spriteAnchorHeight(height, originY);
    // Điểm ảnh ở `feetY` nằm ở local `H/2 − originY·H` (origin tính từ trên).
    // Tổng lại: center + (H/2 − originY·H) = 0 → đường chân chạm mặt đất.
    const feetLocal = center + (0.5 - originY) * height;
    expect(feetLocal).toBeCloseTo(0, 10);
    // Đỉnh plane ở đúng tỉ lệ khung: center + H/2 = originY·H.
    expect(center + height / 2).toBeCloseTo(originY * height, 10);
  });

  it("camera đặt trên đường phân giác cho phép chiếu iso 2:1", () => {
    // h = d·√(2/3) → worldX → (+a, +a/2), worldZ → (−a, +a/2)
    const d = CAMERA_DIAGONAL;
    const h = d * Math.sqrt(2 / 3);
    const L = Math.hypot(d, h, d);
    const F = [-d / L, -h / L, -d / L];
    const cross = (a: number[], b: number[]) => [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
    let R = cross(F, [0, 1, 0]);
    const rl = Math.hypot(...R);
    R = R.map((v) => v / rl);
    const U = cross(R, F);
    const proj = (v: number[]) => [
      v[0] * R[0] + v[1] * R[1] + v[2] * R[2],
      -(v[0] * U[0] + v[1] * U[1] + v[2] * U[2]),
    ];
    const x = proj([1, 0, 0]);
    const z = proj([0, 0, 1]);
    // Tỉ lệ dọc/ngang = 0.5 đúng bằng worldToScreen 48:24.
    expect(Math.abs(z[1]) / Math.abs(x[0])).toBeCloseTo(0.5, 6);
    // Hướng phải màn hình = world (+x, −y) → worldX sang phải, worldZ sang trái.
    expect(x[0]).toBeGreaterThan(0);
    expect(z[0]).toBeLessThan(0);
    // Cả hai trục đều đi xuống màn hình khi tăng (khớp phép chiếu iso).
    expect(x[1]).toBeGreaterThan(0);
    expect(z[1]).toBeGreaterThan(0);
  });
});

describe("tham số tương tác 3D", () => {
  it("bán kính bắt chọn khớp quy đổi từ px 2D ( chia 68)", () => {
    expect(PICK_RADIUS.loot).toBeGreaterThan(24 / 68);
    expect(PICK_RADIUS.node).toBeGreaterThan(22 / 68);
    expect(PICK_RADIUS.monster).toBeGreaterThan(32 / 68);
    expect(PICK_RADIUS.npc).toBeGreaterThan(35 / 68);
    expect(PICK_RADIUS.portal).toBeGreaterThan(45 / 68);
  });

  it("giữ nhịp 140ms và bước 2 đơn vị như bản 2D", () => {
    expect(MOVE_INTERVAL).toBe(140);
    expect(MOVE_STEP).toBe(2);
  });
});

describe("bảng màu nguyên tố 3D", () => {
  it("khớp bảng màu của animations/atlas.ts", () => {
    expect(elementColor("metal")).toBe(0xe6dca2);
    expect(elementColor("wood")).toBe(0x9fce8b);
    expect(elementColor("water")).toBe(0x9bd7e5);
    expect(elementColor("fire")).toBe(0xe9a172);
    expect(elementColor("earth")).toBe(0xcbb0ed);
    expect(elementColor(undefined)).toBe(0xcbb0ed);
  });
});
