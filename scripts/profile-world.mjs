import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch();
const profiles = [];
try {
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 932, height: 430 },
  ]) {
    const page = await browser.newPage({ viewport }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://localhost:5173/world-inspector.html");
    const settled = () =>
      page.waitForFunction(() => {
        const raw = document.getElementById("metrics")?.textContent;
        return raw?.startsWith("{") && JSON.parse(raw).queuedChunks === 0;
      });
    const metrics = async () =>
      JSON.parse(await page.locator("#metrics").innerText());
    await settled();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Performance.enable");
    const samples = [],
      heaps = [];
    for (let round = 0; round < 3; round++) {
      for (const mapId of ["highlands", "riverlands"]) {
        await page.locator(`[data-map="${mapId}"]`).click();
        await page.waitForTimeout(40);
        await settled();
        for (const button of await page.locator("[data-area]").all()) {
          await button.click();
          await page.waitForTimeout(40);
          await settled();
          samples.push(await metrics());
          if (
            round === 2 &&
            mapId === "riverlands" &&
            (await button.getAttribute("data-area")) === "river-crossing"
          )
            await page.screenshot({
              path: `artifacts/riverlands-bridge-${viewport.width}.png`,
            });
        }
      }
      await cdp.send("HeapProfiler.collectGarbage");
      const m = await cdp.send("Performance.getMetrics");
      heaps.push({
        round,
        heapBytes: m.metrics.find((m) => m.name === "JSHeapUsedSize")?.value,
      });
    }
    await page.screenshot({
      path: `artifacts/riverlands-inspector-${viewport.width}.png`,
    });
    const result = {
      viewport,
      visits: samples.length,
      maxCached: Math.max(...samples.map((s) => s.cachedChunks)),
      maxActive: Math.max(...samples.map((s) => s.activeChunks)),
      maxTerrainMiB: Math.max(...samples.map((s) => s.terrainBytes)) / 1048576,
      missingTextures: Math.max(...samples.map((s) => s.missingTextures)),
      maxTextures: Math.max(...samples.map((s) => s.textures)),
      maxObjects: Math.max(...samples.map((s) => s.objects)),
      maxCreatedPerFrame: Math.max(...samples.map((s) => s.maxCreatedPerFrame)),
      cpuP95Ms: Math.max(...samples.map((s) => s.cpuP95Ms)),
      cpuMaxMs: Math.max(...samples.map((s) => s.cpuMaxMs)),
      lifecycleBalanced: samples.every(
        (s) => s.createdChunks - s.releasedChunks === s.cachedChunks,
      ),
      afterGc: heaps,
      renderer: samples.at(-1).renderer,
      errors,
    };
    profiles.push(result);
    if (
      errors.length ||
      result.missingTextures > 0 ||
      result.maxCached > 40 ||
      result.maxCreatedPerFrame > 2 ||
      !result.lifecycleBalanced
    )
      process.exitCode = 1;
    await page.close();
  }
  const result = {
    profiles,
    note: "Chromium headless dev-only terrain/prop renderer, 60 visits and 6 map changes per viewport. CPU includes chunk creation; canvas allocation excludes GPU/native resources. Heap after GC is a short-run trend, not proof of leak-free play or real-device mobile FPS. Farm simulation measured separately.",
  };
  await writeFile(
    "artifacts/streaming-browser.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
