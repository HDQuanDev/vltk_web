import { createServer } from "vite";
import { writeFile } from "node:fs/promises";
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const content = await server.ssrLoadModule(
    "/packages/game-content/src/index.ts",
  );
  const core = await server.ssrLoadModule("/packages/game-core/src/index.ts");
  const profiles = [];
  for (const id of ["highlands", "riverlands"]) {
    const map = content.getMap(id);
    core.invalidateNavigation(map);
    const start = performance.now();
    core.navigationDiagnostics(map);
    const indexMs = performance.now() - start;
    const cold = [],
      warm = [];
    for (const area of map.areas) {
      const start = performance.now(),
        path = core.findPath(map, map.spawn, area);
      cold.push({
        area: area.id,
        ms: performance.now() - start,
        tiles: path.length,
        visited: core.navigationDiagnostics(map).lastVisited,
      });
      if (!path.length) throw new Error(`No route ${id}:${area.id}`);
    }
    for (let round = 0; round < 5; round++)
      for (const area of map.areas) {
        const start = performance.now();
        core.findPath(map, map.spawn, area);
        warm.push(performance.now() - start);
      }
    warm.sort((a, b) => a - b);
    profiles.push({
      id,
      width: map.width,
      height: map.height,
      indexMs,
      cold,
      warmP95Ms: warm[Math.floor(warm.length * 0.95)],
      diagnostics: core.navigationDiagnostics(map),
    });
  }
  const w = new core.GameWorld(core.createGame());
  const map = content.getMap("riverlands");
  w.state.mapId = map.id;
  w.state.visitedMaps.push(map.id);
  Object.assign(w.player, { mapId: map.id, ...map.spawn });
  const checkpoints = [];
  for (let round = 0; round < 3; round++) {
    for (const area of map.areas) {
      // Fixture camera/player relocation isolates activation costs. This is NOT a progression journey.
      Object.assign(w.player, { x: area.x - 26, y: area.y });
      const samples = [],
        cloneSamples = [];
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        w.step();
        samples.push(performance.now() - start);
        w.drainEvents();
        const cloneStart = performance.now();
        w.snapshot();
        cloneSamples.push(performance.now() - cloneStart);
      }
      samples.sort((a, b) => a - b);
      cloneSamples.sort((a, b) => a - b);
      checkpoints.push({
        round,
        area: area.id,
        entities: Object.keys(w.state.entities).length,
        snapshotBytes: Buffer.byteLength(JSON.stringify(w.snapshot())),
        diagnostics: w.diagnostics,
        tickP95Ms: samples[95],
        cloneP95Ms: cloneSamples[95],
      });
    }
  }
  const result = {
    version: content.CONTENT_VERSION,
    navigation: profiles,
    simulationTour: checkpoints,
    note: "Node on development machine. Actual 128/256 content maps; navigation index constructed once, synchronous bounded component/portal graph plus tile search, 64 route cache. Simulation tour relocates a fixture solely to measure activation/serialization and is not a nongrant journey. Active farm evidence is farm-30min.json. Does not certify 512/1024 maps, worker loading, or mobile hardware.",
  };
  await writeFile(
    "artifacts/streaming-core.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      navigation: profiles.map((p) => ({
        id: p.id,
        indexMs: p.indexMs,
        coldMaxMs: Math.max(...p.cold.map((c) => c.ms)),
        maxVisited: Math.max(...p.cold.map((c) => c.visited)),
        warmP95Ms: p.warmP95Ms,
      })),
      maxEntities: Math.max(...checkpoints.map((c) => c.entities)),
      maxTickP95Ms: Math.max(...checkpoints.map((c) => c.tickP95Ms)),
      maxCloneP95Ms: Math.max(...checkpoints.map((c) => c.cloneP95Ms)),
      finalBytes: checkpoints.at(-1).snapshotBytes,
    }),
  );
} finally {
  await server.close();
}
