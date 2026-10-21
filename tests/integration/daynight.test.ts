import { describe, expect, it } from "vitest";
import {
  DAY_TICKS,
  dayPhaseFromClock,
  duskFactorFromClock,
  nightFactorFromClock,
} from "../../apps/web/src/game/world/daynight";
describe("chu kỳ ngày–đêm dùng chung", () => {
  it("giữ nguyên công thức độ tối ban đêm của EnvironmentRenderer", () => {
    for (const ticks of [0, 1500, 6000, 12000, 18000, 23999]) {
      const day = (ticks % DAY_TICKS) / DAY_TICKS;
      expect(nightFactorFromClock(ticks)).toBe(
        Math.max(0, -Math.sin(day * Math.PI * 2)),
      );
    }
    expect(nightFactorFromClock(6000)).toBe(0);
    expect(nightFactorFromClock(18000)).toBe(1);
  });
  it("tông hoàng hôn bằng 0 giữa trưa/giữa đêm và bằng 1 ở hai chuyển giao", () => {
    expect(duskFactorFromClock(6000)).toBeCloseTo(0, 6);
    expect(duskFactorFromClock(18000)).toBeCloseTo(0, 6);
    expect(duskFactorFromClock(0)).toBeCloseTo(1, 6);
    expect(duskFactorFromClock(12000)).toBeCloseTo(1, 6);
  });
  it("biến thiên mượt trong cả vòng: không nhảy quá 0.02 mỗi 10 tick", () => {
    for (let tick = 0; tick < DAY_TICKS * 2; tick += 10) {
      expect(
        Math.abs(duskFactorFromClock(tick + 10) - duskFactorFromClock(tick)),
      ).toBeLessThan(0.02);
      expect(
        Math.abs(nightFactorFromClock(tick + 10) - nightFactorFromClock(tick)),
      ).toBeLessThan(0.02);
    }
  });
  it("chuẩn hóa cả tick âm về đúng pha trong ngày", () => {
    for (const ticks of [-1, -6000, -24001]) {
      const phase = dayPhaseFromClock(ticks);
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(1);
    }
    expect(dayPhaseFromClock(-6000)).toBeCloseTo(0.75, 6);
  });
});
