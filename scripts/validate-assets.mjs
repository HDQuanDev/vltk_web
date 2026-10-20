import { createServer } from "vite";
import { readFile, writeFile } from "node:fs/promises";
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const {
    propAssets,
    groundTextureAsset,
    actorVisualManifest,
    monsterSpriteManifest,
    monsters,
    actorSpriteManifest,
    classDefinitions,
  } = await server.ssrLoadModule("/packages/game-content/src/index.ts");
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
  const knownMonsters = new Set(monsters.map((m) => m.id));
  const monsterSets = [];
  const monsterFilesPerSet =
    monsterSpriteManifest.directions.length *
    monsterSpriteManifest.states.length;
  let monsterFiles = 0,
    monsterBytes = 0;
  for (const id of monsterSpriteManifest.monsters) {
    if (!knownMonsters.has(id))
      throw new Error("Bộ sprite quái không có monster def: " + id);
    let bytes = 0;
    for (const facing of monsterSpriteManifest.directions)
      for (const state of monsterSpriteManifest.states) {
        const b = await readFile(
          `apps/web/public${monsterSpriteManifest.baseUrl}/${id}/sprites/${facing}/${state}.png`,
        );
        if (
          b.subarray(1, 4).toString() !== "PNG" ||
          b.readUInt32BE(16) !== monsterSpriteManifest.frameWidth ||
          b.readUInt32BE(20) !== monsterSpriteManifest.frameHeight ||
          b[25] !== 6
        )
          throw new Error(
            `Sprite quái sai metadata/alpha: ${id}/${facing}/${state}`,
          );
        bytes += b.length;
      }
    monsterFiles += monsterFilesPerSet;
    monsterBytes += bytes;
    monsterSets.push({ id, files: monsterFilesPerSet, bytes });
  }
  const knownSects = new Set(classDefinitions.map((s) => s.id));
  const actorSets = [];
  const actorFilesPerSet =
    actorSpriteManifest.directions.length * actorSpriteManifest.states.length;
  let actorFilesCount = 0,
    actorBytes = 0;
  for (const [sectId, genders] of Object.entries(actorSpriteManifest.sets)) {
    if (sectId !== "neutral" && !knownSects.has(sectId))
      throw new Error("Bộ sprite nhân vật không có phái: " + sectId);
    for (const owner of Object.values(genders)) {
      let bytes = 0;
      for (const facing of actorSpriteManifest.directions)
        for (const state of actorSpriteManifest.states) {
          const b = await readFile(
            `apps/web/public${actorSpriteManifest.baseUrl}/${owner}/sprites/${facing}/${state}.png`,
          );
          if (
            b.subarray(1, 4).toString() !== "PNG" ||
            b.readUInt32BE(16) !== actorSpriteManifest.frameWidth ||
            b.readUInt32BE(20) !== actorSpriteManifest.frameHeight ||
            b[25] !== 6
          )
            throw new Error(
              `Sprite nhân vật sai metadata/alpha: ${owner}/${facing}/${state}`,
            );
          bytes += b.length;
        }
      actorFilesCount += actorFilesPerSet;
      actorBytes += bytes;
      actorSets.push({ owner, files: actorFilesPerSet, bytes });
    }
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
      interfaceRows.length +
      monsterFiles +
      actorFilesCount,
    reviewRequiredInterface: interfaceRows.length,
    reviewRequiredProps: 4,
    reviewRequiredGround: 1,
    monsterSprites: {
      sets: monsterSets.length,
      files: monsterFiles,
      bytes: monsterBytes,
      directions: monsterSpriteManifest.directions,
      states: monsterSpriteManifest.states.length,
      runtimeStates: monsterSpriteManifest.runtimeStates.length,
      frame: [
        monsterSpriteManifest.frameWidth,
        monsterSpriteManifest.frameHeight,
      ],
      feetY: monsterSpriteManifest.feetY,
      quality: monsterSpriteManifest.quality,
      previews:
        "preview-tong-hop.png chỉ để người kiểm tra, không copy vào runtime",
    },
    reviewRequiredMonsterSprites: monsterFiles,
    actorSprites: {
      sets: actorSets.length,
      files: actorFilesCount,
      bytes: actorBytes,
      directions: actorSpriteManifest.directions,
      states: actorSpriteManifest.states.length,
      runtimeStates: actorSpriteManifest.runtimeStates.length,
      frame: [actorSpriteManifest.frameWidth, actorSpriteManifest.frameHeight],
      feetY: actorSpriteManifest.feetY,
      displayHeight: actorSpriteManifest.displayHeight,
      fallback: actorSpriteManifest.fallback,
      quality: actorSpriteManifest.quality,
      previews:
        "preview-tong-hop.png chỉ để người kiểm tra, không copy vào runtime",
    },
    reviewRequiredActorSprites: actorFilesCount,
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
