/**
 * Bảng màu nguyên tố — SAO CHÉP từ `apps/web/src/game/animations/atlas.ts`
 * (`elementColor`). File gốc import Phaser, nên bản 3D không import trực tiếp
 * để tránh kéo Phaser vào bundle three.
 */
export type ElementKey = "metal" | "wood" | "water" | "fire" | "earth";

export function elementColor(element: ElementKey | undefined): number {
  return {
    metal: 0xe6dca2,
    wood: 0x9fce8b,
    water: 0x9bd7e5,
    fire: 0xe9a172,
    earth: 0xcbb0ed,
  }[element ?? "earth"];
}
