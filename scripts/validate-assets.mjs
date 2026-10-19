import { createServer } from "vite";
import { readFile, writeFile } from "node:fs/promises";
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { propAssets, groundTextureAsset, actorVisualManifest } =
    await server.ssrLoadModule("/packages/game-content/src/index.ts");
  const rows = [];
  for (const a of propAssets) {
    const b = await readFile("apps/web/public" + a.url);
    if (b.subarray(1, 4).toString() !== "PNG")
      throw new Error("PNG sai: " + a.id);
    const width = b.readUInt32BE(16),
      height = b.readUInt32BE(20),
      alpha = b[25] === 6;
    if (
      width !== a.width ||
      height !== a.height ||
      !alpha ||
      a.pivot.x < 0 ||
      a.pivot.x > 1 ||
      a.pivot.y < 0 ||
      a.pivot.y > 1
    )
      throw new Error("Metadata/alpha sai: " + a.id);
    rows.push({
      id: a.id,
      width,
      height,
      bytes: b.length,
      rgba: alpha,
      quality: a.quality,
    });
  }
  const ground = await readFile("apps/web/public" + groundTextureAsset.url);
  if (
    ground.readUInt32BE(16) !== groundTextureAsset.width ||
    ground.readUInt32BE(20) !== groundTextureAsset.height
  )
    throw new Error("Sai kích thước ground material");
  const interfaceCells = JSON.parse(
    await readFile("assets/source/interface/atlas-cells.json", "utf8"),
  );
  const interfaceRows = [];
  const verifyPng = async (url, width, height) => {
    const b = await readFile("apps/web/public" + url);
    if (
      b.subarray(1, 4).toString() !== "PNG" ||
      b.readUInt32BE(16) !== width ||
      b.readUInt32BE(20) !== height
    )
      throw new Error("Interface PNG metadata mismatch: " + url);
    return { url, width, height, bytes: b.length, quality: "review-required" };
  };
  for (const name of interfaceCells.names)
    interfaceRows.push(
      await verifyPng(`/assets/interface/${name}-v1.png`, 128, 128),
    );
  for (const name of [
    "male",
    "female",
    "elder",
    "merchant",
    "smith",
    "teacher",
  ])
    interfaceRows.push(
      await verifyPng(`/assets/interface/portrait-${name}-v1.png`, 256, 256),
    );
  interfaceRows.push(
    await verifyPng("/assets/interface/icons-atlas-v1.png", 768, 768),
  );
  interfaceRows.push(
    await verifyPng("/assets/interface/lobby-v1.png", 1920, 1080),
  );
  const audio = JSON.parse(
    await readFile("assets/source/interface/audio-manifest.json", "utf8"),
  );
  for (const row of audio) {
    const b = await readFile(`apps/web/public/assets/audio/${row.name}-v1.wav`);
    if (
      b.toString("ascii", 0, 4) !== "RIFF" ||
      b.toString("ascii", 8, 12) !== "WAVE" ||
      b.readUInt32LE(24) !== row.rate ||
      b.length !== row.bytes
    )
      throw new Error("Invalid presentation audio: " + row.name);
  }
  const report = {
    interface: {
      assets: interfaceRows,
      audio,
      note: "Original generated framed artwork, review-required; physical-model audio is development quality. PNG validation is not production art approval.",
    },
    ground: {
      id: groundTextureAsset.id,
      width: groundTextureAsset.width,
      height: groundTextureAsset.height,
      bytes: ground.length,
      quality: groundTextureAsset.quality,
    },
    props: rows,
    productionReady: rows.filter((r) => r.quality === "production-ready")
      .length,
    reviewRequired:
      rows.filter((r) => r.quality === "review-required").length +
      1 +
      interfaceRows.length,
    reviewRequiredInterface: interfaceRows.length,
    reviewRequiredProps: 4,
    reviewRequiredGround: 1,
    actor: {
      directions: actorVisualManifest.directions,
      states: actorVisualManifest.states.length,
      framesPerState: actorVisualManifest.framesPerState,
      quality: actorVisualManifest.quality,
    },
    note: "PNG alpha channel + metadata validation. Browser test kiểm tra pixel alpha và scene; vẫn cần human review trước production.",
  };
  await writeFile(
    "artifacts/asset-audit.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
} finally {
  await server.close();
}
