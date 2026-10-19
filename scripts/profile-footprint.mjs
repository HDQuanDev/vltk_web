import { createServer } from "vite";
import { writeFile } from "node:fs/promises";
// Footprint/publish measurement for the 40-map target. Synthetic maps reuse real
// monster definitions and the real zone controller; they are measurement shapes,
// NOT shipped content and NOT a progression journey.
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: "custom",
});
const percentile = (sorted, p) =>
  sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
const round = (v) => Number(v.toFixed(3));
try {
  const content = await server.ssrLoadModule(
    "/packages/game-content/src/index.ts",
  );
  const core = await server.ssrLoadModule("/packages/game-core/src/index.ts");
  const camp = (id, x, y, level, maxPopulation) => ({
    id,
    area: { kind: "circle", x, y, radius: 13 },
    pool: [
      { monsterId: "bandit", weight: 3 },
      { monsterId: "archer", weight: 1 },
    ],
    minPopulation: Math.min(6, maxPopulation),
    maxPopulation,
    density: 0.025,
    respawnTicks: [400, 720],
    levels: [
      { level, weight: 3 },
      { level: level + 1, weight: 1 },
    ],
    eliteChance: 0.08,
    activationRadius: 42,
  });
  const syntheticMap = (index) => {
    const id = `synth-${index}`;
    const areas = Array.from({ length: 12 }, (_, i) => ({
      id: `${id}-area-${i}`,
      name: `Khu ${index}-${i}`,
      x: 24 + (i % 4) * 56,
      y: 24 + Math.floor(i / 4) * 72,
      radius: 12,
      kind: i === 0 ? "safe" : "combat",
      level: 3 + (i % 8),
    }));
    return {
      id,
      name: `Synthetic ${index}`,
      subtitle: "measurement shape",
      width: 256,
      height: 256,
      spawn: { x: 22, y: 27 },
      palette: "forest",
      areas,
      paths: [],
      props: [],
      blocked: [],
      water: [],
      bridges: [],
      spawns: [],
      portals: [],
      maxMonsters: 128,
      spawnZones: areas
        .filter((a) => a.kind !== "safe")
        .map((a, i) => camp(`${id}-camp-${i}`, a.x, a.y, a.level, 10)),
    };
  };
  const contentMaps = content.maps.length;
  const realMaps = content.maps.map((m) => m.id);
  const settle = (world, mapId, ticks, point) => {
    // Fixture relocation: measures activation/population cost, not a journey.
    const map = content.getMap(mapId);
    Object.assign(world.player, {
      mapId,
      ...(point ?? map.spawn),
    });
    world.state.mapId = mapId;
    if (!world.state.visitedMaps.includes(mapId))
      world.state.visitedMaps.push(mapId);
    for (let i = 0; i < ticks; i++) {
      world.step();
      world.drainEvents();
    }
  };
  const tour = (world, mapId, ticksPerZone) => {
    const zones = content.getMap(mapId).spawnZones ?? [];
    if (!zones.length) return settle(world, mapId, ticksPerZone);
    for (const zone of zones) {
      const area = zone.area;
      const center =
        area.kind === "circle"
          ? { x: area.x, y: area.y }
          : (area.points[0] ?? content.getMap(mapId).spawn);
      settle(world, mapId, ticksPerZone, center);
    }
  };
  const measure = (label, mapCount, syntheticCount) => {
    for (let i = content.maps.length - 1; i >= contentMaps; i--)
      content.maps.pop();
    for (let i = 0; i < syntheticCount; i++)
      content.maps.push(syntheticMap(i + mapCount));
    const gc = globalThis.gc ?? (() => {});
    gc();
    const heapBefore = process.memoryUsage().heapUsed;
    const world = new core.GameWorld(core.createGame());
    const order = content.maps.map((m) => m.id);
    for (const mapId of order) tour(world, mapId, 25);
    settle(world, order[0], 20);
    gc();
    const heapAfter = process.memoryUsage().heapUsed;
    const tick = [],
      fullClone = [],
      viewClone = [],
      viewBytes = [];
    let fullBytes = 0;
    const supportsView = typeof world.viewSnapshot === "function";
    const rounds = 200;
    for (let i = 0; i < rounds; i++) {
      const start = performance.now();
      world.step();
      tick.push(performance.now() - start);
      world.drainEvents();
      const cloneStart = performance.now();
      const full = world.snapshot();
      fullClone.push(performance.now() - cloneStart);
      fullBytes = Buffer.byteLength(JSON.stringify(full));
      if (supportsView) {
        const viewStart = performance.now();
        const view = world.viewSnapshot(world.state.playerId);
        viewClone.push(performance.now() - viewStart);
        viewBytes.push(Buffer.byteLength(JSON.stringify(view)));
      }
    }
    tick.sort((a, b) => a - b);
    fullClone.sort((a, b) => a - b);
    viewClone.sort((a, b) => a - b);
    const entities = Object.values(world.state.entities);
    return {
      label,
      maps: content.maps.length,
      realMaps,
      syntheticMaps: syntheticCount,
      entities: entities.length,
      dormantEntities: entities.filter(
        (e) => e.kind === "monster" && e.mapId !== world.state.mapId,
      ).length,
      groundLoot: Object.keys(world.state.groundLoot).length,
      heapDeltaBytes: heapAfter - heapBefore,
      heapPerMapBytes: Math.round((heapAfter - heapBefore) / content.maps.length),
      heapPerEntityBytes: Math.round(
        (heapAfter - heapBefore) / Math.max(1, entities.length),
      ),
      rounds,
      tickMedianMs: round(percentile(tick, 0.5)),
      tickP95Ms: round(percentile(tick, 0.95)),
      fullCloneMedianMs: round(percentile(fullClone, 0.5)),
      fullCloneP95Ms: round(percentile(fullClone, 0.95)),
      fullBytes,
      viewCloneMedianMs: supportsView
        ? round(percentile(viewClone, 0.5))
        : null,
      viewCloneP95Ms: supportsView ? round(percentile(viewClone, 0.95)) : null,
      viewBytes: supportsView ? Math.max(...viewBytes) : null,
      viewEntities: supportsView
        ? Object.keys(world.viewSnapshot(world.state.playerId).entities).length
        : null,
      viewProjection: supportsView,
    };
  };
  const samples = [measure("1 map (village only)", 1, 0)];
  for (const syntheticCount of [9, 19, 35])
    samples.push(
      measure(
        `${contentMaps + syntheticCount} maps`,
        contentMaps,
        syntheticCount,
      ),
    );
  const result = {
    version: content.CONTENT_VERSION,
    sampledAt: new Date().toISOString(),
    note: "Node on the development machine. Synthetic maps (256x256, 12 areas, 11 spawn zones) reuse real monster definitions and the real zone controller to model a visited-world of up to 40 maps; they are measurement shapes, not shipped content, and the tour is a fixture relocation, not a progression journey. Compares authority snapshot publish with the projected player view. Does not certify 1024 maps, mobile hardware, GPU memory, or network interest management.",
    samples,
    realContentMaps: contentMaps,
  };
  await writeFile(
    "artifacts/world-footprint.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      samples.map((s) => ({
        label: s.label,
        entities: s.entities,
        dormant: s.dormantEntities,
        tickP95Ms: s.tickP95Ms,
        full: `${s.fullCloneMedianMs}ms/${s.fullBytes}B`,
        view: `${s.viewCloneMedianMs}ms/${s.viewBytes}B`,
      })),
      null,
      1,
    ),
  );
} finally {
  await server.close();
}
