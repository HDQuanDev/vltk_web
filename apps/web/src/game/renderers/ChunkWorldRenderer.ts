import Phaser from "phaser";
import {
  getMap,
  propAssets,
  groundTextureAsset,
  segmentDistance,
  type MapDefinition,
  type MapProp,
} from "@kiem-hiep/game-content";
import { worldToScreen } from "@kiem-hiep/game-core";
import {
  CHUNK_SIZE,
  chunkBounds,
  visibleChunks,
  type ChunkPosition,
} from "../world/chunks";
import { getPreferences, qualityBudget } from "../preferences";
interface ChunkView {
  terrain: Phaser.GameObjects.Image;
  props: Phaser.GameObjects.Image[];
  texture: string;
  bytes: number;
  used: number;
}
const hash = (x: number, y: number) => {
  let s =
    (Math.imul(x + 1237, 374761393) ^ Math.imul(y + 2341, 668265263)) >>> 0;
  s = Math.imul(s ^ (s >>> 13), 1274126177) >>> 0;
  return (s ^ (s >>> 16)) >>> 0;
};
const terrainIndices = new WeakMap<
  MapDefinition,
  { water: Set<number>; bridges: Set<number> }
>();
function terrainIndex(map: MapDefinition) {
  let index = terrainIndices.get(map);
  if (!index) {
    index = {
      water: new Set(map.water?.map((p) => p.y * map.width + p.x)),
      bridges: new Set(map.bridges?.map((p) => p.y * map.width + p.x)),
    };
    terrainIndices.set(map, index);
  }
  return index;
}
function terrainCanvas(
  map: MapDefinition,
  chunk: ChunkPosition,
  resolution: number,
  material: CanvasImageSource,
) {
  const bounds = chunkBounds(chunk.x, chunk.y),
    c = document.createElement("canvas");
  c.width = Math.ceil(bounds.width * resolution);
  c.height = Math.ceil(bounds.height * resolution);
  const g = c.getContext("2d")!;
  g.scale(resolution, resolution);
  g.translate(-bounds.x, -bounds.y);
  const terrain = terrainIndex(map);
  const pattern = g.createPattern(material, "repeat")!;
  pattern.setTransform(new DOMMatrix([0.6, 0.3, -0.6, 0.3, 0, 0]));
  for (let y = chunk.y * CHUNK_SIZE; y < (chunk.y + 1) * CHUNK_SIZE; y++)
    for (let x = chunk.x * CHUNK_SIZE; x < (chunk.x + 1) * CHUNK_SIZE; x++) {
      const p = worldToScreen({ x, y }),
        seed = hash(x, y),
        inside = x >= 0 && y >= 0 && x < map.width && y < map.height;
      const plaza =
        map.id === "village" && x >= 8 && x <= 21 && y >= 9 && y <= 20;
      const path = map.paths
        ? map.paths.some((r) =>
            r.slice(1).some((b, i) => segmentDistance(x, y, r[i], b) < 1.8),
          )
        : Math.abs(x - y) < 2 ||
          (map.id === "village" && x > 19 && y > 19) ||
          (map.id === "camp" && x > 9 && x < 23 && y > 10 && y < 23);
      const water =
        (map.id === "village" && x >= 1 && x < 4 && y >= 17 && y < 29) ||
        terrain.water.has(y * map.width + x);
      const bridge = terrain.bridges.has(y * map.width + x);
      const ground =
        map.palette === "camp"
          ? ["#565143", "#5c5546", "#625a49", "#5b5846"]
          : map.palette === "village"
            ? ["#52613c", "#59683f", "#4e6039", "#5d6b42"]
            : ["#344d35", "#3c553a", "#405b3a", "#3c5035"];
      const color = !inside
        ? ["#263d30", "#2b4233", "#304334"][seed % 3]
        : water
          ? "#3d6966"
          : plaza
            ? ["#9b9380", "#a69c87", "#a39a85", "#aea28d"][seed % 4]
            : bridge
              ? "#92704e"
              : path
                ? "#837555"
                : ground[seed % 4];
      g.beginPath();
      g.moveTo(p.x, p.y - 24);
      g.lineTo(p.x + 48, p.y);
      g.lineTo(p.x, p.y + 24);
      g.lineTo(p.x - 48, p.y);
      g.closePath();
      g.fillStyle = color;
      g.fill();
      g.save();
      g.clip();
      if (!plaza && !water) {
        g.fillStyle = pattern;
        g.globalAlpha = path ? 0.15 : 1;
        g.fillRect(p.x - 49, p.y - 25, 98, 50);
        g.globalAlpha = 1;
        if (!inside || map.palette === "forest" || map.palette === "camp") {
          g.fillStyle = map.palette === "camp" ? "#463a24" : "#163b2b";
          g.globalAlpha = !inside ? 0.48 : 0.18;
          g.fillRect(p.x - 49, p.y - 25, 98, 50);
          g.globalAlpha = 1;
        }
      }
      if (plaza) {
        g.strokeStyle = "#6b6b5c80";
        g.lineWidth = 1;
        for (let i = -2; i < 3; i++) {
          g.beginPath();
          g.moveTo(p.x - 48, p.y + i * 12);
          g.lineTo(p.x + 48, p.y + i * 12 + 44);
          g.stroke();
          g.beginPath();
          g.moveTo(p.x - 48, p.y + i * 12);
          g.lineTo(p.x + 48, p.y + i * 12 - 44);
          g.stroke();
        }
        g.strokeStyle = "#c9c0a050";
        g.beginPath();
        g.moveTo(p.x - 46, p.y - 1);
        g.lineTo(p.x, p.y - 23);
        g.lineTo(p.x + 46, p.y - 1);
        g.stroke();
      }
      let random = seed;
      for (let i = 0; i < (plaza ? 7 : path || water ? 32 : 2); i++) {
        random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
        const px = p.x + (random % 960) / 10 - 48;
        random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
        const py = p.y + (random % 480) / 10 - 24;
        g.fillStyle = water
          ? "#8db0a83a"
          : plaza
            ? "#5a5c4e30"
            : path
              ? "#c4b38a30"
              : i % 4 === 0
                ? "#a7a46a50"
                : "#1b382b45";
        g.fillRect(px, py, 1 + (random % 3), plaza ? 1 : 2 + (random % 4));
      }
      if (bridge) {
        g.strokeStyle = "#3f3427";
        for (let i = -24; i <= 24; i += 6) {
          g.beginPath();
          g.moveTo(p.x - 48, p.y + i);
          g.lineTo(p.x + 48, p.y + i + 48);
          g.stroke();
        }
      }
      if (water) {
        g.strokeStyle = "#a6c0ad44";
        g.beginPath();
        g.moveTo(p.x - 26, p.y + 3);
        g.lineTo(p.x + 4, p.y - 8);
        g.stroke();
      }
      g.restore();
    }
  return { canvas: c, bounds };
}
export class ChunkWorldRenderer {
  private map!: MapDefinition;
  private cache = new Map<string, ChunkView>();
  private indexedProps = new Map<string, MapProp[]>();
  private clock = 0;
  private resolution = 1;
  private active = new Set<string>();
  private queued = 0;
  private created = 0;
  private released = 0;
  private createdThisFrame = 0;
  constructor(private scene: Phaser.Scene) {}
  changeMap(id: string) {
    this.destroy();
    this.map = getMap(id);
    for (const p of this.map.props) {
      const key = `${Math.floor(p.x / CHUNK_SIZE)}:${Math.floor(p.y / CHUNK_SIZE)}`;
      const list = this.indexedProps.get(key) ?? [];
      list.push(p);
      this.indexedProps.set(key, list);
    }
    this.resolution = qualityBudget(this.scene.scale.width).chunkResolution;
  }
  update(
    player: { x: number; y: number },
    renderedPosition = worldToScreen(player),
  ) {
    const budget = qualityBudget(this.scene.scale.width);
    if (budget.chunkResolution !== this.resolution) {
      const id = this.map.id;
      this.changeMap(id);
    }
    const cam = this.scene.cameras.main,
      zoom = cam.zoom,
      view = {
        x: cam.scrollX + (cam.width - cam.width / zoom) / 2,
        y: cam.scrollY + (cam.height - cam.height / zoom) / 2,
        width: cam.width / zoom,
        height: cam.height / zoom,
      };
    const positions = visibleChunks(this.map.width, this.map.height, view, 165);
    this.active = new Set(positions.map((c) => c.key));
    this.clock++;
    const center = { x: view.x + view.width / 2, y: view.y + view.height / 2 };
    const priority = (c: ChunkPosition) => {
      const p = worldToScreen({
        x: (c.x + 0.5) * CHUNK_SIZE,
        y: (c.y + 0.5) * CHUNK_SIZE,
      });
      return Math.hypot(p.x - center.x, p.y - center.y);
    };
    positions.sort((a, b) => priority(a) - priority(b));
    const limit = Math.max(budget.cacheChunks, this.active.size);
    const prefetch = visibleChunks(this.map.width, this.map.height, view, 360)
      .filter((c) => !this.active.has(c.key))
      .sort((a, b) => priority(a) - priority(b))
      .slice(0, Math.max(0, limit - this.active.size));
    // Recompute pending work from the current viewport: an old camera request is cancelled immediately.
    const wanted = [...positions, ...prefetch];
    const keep = new Set(wanted.map((c) => c.key));
    for (const [key, entry] of this.cache)
      if (!keep.has(key)) {
        this.release(entry);
        this.cache.delete(key);
      }
    const pending = wanted.filter((c) => !this.cache.has(c.key));
    this.createdThisFrame = 0;
    const start = performance.now();
    for (const chunk of pending) {
      if (
        this.createdThisFrame >= 2 ||
        (this.createdThisFrame > 0 && performance.now() - start >= 4)
      )
        break;
      this.cache.set(chunk.key, this.create(chunk));
      this.created++;
      this.createdThisFrame++;
    }
    this.queued = pending.length - this.createdThisFrame;
    for (const chunk of positions) {
      const entry = this.cache.get(chunk.key);
      if (!entry) continue;
      entry.used = this.clock;
      entry.terrain.setVisible(true);
      for (const sprite of entry.props) {
        sprite.setVisible(true);
        const prop = sprite.getData("occlusion") as MapProp,
          at = worldToScreen(prop),
          p = renderedPosition;
        const b = sprite.getBounds();
        const covers =
          ["house", "tree", "cherry", "bamboo"].includes(prop.type) &&
          p.x >= b.left &&
          p.x <= b.right &&
          p.y - 42 >= b.top &&
          p.y - 42 <= b.bottom &&
          p.y < at.y + 12;
        const fade = getPreferences().reducedMotion
          ? 1
          : 1 - Math.exp(-Math.min(50, this.scene.game.loop.delta) / 90);
        sprite.setAlpha(
          Phaser.Math.Linear(sprite.alpha, covers ? 0.38 : 1, fade),
        );
      }
    }
    for (const [key, c] of this.cache)
      if (!this.active.has(key)) {
        c.terrain.setVisible(false);
        for (const p of c.props) p.setVisible(false);
      }
    for (const [key, c] of [...this.cache].sort(
      (a, b) => a[1].used - b[1].used,
    )) {
      if (this.cache.size <= limit) break;
      if (this.active.has(key)) continue;
      this.release(c);
      this.cache.delete(key);
    }
  }
  private create(chunk: ChunkPosition): ChunkView {
    const { canvas, bounds } = terrainCanvas(
        this.map,
        chunk,
        this.resolution,
        this.scene.textures
          .get(groundTextureAsset.id)
          .getSourceImage() as CanvasImageSource,
      ),
      texture = `chunk:${this.map.id}:${chunk.key}`;
    this.scene.textures.addCanvas(texture, canvas);
    const terrain = this.scene.add
      .image(bounds.x, bounds.y, texture)
      .setOrigin(0)
      .setDisplaySize(bounds.width, bounds.height)
      .setDepth(-10000);
    const props = (this.indexedProps.get(chunk.key) ?? []).map((p) => {
      const at = worldToScreen(p),
        asset = propAssets.find((a) => a.type === p.type);
      const requested = `${p.type}:${p.variant ?? 0}`;
      const fallback = this.scene.textures.exists(requested)
        ? requested
        : `${p.type}:0`;
      const sprite = this.scene.add.image(at.x, at.y, asset?.id ?? fallback);
      if (asset)
        sprite
          .setOrigin(asset.pivot.x, asset.pivot.y)
          .setDisplaySize(
            asset.displayWidth,
            (asset.displayWidth * asset.height) / asset.width,
          );
      else sprite.setOrigin(0.5, 365 / 440);
      sprite
        .setDepth(at.y + (p.type === "house" ? 12 : 0))
        .setData("occlusion", p);
      return sprite;
    });
    return {
      terrain,
      props,
      texture,
      bytes: canvas.width * canvas.height * 4,
      used: this.clock,
    };
  }
  get diagnostics() {
    return {
      mapId: this.map?.id,
      activeChunks: this.active.size,
      queuedChunks: this.queued,
      createdThisFrame: this.createdThisFrame,
      createdChunks: this.created,
      releasedChunks: this.released,
      propObjects: [...this.cache.values()].reduce(
        (n, c) => n + c.props.length,
        0,
      ),
      missingTextures: [...this.cache.values()].reduce(
        (n, c) =>
          n + c.props.filter((p) => p.texture.key === "__MISSING").length,
        0,
      ),
      cachedChunks: this.cache.size,
      terrainBytes: [...this.cache.values()].reduce((n, c) => n + c.bytes, 0),
    };
  }
  private release(c: ChunkView) {
    this.released++;
    c.terrain.destroy();
    for (const p of c.props) p.destroy();
    this.scene.textures.remove(c.texture);
  }
  destroy() {
    for (const c of this.cache.values()) this.release(c);
    this.cache.clear();
    this.indexedProps.clear();
    this.active.clear();
    this.queued = 0;
  }
}
