import { describe, expect, it } from "vitest";
import {
  BOB_AMPLITUDE_PX,
  CAMERA_SMOOTHING,
  DIRECTION_HOLD_MS,
  HIT_AT_CYCLE,
  HITSTOP_MS,
  KNOCKBACK_ELITE_PX,
  KNOCKBACK_PX,
  LUNGE_PX,
  STEP_CYCLE_PX,
  bobOffset,
  dampingFactor,
  knockbackOffset,
  lerp,
  lungeOffset,
  settleBob,
  shadowScale,
  shouldAdoptDirection,
} from "../../apps/web/src/game/renderers/motion";
import {
  APP_BUILD_LABEL,
  APP_VERSION,
  APP_VERSION_LABEL,
} from "../../apps/web/src/app/version";

describe("motion (Phần B)", () => {
  it("nhịp chân theo quãng đường: 28px = 1 chu kỳ 2 khung", () => {
    expect(STEP_CYCLE_PX).toBe(28);
    // Nửa chu kỳ đầu dùng khung 0, nửa sau khung 1 (cùng công thức với spriteStateName).
    expect(Math.floor(0 / (STEP_CYCLE_PX / 2)) % 2).toBe(0);
    expect(Math.floor(14 / (STEP_CYCLE_PX / 2)) % 2).toBe(1);
    expect(Math.floor(28 / (STEP_CYCLE_PX / 2)) % 2).toBe(0);
  });

  it("nhún thân: biên độ 1.5px, cao nhất giữa mỗi nửa chu kỳ, về 0 khi dừng", () => {
    expect(BOB_AMPLITUDE_PX).toBe(1.5);
    expect(bobOffset(0)).toBeCloseTo(0);
    expect(bobOffset(STEP_CYCLE_PX / 4)).toBeCloseTo(-BOB_AMPLITUDE_PX);
    expect(bobOffset(STEP_CYCLE_PX / 2)).toBeCloseTo(0);
    let bob = bobOffset(7);
    for (let i = 0; i < 20; i++) bob = settleBob(bob, 10);
    expect(bob).toBe(0);
  });

  it("bóng co giãn ngược pha trong ±8%", () => {
    const low = shadowScale(-BOB_AMPLITUDE_PX);
    const high = shadowScale(0);
    expect(low).toBeGreaterThan(0.9);
    expect(low).toBeLessThan(1);
    expect(high).toBeGreaterThan(1);
    expect(high).toBeLessThan(1.1);
  });

  it("hysteresis hướng: giữ 100ms, đổi ngay khi quay > 90°", () => {
    expect(DIRECTION_HOLD_MS).toBe(100);
    expect(shouldAdoptDirection(0, 1, 40)).toBe(false);
    expect(shouldAdoptDirection(0, 1, 120)).toBe(true);
    expect(shouldAdoptDirection(0, 4, 10)).toBe(true);
    expect(shouldAdoptDirection(2, 2, 0)).toBe(false);
  });

  it("lao tới: tối đa 8px tại 35% chu kỳ rồi trả về 0", () => {
    expect(LUNGE_PX).toBe(8);
    expect(lungeOffset(0)).toBeCloseTo(0);
    expect(lungeOffset(HIT_AT_CYCLE)).toBeCloseTo(LUNGE_PX);
    expect(lungeOffset(1)).toBeCloseTo(0);
  });

  it("trượt lùi: 10px (tinh anh 4px), ra 60ms, giữ 40ms, về trong 140ms", () => {
    expect(KNOCKBACK_PX).toBe(10);
    expect(KNOCKBACK_ELITE_PX).toBe(4);
    expect(knockbackOffset(0)).toBe(0);
    expect(knockbackOffset(60)).toBeCloseTo(KNOCKBACK_PX);
    expect(knockbackOffset(90)).toBeCloseTo(KNOCKBACK_PX);
    expect(knockbackOffset(240)).toBeCloseTo(0);
    expect(knockbackOffset(240, KNOCKBACK_ELITE_PX)).toBe(0);
  });

  it("dừng hình 35ms và giảm chấn camera theo 1 − e^(−8·dt)", () => {
    expect(HITSTOP_MS).toBe(35);
    expect(CAMERA_SMOOTHING).toBe(8);
    expect(dampingFactor(1000)).toBeCloseTo(1 - Math.exp(-8), 5);
    expect(dampingFactor(0)).toBe(0);
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
});

describe("phiên bản hiển thị (A3)", () => {
  it("một nguồn duy nhất, đúng định dạng yêu cầu", () => {
    expect(APP_VERSION).toBe("0.6.1");
    expect(APP_VERSION_LABEL).toMatch(/^v0\.6\.1 · \d{2}\/\d{2}\/\d{4}$/);
    expect(APP_BUILD_LABEL).toBe(`BẢN OFFLINE · ${APP_VERSION_LABEL}`);
  });
});
