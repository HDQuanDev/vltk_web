import * as THREE from "three";
import type {
  GameEvent,
  GameSession,
  GameSnapshot,
} from "@kiem-hiep/game-protocol";
import type { WorldCallbacks } from "../scenes/WorldScene";
import { getPreferences, qualityBudget } from "../preferences";
import { worldTo3D } from "./coords";
import { Terrain3D } from "./Terrain3D";
import { Props3D } from "./Props3D";
import { Actors3D } from "./Actors3D";
import { WorldObjects3D } from "./WorldObjects3D";
import { Effects3D } from "./Effects3D";
import { Weather3D } from "./Weather3D";
import { Input3D } from "./Input3D";
import { dayNight3D, applyDayNight } from "./daynight";
import { CAMERA_DIAGONAL, CAMERA_HEIGHT } from "./camera-constants";

/**
 * Offset camera (đơn vị thế giới) so với chân người chơi — xem
 * `camera-constants.ts` để biết vì sao camera nằm trên đường phân giác.
 */
const CAMERA_OFFSET = new THREE.Vector3(
  CAMERA_DIAGONAL,
  CAMERA_HEIGHT,
  CAMERA_DIAGONAL,
);
/** Hằng số nội suy vị trí: giống WorldScene (delta/65). */
const INTERPOLATION_MS = 65;

export interface ThreeWorldOptions {
  parent: HTMLElement;
  session: GameSession;
  isBlocked: () => boolean;
  callbacks: WorldCallbacks;
}

/**
 * Bộ hiển thị 3D (Three.js) chạy SONG SONG với bộ Phaser 2D.
 *
 * Cùng một `GameSession`, cùng dữ liệu snapshot; khác nhau ở tầng hiển thị.
 * Camera CỐ ĐỊNH góc: đặt tại chân người chơi + offset `(CAMERA_DIAGONAL, CAMERA_HEIGHT, CAMERA_DIAGONAL)`,
 * nhìn về chân người chơi. Offset nằm trên đường phân giác xz (không dùng `(0, 19, 13.5)` của thiết kế)
 * để phép chiếu phối cảnh khớp đúng iso 2D — xem `camera-constants.ts`.
 */
export class ThreeWorld {
  private parent: HTMLElement;
  private session: GameSession;
  private isBlocked: () => boolean;
  private callbacks: WorldCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private hemi: THREE.HemisphereLight;
  private sun: THREE.DirectionalLight;
  private snapshot: GameSnapshot;
  private unsubscribe?: () => void;
  private frame = 0;
  private lastTime = 0;
  private running = false;
  private destroyed = false;
  private currentMap = "";
  private lastDiagnostics = 0;
  private fpsSamples: number[] = [];
  private frameSamples: number[] = [];
  private rendered = new Map<string, { x: number; y: number }>();
  private pendingEvents: GameEvent[] = [];
  private terrain: Terrain3D;
  private props: Props3D;
  private actors: Actors3D;
  private objects: WorldObjects3D;
  private effects: Effects3D;
  private weather: Weather3D;
  private shadowsEnabled = false;
  private input: Input3D;
  private resizeObserver?: ResizeObserver;

  constructor(options: ThreeWorldOptions) {
    this.parent = options.parent;
    this.session = options.session;
    this.isBlocked = options.isBlocked;
    this.callbacks = options.callbacks;
    this.snapshot = this.session.getSnapshot();
    const budget = qualityBudget(this.parent.clientWidth || 1280);
    // Canvas phủ kín parent: parent phải là vùng định vị tương đối.
    if (getComputedStyle(this.parent).position === "static")
      this.parent.style.position = "relative";
    this.renderer = new THREE.WebGLRenderer({
      antialias: budget.level !== "low",
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, this.pixelRatioCap(budget.level)),
    );
    this.renderer.setSize(
      Math.max(1, this.parent.clientWidth),
      Math.max(1, this.parent.clientHeight),
      false,
    );
    this.renderer.domElement.style.position = "absolute";
    this.renderer.domElement.style.inset = "0";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.renderer.domElement.style.display = "block";
    this.parent.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color("#364c35");
    this.camera = new THREE.PerspectiveCamera(
      40,
      Math.max(1, this.parent.clientWidth) / Math.max(1, this.parent.clientHeight),
      0.5,
      400,
    );
    this.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x3a5232, 0.9);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.1);
    this.sun.position.set(8, 14, 6);
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    // Fog khớp nền ban ngày.
    this.scene.fog = new THREE.Fog(new THREE.Color("#364c35"), 30, 75);
    // Bóng thật: mặc định TẮT (pref `shadows3d`), chỉ bật khi người dùng chọn.
    if (getPreferences().shadows3d) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(1024, 1024);
      this.sun.shadow.camera.near = 1;
      this.sun.shadow.camera.far = 80;
      this.sun.shadow.camera.left = -15;
      this.sun.shadow.camera.right = 15;
      this.sun.shadow.camera.top = 15;
      this.sun.shadow.camera.bottom = -15;
      this.shadowsEnabled = true;
    }
    this.terrain = new Terrain3D(this.scene, this.renderer);
    this.props = new Props3D(this.scene);
    this.actors = new Actors3D(this.scene, this.parent);
    this.objects = new WorldObjects3D(this.scene, this.parent);
    this.effects = new Effects3D(this.scene, this.parent);
    this.weather = new Weather3D(this.scene);
    this.input = new Input3D({
      renderer: this.renderer,
      camera: this.camera,
      session: this.session,
      isBlocked: this.isBlocked,
      getSnapshot: () => this.snapshot,
      getMapId: () => this.currentMap,
      onMoveMarker: (x, y) => this.effects.showMoveMarker(x, y),
    });
    this.currentMap = this.snapshot.mapId;
    this.terrain.changeMap(this.currentMap);
    this.props.changeMap(this.currentMap);
    this.objects.changeMap(this.currentMap, this.snapshot);
    this.actors.changeMap(this.currentMap);
    this.unsubscribe = this.session.subscribe((update) => {
      this.snapshot = update.snapshot;
      if (this.currentMap !== update.snapshot.mapId) {
        this.currentMap = update.snapshot.mapId;
        this.terrain.changeMap(this.currentMap);
        this.props.changeMap(this.currentMap);
        this.objects.changeMap(this.currentMap, update.snapshot);
        this.actors.changeMap(this.currentMap);
        this.rendered.clear();
      }
      for (const e of update.events) this.pendingEvents.push(e);
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.parent);
    this.updateCamera(true);
    this.callbacks.onReady();
    this.running = true;
    this.lastTime = performance.now();
    this.frame = requestAnimationFrame(this.loop);
  }

  private pixelRatioCap(level: string) {
    return level === "low" ? 1 : level === "medium" ? 1.5 : 2;
  }

  private resize() {
    const w = Math.max(1, this.parent.clientWidth);
    const h = Math.max(1, this.parent.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private loop = (time: number) => {
    if (!this.running) return;
    const delta = Math.min(200, time - this.lastTime);
    this.lastTime = time;
    const started = performance.now();
    this.update(delta);
    this.renderer.render(this.scene, this.camera);
    const renderMs = performance.now() - started;
    this.trackFps(time, renderMs, delta);
    this.publishRendererStats();
    this.frame = requestAnimationFrame(this.loop);
  };

  private update(delta: number) {
    const s = this.snapshot;
    const player = s.entities[s.playerId];
    if (!player) return;
    // Nội suy vị trí giữa hai tick 20Hz với đúng hằng số của WorldScene.
    const alpha = 1 - Math.exp(-delta / INTERPOLATION_MS);
    for (const e of Object.values(s.entities)) {
      if (e.mapId !== this.currentMap) continue;
      const prev = this.rendered.get(e.id);
      if (!prev) {
        this.rendered.set(e.id, { x: e.x, y: e.y });
        continue;
      }
      prev.x += (e.x - prev.x) * alpha;
      prev.y += (e.y - prev.y) * alpha;
    }
    this.updateCamera(false);
    const night = dayNight3D(s.worldClock.timeTicks);
    applyDayNight(this.scene, this.sun, this.hemi, night);
    this.terrain.update(player);
    this.props.update(this.camera);
    this.actors.update(s, this.rendered, this.camera, this.currentMap);
    this.objects.update(s, this.rendered, this.camera, this.currentMap, night.night);
    this.effects.update(s, this.rendered, this.camera, this.currentMap);
    this.weather.update(
      s.worldClock.weather,
      s.settings.effects,
      this.camera,
      s.tick,
      this.rendered.get(player.id) ?? player,
    );
    this.weather.applyFog(this.scene, night.night);
    if (this.shadowsEnabled) {
      // Camera bóng bám theo người chơi (ortho 30×30 đơn vị).
      const pos = this.rendered.get(player.id) ?? player;
      this.sun.target.position.set(pos.x, 0, pos.y);
      this.sun.position.set(pos.x + 8, 14, pos.y + 6);
      this.sun.target.updateMatrixWorld();
    }
    for (const e of this.pendingEvents) {
      this.effects.event(e, s);
      if (e.type === "damage" && e.value && e.entityId)
        this.actors.flash(e.entityId);
    }
    this.pendingEvents.length = 0;
    this.input.update(delta);
  }

  private updateCamera(snap: boolean) {
    const player = this.snapshot.entities[this.snapshot.playerId];
    if (!player) return;
    const pos = this.rendered.get(player.id) ?? player;
    const target = worldTo3D(pos.x, pos.y, 0);
    this.camera.position.set(
      target.x + CAMERA_OFFSET.x,
      target.y + CAMERA_OFFSET.y,
      target.z + CAMERA_OFFSET.z,
    );
    this.camera.lookAt(target.x, target.y, target.z);
    if (snap) this.camera.updateMatrixWorld();
  }

  private trackFps(time: number, renderMs: number, frameMs: number) {
    this.fpsSamples.push(renderMs);
    this.frameSamples.push(frameMs);
    if (this.fpsSamples.length > 60) this.fpsSamples.shift();
    if (this.frameSamples.length > 60) this.frameSamples.shift();
    if (time - this.lastDiagnostics < 1000) return;
    this.lastDiagnostics = time;
    // FPS đo từ khoảng cách giữa hai frame (rAF), không phải thời gian vẽ.
    const fps = this.frameSamples.length
      ? 1000 /
        (this.frameSamples.reduce((a, b) => a + b, 0) / this.frameSamples.length)
      : 0;
    const renderAvg =
      this.fpsSamples.reduce((a, b) => a + b, 0) / Math.max(1, this.fpsSamples.length);
    const terrain = this.terrain.diagnostics;
    this.callbacks.onDiagnostics?.({
      fps: Math.round(fps * 10) / 10,
      renderMs: Math.round(renderAvg * 100) / 100,
      objects:
        this.actors.domCount +
        this.objects.domCount +
        this.effects.domCount +
        this.actors.visibleActors,
      textures: this.renderer.info.memory.textures,
      activeChunks: terrain.activeChunks,
      cachedChunks: terrain.cachedChunks,
      terrainBytes: terrain.terrainBytes,
      renderer: "ThreeJS",
      activeEffects: this.effects.activeEffects,
    });
  }

  /** Số liệu renderer cho công cụ đo (draw calls, bộ nhớ GPU). */
  private publishRendererStats() {
    const info = this.renderer.info;
    const stats = {
      calls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length ?? 0,
      weather: this.snapshot.worldClock.weather,
      effects: this.snapshot.settings.effects,
    };
    (window as unknown as Record<string, unknown>).__threeRendererInfo =
      () => stats;
  }

  destroy(removeCanvas: boolean) {
    if (this.destroyed) return;
    this.destroyed = true;
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
    this.unsubscribe?.();
    this.input.destroy();
    this.terrain.dispose();
    this.props.dispose();
    this.actors.destroy();
    this.objects.destroy();
    this.effects.destroy();
    this.weather.destroy();
    this.scene.clear();
    this.renderer.dispose();
    if (removeCanvas) this.renderer.domElement.remove();
  }
}
