import { expect } from "vitest";
import {
  createGame,
  GameWorld,
  distance,
} from "../../packages/game-core/src/index";
import { getItem, skills } from "../../packages/game-content/src/index";
import type { GameCommand } from "../../packages/game-protocol/src/index";
export function starterJourney() {
  const w = new GameWorld(
    createGame("Lữ Khách", "wudang", "full-journey", 71227),
  );
  let seq = 0;
  const send = (command: GameCommand) =>
    w.dispatch({
      protocolVersion: 1,
      sequence: ++seq,
      actorId: w.state.playerId,
      command,
    });
  function support() {
    const s = w.state,
      p = w.player;
    if (p.hp <= 0)
      throw new Error(`Nhân vật chết tại ${s.mapId}, tick ${s.tick}`);
    if (p.hp < p.maxHp * 0.55 && (p.cooldowns.potion ?? 0) <= s.tick) {
      const potion = s.inventory.find((i) => i.definitionId === "hp");
      if (potion) send({ type: "useItem", instanceId: potion.id });
    }
    if (p.mp < p.maxMp * 0.2 && (p.cooldowns.potion ?? 0) <= s.tick) {
      const potion = s.inventory.find((i) => i.definitionId === "mp");
      if (potion) send({ type: "useItem", instanceId: potion.id });
    }
    if (
      p.hp < p.maxHp * 0.65 &&
      p.mp >= 22 &&
      (p.cooldowns.heal ?? 0) <= s.tick
    )
      send({ type: "skill", skillId: "heal" });
  }
  function until(predicate: () => boolean, max = 2400) {
    for (let n = 0; n < max && !predicate(); n++) {
      w.step();
      if (n % 10 === 0) support();
    }
    expect(
      predicate(),
      `Điều kiện không đạt ở ${w.state.mapId}, tick ${w.state.tick}`,
    ).toBe(true);
  }
  function travel(targetId: string, toMap: string) {
    send({ type: "interact", targetId });
    until(() => w.state.mapId === toMap);
  }
  function elder() {
    send({ type: "interact", targetId: "elder" });
    until(() => w.state.pendingInteraction === null);
  }
  function improve() {
    while (w.state.attributePoints > 0)
      send({ type: "allocate", attribute: "strength" });
    for (const i of [...w.state.inventory]) {
      const d = getItem(i.definitionId);
      if (
        ["weapon", "armor", "boots"].includes(d.kind) &&
        w.state.level >= d.level
      ) {
        const old = w.state.equipment[d.kind];
        if (
          !old ||
          d.attack + d.defense >
            getItem(old.definitionId).attack + getItem(old.definitionId).defense
        )
          send({ type: "equip", instanceId: i.id });
      }
    }
  }
  function hunt(questId: string) {
    for (
      let t = 0;
      t < 8000 &&
      w.state.quests.find((q) => q.id === questId)?.status !== "ready";
      t++
    ) {
      if (t % 10 === 0) {
        support();
        improve();
        let target = w.player.targetId
          ? w.state.entities[w.player.targetId]
          : undefined;
        if (!target || target.hp <= 0) {
          const type =
            questId === "bandits"
              ? "bandit"
              : questId === "wolves"
                ? "wolf"
                : "boss";
          target = Object.values(w.state.entities)
            .filter((e) => e.definitionId === type && e.hp > 0)
            .sort((a, b) => distance(w.player, a) - distance(w.player, b))[0];
          if (target) send({ type: "attack", targetId: target.id });
        }
        if (target) {
          for (const id of ["thunder", "storm"]) {
            const d = skills.find((s) => s.id === id)!;
            if (
              distance(w.player, target) <= d.range &&
              w.player.mp >= d.manaCost &&
              (w.player.cooldowns[id] ?? 0) <= w.state.tick
            )
              send({ type: "skill", skillId: id, targetId: target.id });
          }
        }
      }
      w.step();
    }
    expect(w.state.quests.find((q) => q.id === questId)?.status).toBe("ready");
    send({ type: "stop" });
    for (const loot of Object.values(w.state.groundLoot).filter(
      (l) => l.mapId === w.state.mapId,
    )) {
      send({ type: "pickup", lootId: loot.id });
      until(() => !w.state.groundLoot[loot.id]);
    }
  }
  elder();
  send({ type: "acceptQuest", questId: "bandits" });
  hunt("bandits");
  elder();
  send({ type: "claimQuest", questId: "bandits" });
  improve();
  send({ type: "acceptQuest", questId: "wolves" });
  travel("portal:forest", "forest");
  hunt("wolves");
  travel("portal:village", "village");
  elder();
  send({ type: "claimQuest", questId: "wolves" });
  improve();
  send({ type: "acceptQuest", questId: "boss" });
  travel("portal:forest", "forest");
  travel("portal:camp", "camp");
  hunt("boss");
  expect(w.state.inventory.some((i) => i.definitionId === "boss-sword")).toBe(
    true,
  );
  travel("portal:forest", "forest");
  travel("portal:village", "village");
  elder();
  send({ type: "claimQuest", questId: "boss" });
  expect(w.state.quests.every((q) => q.status === "claimed")).toBe(true);
  expect(w.state.level).toBeGreaterThanOrEqual(4);
  expect(w.state.gold).toBeGreaterThan(500);
  improve();
  return w;
}
