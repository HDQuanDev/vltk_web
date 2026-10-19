import Phaser from "phaser";
import {
  getMap,
  propAssets,
  groundTextureAsset,
} from "@kiem-hiep/game-content";
import { worldToScreen } from "@kiem-hiep/game-core";
import { ChunkWorldRenderer } from "../game/renderers/ChunkWorldRenderer";
import { createPropTextures } from "../game/renderers/art";
let renderer: ChunkWorldRenderer;
let point = { x: 22, y: 27 };
let camera: Phaser.Cameras.Scene2D.Camera;
let revision = 0;
const samples: number[] = [];
let maxCreated = 0;
function selectMap(id: string) {
  if (!renderer) return;
  renderer.changeMap(id);
  point = getMap(id).spawn;
  const p = worldToScreen(point);
  camera.centerOn(p.x, p.y);
  revision++;
  const areas = document.getElementById("areas")!;
  areas.querySelectorAll("button[data-area]").forEach((b) => b.remove());
  for (const area of getMap(id).areas ?? []) {
    const b = document.createElement("button");
    b.dataset.area = area.id;
    b.textContent = area.name;
    b.addEventListener("click", () => {
      point = area;
      const p = worldToScreen(point);
      camera.centerOn(p.x, p.y);
      revision++;
    });
    areas.append(b);
  }
}
for (const id of ["highlands", "riverlands"]) {
  const b = document.createElement("button");
  b.dataset.map = id;
  b.textContent = getMap(id).name;
  b.addEventListener("click", () => selectMap(id));
  document.getElementById("areas")!.append(b);
}
new Phaser.Game({
  type: Phaser.AUTO,
  parent: "world",
  width: innerWidth,
  height: innerHeight - 100,
  banner: false,
  audio: { noAudio: true },
  scene: {
    preload(this: Phaser.Scene) {
      this.load.image(groundTextureAsset.id, groundTextureAsset.url);
      for (const a of propAssets) this.load.image(a.id, a.url);
    },
    create(this: Phaser.Scene) {
      createPropTextures(this);
      renderer = new ChunkWorldRenderer(this);
      camera = this.cameras.main;
      camera.setZoom(0.9);
      selectMap("riverlands");
    },
    update(this: Phaser.Scene) {
      if (!renderer) return;
      const start = performance.now();
      renderer.update(point);
      const ms = performance.now() - start;
      samples.push(ms);
      if (samples.length > 240) samples.shift();
      maxCreated = Math.max(maxCreated, renderer.diagnostics.createdThisFrame);
      const sorted = [...samples].sort((a, b) => a - b);
      document.getElementById("metrics")!.textContent = JSON.stringify(
        {
          ...renderer.diagnostics,
          revision,
          textures: this.textures.getTextureKeys().length,
          objects: this.children.length,
          cpuUpdateMs: Number(ms.toFixed(3)),
          cpuP95Ms: sorted[Math.floor(sorted.length * 0.95)],
          cpuMaxMs: sorted.at(-1),
          maxCreatedPerFrame: maxCreated,
          renderer:
            this.game.renderer.type === Phaser.WEBGL ? "WebGL" : "Canvas",
          fps: Number(this.game.loop.actualFps.toFixed(1)),
        },
        null,
        2,
      );
    },
  },
});
