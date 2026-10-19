import { GameWorld } from "../../game-core/src/index";
import type {
  GameSession,
  GameSnapshot,
  GameCommand,
  GameUpdate,
} from "../../game-protocol/src/index";
export type { GameSession } from "../../game-protocol/src/index";
export class LocalGameSession implements GameSession {
  private world: GameWorld;
  private sequence = 0;
  private listeners = new Set<(update: GameUpdate) => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private tickMs = 0;
  constructor(state: GameSnapshot) {
    this.world = new GameWorld(state);
  }
  async start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      const start = performance.now();
      this.world.step();
      this.tickMs = performance.now() - start;
      this.publish();
    }, 50);
    this.publish();
  }
  sendCommand(command: GameCommand) {
    this.world.dispatch({
      protocolVersion: 1,
      sequence: ++this.sequence,
      actorId: this.world.state.playerId,
      command,
    });
    this.publish();
  }
  subscribe(listener: (update: GameUpdate) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  /** Authority đầy đủ để lưu/khôi phục; không phải dữ liệu render mỗi tick. */
  getSnapshot() {
    return this.world.snapshot();
  }
  /**
   * Vòng publish 20Hz gửi view đã lọc theo bản đồ đang có người chơi, nên chi
   * phí không tăng theo số bản đồ đã thăm. `getSnapshot()` vẫn trả authority đầy
   * đủ cho lưu trữ và kiểm thử.
   */
  private publish() {
    const start = performance.now();
    const snapshot = this.world.viewSnapshot();
    const update = {
      snapshot,
      events: this.world.drainEvents(),
      acknowledgedSequence: this.sequence,
      diagnostics: {
        ...this.world.diagnostics,
        tickMs: this.tickMs,
        publishMs: performance.now() - start,
      },
    };
    this.listeners.forEach((l) => l(update));
  }
  async dispose() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.listeners.clear();
  }
}
