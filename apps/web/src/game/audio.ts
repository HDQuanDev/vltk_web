import type {
  GameEvent,
  GameSettings,
  GameSnapshot,
} from "@kiem-hiep/game-protocol";
import { getPreferences } from "./preferences";
type Bus = "music" | "ambient" | "combat" | "ui";
interface Voice {
  source: AudioScheduledSourceNode;
  gain: GainNode;
  priority: number;
}
const melodies: Record<string, number[]> = {
  village: [0, 4, 7, 9, 7, 4, 2, 0, 2, 4, 7, 4, 2, -3, 0, 2],
  forest: [0, 2, 7, 4, 9, 7, 4, 2, 0, -3, 2, 4, 7, 2, 0, -3],
  camp: [0, 0, 3, 7, 5, 3, 0, -2, 0, 3, 5, 7, 10, 7, 3, 0],
  highlands: [0, 4, 7, 12, 9, 7, 4, 2, 4, 7, 9, 7, 4, 2, 0, -3],
  riverlands: [0, 7, 9, 4, 2, 4, 7, 2, 0, -3, 2, 7, 4, 2, 0, -5],
  boss: [0, 0, 3, 0, 7, 5, 3, -2, 0, 3, 7, 10, 7, 5, 3, 0],
};
export class AudioManager {
  private context: AudioContext | null = null;
  private buses: Partial<Record<Bus, GainNode>> = {};
  private master: GainNode | null = null;
  private voices = new Set<Voice>();
  private buffers = new Map<number, AudioBuffer>();
  private fading: {
    gain: GainNode;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private stops = new Set<ReturnType<typeof setTimeout>>();
  private ambient: AudioBufferSourceNode | null = null;
  private state: GameSnapshot | null = null;
  private track = "";
  private trackGain: GainNode | null = null;
  private phase = 0;
  private lastSounds = new Map<string, number>();
  private serial = 0;
  private musicTracks = 0;
  private disposed = false;
  private samples = new Map<string, AudioBuffer>();
  private samplesRequested = false;
  private sampleAbort = new AbortController();
  private loadSamples() {
    const c = this.context;
    if (!c?.decodeAudioData || this.samplesRequested) return;
    this.samplesRequested = true;
    for (const name of [
      "forge-success",
      "forge-failure",
      "craft",
      "coin",
      "equip",
    ])
      void fetch(`/assets/audio/${name}-v1.wav`, {
        signal: this.sampleAbort.signal,
      })
        .then((r) => {
          if (!r.ok) throw new Error(`Audio ${r.status}: ${name}`);
          return r.arrayBuffer();
        })
        .then((b) => c.decodeAudioData(b))
        .then((b) => {
          if (!this.disposed && this.context === c) this.samples.set(name, b);
        })
        .catch(() => {
          /* Existing synth remains available if an optional sample cannot load. */
        });
  }
  private sample(name: string, volume: number, bus: Bus, priority: number) {
    const c = this.context,
      buffer = this.samples.get(name);
    if (!c || c.state !== "running" || !buffer) return false;
    const source = c.createBufferSource(),
      gain = c.createGain();
    source.buffer = buffer;
    gain.gain.value = volume * 0.35;
    source.connect(gain);
    gain.connect(this.buses[bus]!);
    if (!this.reserve(source, gain, priority)) return true;
    source.start();
    return true;
  }
  unlock() {
    if (this.disposed) return;
    this.context ??= new AudioContext();
    if (!this.master) {
      const c = this.context,
        master = c.createGain(),
        compressor = c.createDynamicsCompressor();
      compressor.threshold.value = -12;
      compressor.knee.value = 18;
      compressor.ratio.value = 5;
      master.connect(compressor);
      compressor.connect(c.destination);
      this.master = master;
      for (const id of ["music", "ambient", "combat", "ui"] as Bus[]) {
        const bus = c.createGain();
        bus.connect(master);
        this.buses[id] = bus;
      }
    }
    if (this.context.state === "suspended") void this.context.resume();
    this.apply();
    this.loadSamples();
    this.startAmbient();
    this.selectTrack();
  }
  sync(s: GameSnapshot) {
    this.state = s;
    this.apply();
    this.selectTrack();
    const p = s.entities[s.playerId];
    if (p.state === "walk" && s.tick % 7 === 0)
      this.effect("step", 0.18, "combat", 1, s.tick);
  }
  private apply() {
    const c = this.context;
    if (!c || !this.master) return;
    const p = getPreferences(),
      s = this.state;
    this.master.gain.setTargetAtTime(
      s?.paused ? 0 : p.masterVolume,
      c.currentTime,
      0.04,
    );
    const volumes = {
      music: s?.settings.music ? p.musicVolume : 0,
      ambient: s?.settings.sound ? p.ambientVolume : 0,
      combat: s?.settings.sound ? p.combatVolume : 0,
      ui: s?.settings.sound ? p.uiVolume : 0,
    };
    for (const id of Object.keys(volumes) as Bus[])
      this.buses[id]?.gain.setTargetAtTime(volumes[id], c.currentTime, 0.12);
  }
  private selectTrack() {
    if (!this.context || !this.state) return;
    const s = this.state,
      p = s.entities[s.playerId],
      boss = Object.values(s.entities).some(
        (e) =>
          e.mapId === s.mapId &&
          e.definitionId === "boss" &&
          e.hp > 0 &&
          Math.hypot(e.x - p.x, e.y - p.y) < 9,
      ),
      id = boss ? "boss" : s.mapId;
    if (id === this.track) return;
    this.track = id;
    this.phase = 0;
    const c = this.context,
      old = this.trackGain,
      next = c.createGain();
    next.gain.value = 0;
    next.connect(this.buses.music!);
    next.gain.linearRampToValueAtTime(1, c.currentTime + 1.5);
    this.trackGain = next;
    this.musicTracks++;
    if (this.fading) {
      clearTimeout(this.fading.timer);
      this.stops.delete(this.fading.timer);
      this.fading.gain.disconnect();
      this.fading = null;
      this.musicTracks--;
    }
    if (old) {
      old.gain.cancelScheduledValues(c.currentTime);
      old.gain.setTargetAtTime(0, c.currentTime, 0.4);
      const stop = setTimeout(() => {
        old.disconnect();
        this.musicTracks--;
        this.stops.delete(stop);
        this.fading = null;
      }, 2000);
      this.stops.add(stop);
      this.fading = { gain: old, timer: stop };
    }
    if (!this.timer) this.timer = setInterval(() => this.musicStep(), 480);
  }
  private musicStep() {
    const s = this.state;
    if (
      !s ||
      s.paused ||
      !s.settings.music ||
      !this.trackGain ||
      this.context?.state !== "running"
    )
      return;
    const phrase = melodies[this.track] ?? melodies.forest,
      step = this.phase++,
      semi = phrase[step % phrase.length],
      freq = 220 * 2 ** (semi / 12);
    this.note(freq, 1.5, 0.025, "music", 0, this.trackGain, "triangle");
    if (step % 4 === 0)
      this.note(freq / 2, 2.4, 0.018, "music", 0, this.trackGain, "sine");
    if (step % 8 === 4)
      this.note(freq * 2, 0.8, 0.009, "music", 0, this.trackGain, "sine");
    if (this.track === "boss" && step % 2 === 0)
      this.noise(0.1, 0.018, "music", 0, 200, this.trackGain);
  }
  private startAmbient() {
    const c = this.context;
    if (!c || this.ambient) return;
    const source = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      gain = c.createGain();
    source.buffer = this.noiseBuffer(2);
    source.loop = true;
    filter.type = "lowpass";
    filter.frequency.value = 650;
    gain.gain.value = 0.012;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.buses.ambient!);
    source.start();
    this.ambient = source;
  }
  private noiseBuffer(seconds: number) {
    const existing = this.buffers.get(seconds);
    if (existing) return existing;
    const c = this.context!,
      buffer = c.createBuffer(
        1,
        Math.ceil(c.sampleRate * seconds),
        c.sampleRate,
      ),
      data = buffer.getChannelData(0);
    let seed = 9027;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[i] = seed / 2147483648 - 1;
    }
    this.buffers.set(seconds, buffer);
    return buffer;
  }
  private reserve(
    source: AudioScheduledSourceNode,
    gain: GainNode,
    priority: number,
  ) {
    if (this.voices.size >= 16) {
      const lowest = [...this.voices].sort(
        (a, b) => a.priority - b.priority,
      )[0];
      if (lowest.priority > priority) {
        source.disconnect();
        gain.disconnect();
        return false;
      }
      try {
        lowest.source.stop();
      } catch {
        /* voice đã kết thúc */
      }
      lowest.source.disconnect();
      lowest.gain.disconnect();
      this.voices.delete(lowest);
    }
    const voice = { source, gain, priority };
    this.voices.add(voice);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      this.voices.delete(voice);
    };
    return true;
  }
  private note(
    freq: number,
    duration: number,
    volume: number,
    bus: Bus,
    priority: number,
    output?: AudioNode,
    type: OscillatorType = "sine",
    endFreq?: number,
  ) {
    const c = this.context;
    if (!c || c.state !== "running") return;
    const o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (endFreq)
      o.frequency.exponentialRampToValueAtTime(
        Math.max(20, endFreq),
        c.currentTime + duration,
      );
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(volume, c.currentTime + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    o.connect(g);
    g.connect(output ?? this.buses[bus]!);
    if (!this.reserve(o, g, priority)) return;
    o.start();
    o.stop(c.currentTime + duration);
  }
  private noise(
    duration: number,
    volume: number,
    bus: Bus,
    priority: number,
    frequency = 1800,
    output?: AudioNode,
  ) {
    const c = this.context;
    if (!c || c.state !== "running") return;
    const source = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      g = c.createGain();
    source.buffer = this.noiseBuffer(duration);
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 0.8;
    source.connect(filter);
    filter.connect(g);
    g.gain.setValueAtTime(volume, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    g.connect(output ?? this.buses[bus]!);
    if (!this.reserve(source, g, priority)) {
      filter.disconnect();
      return;
    }
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      g.disconnect();
      for (const v of this.voices)
        if (v.source === source) this.voices.delete(v);
    };
    source.start();
    source.stop(c.currentTime + duration);
  }
  private effect(
    kind: string,
    volume: number,
    bus: Bus,
    priority: number,
    tick: number,
  ) {
    if (this.state?.paused || !this.state?.settings.sound) return;
    const last = this.lastSounds.get(kind) ?? -100;
    if (tick - last < 2) return;
    this.lastSounds.set(kind, tick);
    const sampleNames: Partial<Record<string, string>> = {
      enhance: "forge-success",
      "enhance-failure": "forge-failure",
      craft: "craft",
      coin: "coin",
      equip: "equip",
    };
    const sampleName = sampleNames[kind];
    if (sampleName && this.sample(sampleName, volume, bus, priority)) return;
    const variation = 1 + ((this.serial++ % 5) - 2) * 0.025;
    if (["step", "slash", "impact", "fire", "poison"].includes(kind))
      this.noise(
        kind === "step" ? 0.055 : kind === "fire" ? 0.35 : 0.16,
        volume * 0.11,
        bus,
        priority,
        kind === "step"
          ? 350
          : kind === "impact"
            ? 1400
            : kind === "fire"
              ? 700
              : 2800,
      );
    const tone =
      kind === "heal"
        ? 660
        : kind === "ice"
          ? 1100
          : kind === "lightning"
            ? 160
            : kind === "loot"
              ? 980
              : kind === "craft"
                ? 490
                : kind === "enhance"
                  ? 320
                  : kind === "level"
                    ? 523
                    : kind === "boss"
                      ? 70
                      : kind === "death"
                        ? 90
                        : kind === "ui"
                          ? 760
                          : 260;
    this.note(
      tone * variation,
      kind === "boss" ? 0.75 : kind === "level" ? 0.6 : 0.22,
      volume * 0.055,
      bus,
      priority,
      undefined,
      kind === "slash" || kind === "lightning" ? "triangle" : "sine",
      kind === "slash" ? 70 : kind === "heal" ? tone * 1.5 : undefined,
    );
  }
  play(e: GameEvent, settings: GameSettings) {
    if (!settings.sound || !this.state) return;
    const s = this.state,
      p = s.entities[s.playerId],
      entity = e.entityId ? s.entities[e.entityId] : null;
    if (
      entity &&
      (entity.mapId !== s.mapId ||
        Math.hypot(entity.x - p.x, entity.y - p.y) > 16)
    )
      return;
    const volume = entity
      ? Math.max(0.12, 1 - Math.hypot(entity.x - p.x, entity.y - p.y) / 18)
      : 0.6;
    let kind: string | null = null;
    if (e.type === "skill")
      kind =
        e.skillId === "heal"
          ? "heal"
          : e.skillId === "slash"
            ? "slash"
            : {
                fire: "fire",
                water: "ice",
                wood: "poison",
                metal: "slash",
                earth: "lightning",
              }[e.element ?? p.element];
    else if (e.type === "damage" && e.value) kind = "impact";
    else if (e.type === "heal") kind = "heal";
    else if (e.type === "craft") kind = "craft";
    else if (e.type === "equipment")
      kind =
        e.success === false
          ? "enhance-failure"
          : e.success === true
            ? "enhance"
            : "equip";
    else if (
      (e.type === "loot" && e.text.startsWith("Đã mua")) ||
      (e.type === "message" && e.text.startsWith("Đã bán"))
    )
      kind = "coin";
    else if (e.type === "loot") kind = "loot";
    else if (e.type === "level") kind = "level";
    else if (e.type === "death") kind = "death";
    else if (e.type === "telegraph") kind = "boss";
    if (kind)
      this.effect(
        kind,
        volume,
        "combat",
        kind === "boss" || kind === "level" ? 3 : 2,
        e.tick,
      );
  }
  click() {
    if (this.state)
      this.effect("ui", 0.45, "ui", 1, this.state.tick + this.serial++);
  }
  preview() {
    this.unlock();
    if (this.state)
      this.effect("heal", 1, "ui", 3, this.state.tick + this.serial++);
  }
  get diagnostics() {
    return {
      voices: this.voices.size,
      maxVoices: 16,
      musicTracks: this.musicTracks,
      track: this.track,
      context: this.context?.state ?? "locked",
      loadedSamples: this.samples.size,
    };
  }
  dispose() {
    this.disposed = true;
    this.sampleAbort.abort();
    this.samples.clear();
    if (this.timer) clearInterval(this.timer);
    for (const t of this.stops) clearTimeout(t);
    this.stops.clear();
    for (const v of this.voices) {
      try {
        v.source.stop();
      } catch {
        /* ended */
      }
      v.source.disconnect();
      v.gain.disconnect();
    }
    this.voices.clear();
    this.buffers.clear();
    this.fading?.gain.disconnect();
    this.fading = null;
    this.ambient?.stop();
    this.ambient?.disconnect();
    this.trackGain?.disconnect();
    for (const b of Object.values(this.buses)) b.disconnect();
    this.master?.disconnect();
    void this.context?.close();
    this.context = null;
    this.timer = null;
    this.musicTracks = 0;
  }
}
let audio: AudioManager | null = null;
const manager = () => (audio ??= new AudioManager());
export const unlockAudio = () => manager().unlock();
export const playInterfaceClick = () => manager().click();
export const syncAudio = (s: GameSnapshot) => manager().sync(s);
export const playEvent = (e: GameEvent, s: GameSettings) =>
  manager().play(e, s);
export const previewAudio = () => manager().preview();
export const audioDiagnostics = () => manager().diagnostics;
export function disposeAudio() {
  audio?.dispose();
  audio = null;
}
