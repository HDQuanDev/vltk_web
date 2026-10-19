import { it, expect, vi, afterEach } from "vitest";
import { AudioManager } from "../../apps/web/src/game/audio";
import { createGame } from "../../packages/game-core/src/index";
class Param {
  value = 0;
  setValueAtTime(v: number) {
    this.value = v;
  }
  linearRampToValueAtTime(v: number) {
    this.value = v;
  }
  exponentialRampToValueAtTime(v: number) {
    this.value = v;
  }
  setTargetAtTime(v: number) {
    this.value = v;
  }
  cancelScheduledValues() {}
}
class Node {
  gain = new Param();
  frequency = new Param();
  threshold = new Param();
  knee = new Param();
  ratio = new Param();
  Q = new Param();
  type = "";
  loop = false;
  buffer: unknown;
  onended: (() => void) | null = null;
  timer: ReturnType<typeof setTimeout> | null = null;
  connect<T>(n: T) {
    return n;
  }
  disconnect() {}
  start() {}
  stop(t = 0) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.onended?.(), t * 1000);
  }
}
class Context {
  static created = 0;
  static instances: Context[] = [];
  state = "running";
  currentTime = 0;
  sampleRate = 8000;
  destination = new Node();
  createdVoices = 0;
  constructor() {
    Context.created++;
    Context.instances.push(this);
  }
  createGain() {
    return new Node();
  }
  createDynamicsCompressor() {
    return new Node();
  }
  createOscillator() {
    this.createdVoices++;
    return new Node();
  }
  createBufferSource() {
    this.createdVoices++;
    return new Node();
  }
  createBiquadFilter() {
    return new Node();
  }
  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
  async resume() {
    this.state = "running";
  }
  async close() {
    this.state = "closed";
  }
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Context.created = 0;
  Context.instances = [];
});
it("audio không tạo context trước gesture, unlock và dispose dừng session", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("AudioContext", Context);
  const a = new AudioManager(),
    s = createGame();
  a.sync(s);
  expect(Context.created).toBe(0);
  expect(a.diagnostics.context).toBe("locked");
  a.unlock();
  expect(Context.created).toBe(1);
  const context = Context.instances[0];
  a.play(
    {
      id: 1,
      tick: 2,
      type: "skill",
      entityId: s.playerId,
      skillId: "slash",
      text: "",
    },
    s.settings,
  );
  expect(a.diagnostics.voices).toBeGreaterThan(0);
  a.dispose();
  expect(context.state).toBe("closed");
  expect(a.diagnostics.voices).toBe(0);
  await vi.runAllTimersAsync();
  expect(a.diagnostics.voices).toBe(0);
});
it("voice budget chặn spam, mute và pause không tạo âm mới", () => {
  vi.useFakeTimers();
  vi.stubGlobal("AudioContext", Context);
  const a = new AudioManager(),
    s = createGame();
  a.sync(s);
  a.unlock();
  for (let i = 0; i < 120; i++)
    a.play(
      { id: i, tick: i * 2, type: "level", entityId: s.playerId, text: "" },
      s.settings,
    );
  expect(a.diagnostics.voices).toBeLessThanOrEqual(16);
  const context = Context.instances[0],
    before = context.createdVoices;
  s.settings.sound = false;
  a.sync(s);
  a.play(
    { id: 500, tick: 500, type: "skill", entityId: s.playerId, text: "" },
    s.settings,
  );
  expect(context.createdVoices).toBe(before);
  s.settings.sound = true;
  s.paused = true;
  a.sync(s);
  a.preview();
  expect(context.createdVoices).toBe(before);
  a.dispose();
});
it("chuyển map liên tục chỉ giữ tối đa hai music buses khi crossfade", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("AudioContext", Context);
  const a = new AudioManager(),
    s = createGame();
  s.settings.music = true;
  a.sync(s);
  a.unlock();
  for (let i = 0; i < 30; i++) {
    s.mapId = ["village", "forest", "camp", "highlands"][i % 4];
    a.sync(s);
    expect(a.diagnostics.musicTracks).toBeLessThanOrEqual(2);
  }
  await vi.advanceTimersByTimeAsync(2200);
  expect(a.diagnostics.musicTracks).toBe(1);
  expect(a.diagnostics.voices).toBeLessThanOrEqual(16);
  a.dispose();
  expect(a.diagnostics.musicTracks).toBe(0);
});
it("presentation samples obey the same voice budget, outcome events and disposal", async () => {
  vi.useFakeTimers();
  class SampleContext extends Context {
    async decodeAudioData() {
      return this.createBuffer(1, 16);
    }
  }
  vi.stubGlobal("AudioContext", SampleContext);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(new ArrayBuffer(64))),
  );
  const a = new AudioManager(),
    s = createGame();
  a.sync(s);
  a.unlock();
  await vi.advanceTimersByTimeAsync(0);
  expect(a.diagnostics.loadedSamples).toBe(5);
  const context = Context.instances[0],
    before = context.createdVoices;
  a.play(
    { id: 1, tick: 100, type: "equipment", text: "Kết quả", success: true },
    s.settings,
  );
  a.play(
    { id: 2, tick: 102, type: "equipment", text: "Kết quả", success: false },
    s.settings,
  );
  expect(context.createdVoices - before).toBe(2);
  expect(a.diagnostics.voices).toBeLessThanOrEqual(16);
  a.dispose();
  expect(a.diagnostics.loadedSamples).toBe(0);
});
