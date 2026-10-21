import Phaser from "phaser";
function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, g: c.getContext("2d")! };
}
function polygon(
  g: CanvasRenderingContext2D,
  points: number[][],
  fill: string,
  stroke?: string,
) {
  g.beginPath();
  points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = 1;
    g.stroke();
  }
}
export function createPropTextures(scene: Phaser.Scene) {
  for (const type of ["rock", "lantern", "gate"] as const)
    for (let variant = 0; variant < 1; variant++) {
      const key = `${type}:${variant}`;
      if (scene.textures.exists(key)) continue;
      const { c, g } = canvas(512, 440);
      if (type === "rock") {
        polygon(
          g,
          [
            [210, 365],
            [198, 338],
            [226, 301],
            [273, 307],
            [299, 345],
            [282, 373],
          ],
          "#717a67",
          "#435347",
        );
        polygon(
          g,
          [
            [198, 338],
            [226, 301],
            [260, 330],
            [244, 364],
            [210, 365],
          ],
          "#929783",
        );
        polygon(
          g,
          [
            [226, 301],
            [273, 307],
            [260, 330],
          ],
          "#b2ad94",
        );
      } else if (type === "lantern") {
        g.strokeStyle = "#443d29";
        g.lineWidth = 6;
        g.beginPath();
        g.moveTo(256, 365);
        g.lineTo(256, 267);
        g.lineTo(276, 267);
        g.stroke();
        g.fillStyle = "#e7b76b";
        g.fillRect(251, 362, 10, 4);
        g.fillStyle = "#b64a32";
        g.beginPath();
        g.ellipse(275, 290, 12, 18, 0, 0, 7);
        g.fill();
        g.strokeStyle = "#e2b668";
        g.lineWidth = 2;
        g.strokeRect(264, 276, 22, 29);
        g.beginPath();
        g.moveTo(275, 308);
        g.lineTo(275, 323);
        g.stroke();
      } else if (type === "gate") {
        g.strokeStyle = "#766247";
        g.lineWidth = 13;
        g.beginPath();
        g.moveTo(173, 365);
        g.lineTo(173, 226);
        g.moveTo(331, 289);
        g.lineTo(331, 154);
        g.moveTo(151, 233);
        g.lineTo(352, 139);
        g.stroke();
        g.strokeStyle = "#b2a17a";
        g.lineWidth = 3;
        g.stroke();
        polygon(
          g,
          [
            [141, 226],
            [179, 194],
            [336, 119],
            [362, 136],
            [341, 150],
            [170, 232],
          ],
          "#3a5050",
          "#b0a27c",
        );
        polygon(
          g,
          [
            [224, 212],
            [285, 182],
            [285, 209],
            [224, 239],
          ],
          "#3e4130",
          "#b6a26a",
        );
        g.save();
        g.translate(232, 228);
        g.transform(1, -0.45, 0, 1, 0, 0);
        g.font = "14px serif";
        g.fillStyle = "#dbc995";
        g.fillText("清竹林", 0, 0);
        g.restore();
      }
      scene.textures.addCanvas(key, c);
    }
}

/** Khóa texture đốm sáng dùng chung cho đèn lồng và nhân vật. */
export const GLOW_TEXTURE = "fx:lantern-glow";
export const DEPTH_FOG_TEXTURE = "fx:depth-fog";
export const FOREGROUND_NEAR_TEXTURE = "fx:foreground-near";
export const FOREGROUND_FAR_TEXTURE = "fx:foreground-far";
/**
 * Đốm sáng tròn mềm (radial gradient) vẽ MỘT LẦN rồi dùng lại cho mọi đèn lồng.
 * Dùng ảnh + blend ADD thay cho PointLight để chạy được cả khi Phaser rơi về
 * Canvas renderer và để đếm được theo ngân sách chất lượng.
 */
export function ensureGlowTexture(scene: Phaser.Scene, color = "255,195,122") {
  if (scene.textures.exists(GLOW_TEXTURE)) return GLOW_TEXTURE;
  const size = 128;
  const { c, g } = canvas(size, size);
  const gradient = g.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, `rgba(${color},0.85)`);
  gradient.addColorStop(0.45, `rgba(${color},0.32)`);
  gradient.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = gradient;
  g.fillRect(0, 0, size, size);
  scene.textures.addCanvas(GLOW_TEXTURE, c);
  return GLOW_TEXTURE;
}
/**
 * Sương theo chiều sâu: hai dải gradient đứng yên — mép trên đậm 0.14 rồi tắt
 * hẳn ở 30% chiều cao, đáy mờ 0.08 (dải 38% cuối). Khoảng giữa trong suốt nên
 * không vẽ, tiết kiệm fill-rate mà hình không đổi. Alpha tổng do renderer nhân.
 */
export function ensureDepthFogTextures(scene: Phaser.Scene) {
  const top = `${DEPTH_FOG_TEXTURE}-top`,
    bottom = `${DEPTH_FOG_TEXTURE}-bottom`;
  if (!scene.textures.exists(top)) {
    const { c, g } = canvas(8, 77);
    const gradient = g.createLinearGradient(0, 0, 0, 77);
    gradient.addColorStop(0, "rgba(223,233,234,0.14)");
    gradient.addColorStop(1, "rgba(223,233,234,0)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, 8, 77);
    scene.textures.addCanvas(top, c);
  }
  if (!scene.textures.exists(bottom)) {
    const { c, g } = canvas(8, 98);
    const gradient = g.createLinearGradient(0, 0, 0, 98);
    gradient.addColorStop(0, "rgba(223,233,234,0)");
    gradient.addColorStop(1, "rgba(223,233,234,0.08)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, 8, 98);
    scene.textures.addCanvas(bottom, c);
  }
  return { top, bottom } as const;
}
/**
 * Hai lớp tiền cảnh parallax vẽ bằng canvas (không cắt từ texture prop vì prop
 * house/tree có viền trong suốt lớn, cắt ngọn sẽ lộ nền cắt vuông).
 * Trả về [gần, xa] — mỗi texture cao 256px, được tile ngang nên mép khép kín.
 */
export function ensureForegroundTextures(scene: Phaser.Scene) {
  if (!scene.textures.exists(FOREGROUND_NEAR_TEXTURE)) {
    const { c, g } = canvas(512, 256);
    // Tán lá phía trên + hai cụm cành hai bên: silhouette tối, mép dưới răng cưa.
    g.fillStyle = "#1d2b22";
    for (let i = 0; i < 7; i++) {
      const x = i * 76 + 20;
      const r = 48 + (i % 3) * 12;
      g.beginPath();
      g.ellipse(x, 18 + (i % 2) * 10, r, r * 0.62, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.ellipse(x + 34, 6, r * 0.8, r * 0.5, 0, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 5; i++) {
      g.strokeStyle = "#1a2721";
      g.lineWidth = 5 - (i % 2);
      g.beginPath();
      g.moveTo(i * 118 + 30, 60);
      g.quadraticCurveTo(i * 118 + 70, 92, i * 118 + 104, 74);
      g.stroke();
    }
    scene.textures.addCanvas(FOREGROUND_NEAR_TEXTURE, c);
  }
  if (!scene.textures.exists(FOREGROUND_FAR_TEXTURE)) {
    const { c, g } = canvas(512, 256);
    // Mây mờ lớn: chồng nhiều elip alpha thấp để không thành mảng đặc.
    g.fillStyle = "rgba(226,235,231,0.5)";
    for (let i = 0; i < 9; i++) {
      const x = (i * 143) % 512;
      const y = 70 + (i % 3) * 26;
      g.beginPath();
      g.ellipse(x, y, 96 - (i % 3) * 16, 34 - (i % 3) * 6, 0, 0, Math.PI * 2);
      g.fill();
    }
    scene.textures.addCanvas(FOREGROUND_FAR_TEXTURE, c);
  }
  return [FOREGROUND_NEAR_TEXTURE, FOREGROUND_FAR_TEXTURE] as const;
}
