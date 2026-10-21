import Phaser from "phaser";
import { getPreferences, qualityBudget } from "../preferences";
import {
  ensureForegroundTextures,
  FOREGROUND_FAR_TEXTURE,
  FOREGROUND_NEAR_TEXTURE,
} from "./art";

/** Tỉ lệ chiều cao màn hình của mỗi lớp — tổng phần bị che ≤ 15%. */
const NEAR_HEIGHT = 0.11;
const FAR_HEIGHT = 0.04;
/** Hệ số trôi của từng lớp so với camera (lệch với thế giới → cảm giác sâu). */
const NEAR_PARALLAX = 0.15;
const FAR_PARALLAX = 0.3;
/**
 * Tiền cảnh: hai lớp ảnh đứng yên theo màn hình (scrollFactor 0), chỉ trượt
 * ngang theo vị trí camera. Không nhận sự kiện chuột; không vẽ đè quá 15% chiều
 * cao ở cạnh trên. Chất lượng "low" thì không tạo lớp nào.
 */
export class ForegroundRenderer {
  private near?: Phaser.GameObjects.TileSprite;
  private far?: Phaser.GameObjects.TileSprite;
  constructor(private scene: Phaser.Scene) {}
  private ensureLayers() {
    if (this.near) return;
    ensureForegroundTextures(this.scene);
    this.far = this.scene.add
      .tileSprite(0, 0, 1, 1, FOREGROUND_FAR_TEXTURE)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(9550)
      .setAlpha(0.3);
    this.near = this.scene.add
      .tileSprite(0, 0, 1, 1, FOREGROUND_NEAR_TEXTURE)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(9600)
      .setAlpha(0.55);
  }
  update() {
    const prefs = getPreferences(),
      budget = qualityBudget(this.scene.scale.width);
    if (budget.level === "low" || !prefs.parallaxForeground) {
      this.near?.setVisible(false);
      this.far?.setVisible(false);
      return;
    }
    this.ensureLayers();
    const width = this.scene.scale.width,
      height = this.scene.scale.height,
      near = this.near!,
      far = this.far!,
      scrollX = this.scene.cameras.main.scrollX,
      still = prefs.reducedMotion;
    far
      .setVisible(true)
      .setPosition(0, Math.round(height * NEAR_HEIGHT))
      .setSize(width, Math.max(1, Math.round(height * FAR_HEIGHT)))
      .setTilePosition(still ? 0 : -((scrollX * FAR_PARALLAX) % far.width), 0);
    near
      .setVisible(true)
      .setSize(width, Math.max(1, Math.round(height * NEAR_HEIGHT)))
      .setTilePosition(
        still ? 0 : -((scrollX * NEAR_PARALLAX) % near.width),
        0,
      );
  }
  destroy() {
    this.near?.destroy();
    this.far?.destroy();
    this.near = undefined;
    this.far = undefined;
  }
}
