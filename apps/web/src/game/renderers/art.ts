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
