import { createServer } from "vite";
import { readFile, writeFile, mkdir } from "node:fs/promises";
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
  const {
    classDefinitions,
    skills,
    items,
    monsters,
    maps,
    quests,
    recipes,
    resourceNodes,
    professionNames,
    CONTENT_VERSION,
    npcs,
  } = content;
  const errors = content.validateContent();
  if (errors.length) throw new Error(errors.join("\n"));
  const counts = {
    sects: classDefinitions.length,
    branches: classDefinitions.reduce((n, c) => n + c.branches.length, 0),
    skills: skills.length,
    maps: maps.length,
    spawnZones: maps.reduce((sum, m) => sum + (m.spawnZones?.length ?? 0), 0),
    monsters: monsters.length,
    bosses: monsters.filter((m) => m.brain === "boss").length,
    items: items.length,
    quests: quests.length,
    dungeons: 0,
    professions: Object.keys(professionNames).length,
    recipes: recipes.length,
    resources: resourceNodes.length,
    npcs: npcs.length,
    maxLevel: 100,
  };
  await mkdir("artifacts", { recursive: true });
  await writeFile(
    "artifacts/content-coverage.json",
    JSON.stringify(
      {
        version: CONTENT_VERSION,
        counts,
        targets: {
          sects: 10,
          branches: 20,
          skills: 140,
          maps: 50,
          monsters: 100,
          bosses: 20,
          items: 500,
          quests: 150,
          dungeons: 10,
          professions: 6,
          maxLevel: 100,
        },
        note: "Số lượng catalog không đồng nghĩa đã cân bằng, đủ nội dung tiến trình hoặc đạt art sản xuất.",
      },
      null,
      2,
    ) + "\n",
  );
  await writeFile(
    "artifacts/coverage-evidence.json",
    JSON.stringify(
      {
        contentVersion: CONTENT_VERSION,
        playableMaps: maps.map((m) => m.id),
        questDefinitions: quests.length,
        coreJourneyQuestIds: ["bandits", "wolves", "boss"],
        browserJourneyQuestIds: ["highland-route"],
        questsNotYetAcceptedViaFullJourney: quests.length - 4,
        productionReadyProps: 0,
        reviewRequiredProps: 4,
        reviewRequiredGroundMaterials: 1,
        developmentAssets: [
          "7 procedural actor atlas families",
          "3 static NPC sprite families",
          "portrait SVG",
          "3 procedural decor families",
          "code-native UI icons",
          "procedural terrain",
        ],
        validationErrors: errors.length,
        note: "Full-journey IDs denote explicit tested journeys; remaining quest definitions have rule/reference coverage, not full browser acceptance. New region reuses existing monster/boss definitions.",
      },
      null,
      2,
    ) + "\n",
  );
  let doc =
    "# Catalog nội dung hiện có\n\nSinh bằng `pnpm report:content` từ source; bản " +
    CONTENT_VERSION +
    ". Các mục tiêu v1.0 giữ ở MASTER_GAME_DESIGN.md và ROADMAP.md.\n\n| Loại | Hiện có |\n|---|---:|\n" +
    Object.entries(counts)
      .map(([k, v]) => `| ${k} | ${v} |`)
      .join("\n");
  doc += "\n\n## Môn phái và nhánh\n\n";
  for (const c of classDefinitions) {
    doc += `### ${c.name}\n\n${c.identity} Vai trò: ${c.role}. Hệ: ${c.element}; thuộc tính ưu tiên: ${c.preferredStat}; vũ khí hình ảnh: ${c.weapon}.\n\n`;
    for (const b of c.branches) {
      doc += `**${b.name}** — ${b.description}\n\n| Kỹ năng | Cơ chế | Cấp mở | MP | Hồi chiêu (s) | Hiệu ứng |\n|---|---|---:|---:|---:|---|\n`;
      doc +=
        skills
          .filter((d) => d.classId === c.id && d.branchId === b.id)
          .map(
            (d) =>
              `| ${d.name} | ${d.kind} | ${d.requiredLevel} | ${d.manaCost} | ${d.cooldownTicks / 20} | ${(d.effects ?? []).map((e) => e.kind).join(", ") || (d.kind === "passive" ? "Cộng chỉ số theo cấp nội công" : "Sát thương trực tiếp")} |`,
          )
          .join("\n") + "\n\n";
    }
  }
  doc +=
    "## Thế giới\n\n| Map | Kích thước | Cổng | Static placements | Spawn zones | Max zone slots |\n|---|---|---|---:|---:|---:|\n" +
    maps
      .map(
        (m) =>
          `| ${m.name} | ${m.width}×${m.height} | ${m.portals.map((p) => p.name).join(", ")} | ${m.spawns.length} | ${m.spawnZones?.length ?? 0} | ${(m.spawnZones ?? []).reduce((sum, z) => sum + z.maxPopulation, 0)} |`,
      )
      .join("\n");
  doc +=
    "\n\n## Quái và boss\n\n| Tên | Cấp | AI | Cơ chế boss |\n|---|---:|---|---|\n" +
    monsters
      .map(
        (m) =>
          `| ${m.name} | ${m.level} | ${m.brain} | ${m.bossMechanic ?? "—"} |`,
      )
      .join("\n");
  doc +=
    "\n\n## Nhiệm vụ\n\n| Tên | Objective | Điều kiện | Lặp (ticks) |\n|---|---|---|---:|\n" +
    quests
      .map(
        (q) =>
          `| ${q.name} | ${q.objectiveKind}: ${q.target} ×${q.count} | ${q.requires ?? "—"} | ${q.repeatTicks} |`,
      )
      .join("\n");
  doc +=
    "\n\n## Chế tạo\n\n" +
    recipes
      .map(
        (r) =>
          `- ${r.name}: ${r.materials.map((m) => `${m.quantity} ${content.getItem(m.itemId).name}`).join(" + ")} + ${r.gold} bạc → ${r.output.quantity} ${content.getItem(r.output.itemId).name}.`,
      )
      .join("\n");
  doc +=
    "\n\nChưa có dungeon, đồng hành, bang hội, đấu trường, công thành, NPC market hoặc nội dung thế giới cấp cao. 141 definitions có test thực thi; nhiều chiêu chia sẻ primitive và cần thêm balance/art/âm thanh riêng. Không đánh dấu v1.0 hoàn tất chỉ từ số lượng này.\n";
  await writeFile("docs/CONTENT_CATALOG.md", doc);
  const config = JSON.parse(
      await readFile("tools/balance/scenario.json", "utf8"),
    ),
    rows = [];
  for (const sect of classDefinitions)
    for (const branch of sect.branches) {
      const w = new core.GameWorld(
        core.createGame(
          "Thử Võ",
          sect.id,
          `balance-${sect.id}-${branch.id}`,
          config.seed,
        ),
      );
      let sequence = 0;
      const send = (command) =>
        w.dispatch({
          protocolVersion: 1,
          sequence: ++sequence,
          actorId: w.player.id,
          command,
        });
      w.state.level = config.level;
      w.player.level = config.level;
      w.state.skillPoints = config.skillPoints;
      w.state.attributePoints = config.attributePoints;
      send({ type: "branch", branchId: branch.id });
      for (let i = 0; i < config.attributePoints; i++)
        send({ type: "allocate", attribute: sect.preferredStat });
      const list = skills.filter(
        (d) => d.classId === sect.id && d.branchId === branch.id,
      );
      for (const d of list)
        if (!w.state.skillLevels[d.id]) send({ type: "learn", skillId: d.id });
      for (let i = 0; i < config.skillPoints; i++)
        send({ type: "learn", skillId: branch.startingSkills[0] });
      const stats = core.deriveStats(
        config.level,
        w.state.attributes,
        core.characterBonuses(w.state),
        sect.preferredStat,
      );
      Object.assign(w.player, stats, { hp: stats.maxHp, mp: stats.maxMp });
      const dummy = Object.values(w.state.entities).find(
        (e) => e.kind === "monster",
      );
      Object.assign(dummy, {
        x: 14 + config.target.distance,
        y: 14,
        spawn: { x: 14 + config.target.distance, y: 14 },
        hp: config.target.hp,
        maxHp: config.target.hp,
        attack: 0,
        defense: config.target.defense,
        element: config.target.element,
        nextAttack: 1000000000,
        movementSpeed: 0.0001,
      });
      w.state.entities = { [w.player.id]: w.player, [dummy.id]: dummy };
      w.drainEvents();
      send({ type: "attack", targetId: dummy.id });
      let manaSpent = 0,
        casts = 0,
        damage = 0,
        hits = 0;
      for (let tick = 0; tick < config.seconds * 20; tick++) {
        if (tick % config.rotationIntervalTicks === 0) {
          const id =
            w.state.hotbar[Math.floor(tick / config.rotationIntervalTicks) % 4];
          send({ type: "skill", skillId: id, targetId: dummy.id });
        }
        w.step();
        for (const e of w.drainEvents()) {
          if (
            e.type === "skill" &&
            e.entityId === w.player.id &&
            e.skillId &&
            e.skillId !== "slash"
          ) {
            manaSpent += skills.find((d) => d.id === e.skillId).manaCost;
            casts++;
          }
          if (e.type === "damage" && e.entityId === dummy.id) {
            damage += e.value ?? 0;
            hits++;
          }
        }
      }
      rows.push({
        sect: sect.name,
        branch: branch.name,
        attack: stats.attack,
        maxHp: stats.maxHp,
        maxMp: stats.maxMp,
        damage,
        dps: Number((damage / config.seconds).toFixed(2)),
        manaSpent,
        damagePerMp: manaSpent ? Number((damage / manaSpent).toFixed(2)) : null,
        casts,
        hits,
        mpRemaining: w.player.mp,
        build: w.state.skillLevels,
      });
    }
  await writeFile(
    "artifacts/balance-baseline.json",
    JSON.stringify({ contentVersion: CONTENT_VERSION, config, rows }, null, 2) +
      "\n",
  );
  console.log(
    JSON.stringify({
      version: CONTENT_VERSION,
      counts,
      balanceRows: rows.length,
    }),
  );
} finally {
  await server.close();
}
