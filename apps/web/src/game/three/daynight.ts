import * as THREE from "three";
/**
 * Chu kỳ ngày–đêm cho bộ hiển thị 3D.
 *
 * Công thức `nightFactorFromClock` sao chép ĐÚNG công thức của
 * `apps/web/src/game/world/daynight.ts` (dùng chung cho cả hai bộ hiển thị),
 * `dayNight3D` chỉ là bọc lại để module 3D không phụ thuộc ngược lại.
 */
import { nightFactorFromClock } from "../world/daynight";

export interface DayNightState {
  /** 0 = giữa trưa, 1 = giữa đêm. */
  night: number;
  /** 0 = ngày, 1 = đêm. */
  dusk: number;
}

export function dayNight3D(timeTicks: number): DayNightState {
  return {
    night: nightFactorFromClock(timeTicks),
    dusk: 0,
  };
}

/** Màu nền ban ngày (khớp `cameras.main.setBackgroundColor("#364c35")` của WorldScene). */
const DAY_COLOR = new THREE.Color("#364c35");
const NIGHT_COLOR = new THREE.Color("#101c2c");

/**
 * Áp dụng trạng thái ngày/đêm lên ánh sáng và nền:
 * - DirectionalLight: 1.1 → 1.1 − night·0.65
 * - HemisphereLight: 0.9 → 0.9 − night·0.45
 * - nền lerp #364c35 → #101c2c theo night
 * - fog: màu khớp nền, near/far co theo ban đêm
 */
export function applyDayNight(
  scene: THREE.Scene,
  sun: THREE.DirectionalLight,
  hemi: THREE.HemisphereLight,
  state: DayNightState,
) {
  const night = state.night;
  sun.intensity = 1.1 - night * 0.65;
  hemi.intensity = 0.9 - night * 0.45;
  const color = DAY_COLOR.clone().lerp(NIGHT_COLOR, night);
  if (scene.background instanceof THREE.Color) scene.background.copy(color);
  if (scene.fog instanceof THREE.Fog) {
    scene.fog.color.copy(color);
    scene.fog.near = 30 - night * 6;
    scene.fog.far = 75 - night * 30;
  }
}
