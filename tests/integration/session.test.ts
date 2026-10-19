import { it, expect, vi } from "vitest";
import { LocalGameSession } from "../../packages/game-session/src/index";
import { createGame } from "../../packages/game-core/src/index";
import type { GameSession } from "../../packages/game-protocol/src/index";
it("GameSession contract: 20Hz, command, subscribe/unsubscribe, snapshot và dispose", async () => {
  vi.useFakeTimers();
  const session: GameSession = new LocalGameSession(createGame("Phiên Cục Bộ"));
  const updates: number[] = [];
  const unsubscribe = session.subscribe((u) => updates.push(u.snapshot.tick));
  await session.start();
  await vi.advanceTimersByTimeAsync(1000);
  expect(session.getSnapshot().tick).toBe(20);
  session.sendCommand({ type: "move", destination: { x: 16, y: 14 } });
  await vi.advanceTimersByTimeAsync(500);
  expect(
    session.getSnapshot().entities[session.getSnapshot().playerId].x,
  ).toBeGreaterThan(14);
  const copy = session.getSnapshot();
  copy.gold = 999;
  expect(session.getSnapshot().gold).not.toBe(999);
  unsubscribe();
  const count = updates.length;
  await vi.advanceTimersByTimeAsync(500);
  expect(updates.length).toBe(count);
  await session.dispose();
  const tick = session.getSnapshot().tick;
  await vi.advanceTimersByTimeAsync(1000);
  expect(session.getSnapshot().tick).toBe(tick);
  vi.useRealTimers();
});
