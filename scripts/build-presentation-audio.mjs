// Original physical-model development SFX. Deterministic, no gameplay RNG.
import { mkdir, writeFile } from "node:fs/promises";
const rate = 22050;
await mkdir("apps/web/public/assets/audio", { recursive: true });
const report = [];
for (const [name, duration] of [
  ["forge-success", 1.2],
  ["forge-failure", 1.1],
  ["craft", 0.65],
  ["coin", 0.45],
  ["equip", 0.35],
]) {
  let seed = 19227,
    lp = 0;
  const frames = Math.ceil(rate * duration),
    data = new Float64Array(frames);
  const noise = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2147483648 - 1;
  };
  for (let n = 0; n < frames; n++) {
    const t = n / rate;
    lp = 0.86 * lp + 0.14 * noise();
    let value = 0;
    const strikes =
      name === "coin" ? [0, 0.085, 0.17] : name === "craft" ? [0, 0.19] : [0];
    for (const start of strikes) {
      const q = t - start;
      if (q < 0) continue;
      const f = name === "coin" ? 1480 : name === "equip" ? 650 : 420;
      for (const [ratio, weight, decay] of [
        [1, 1, 7],
        [2.76, 0.5, 13],
        [5.4, 0.24, 19],
        [8.93, 0.1, 26],
      ])
        value +=
          Math.sin(q * f * ratio * Math.PI * 2) *
          weight *
          Math.exp(-q * decay) *
          Math.min(1, q * 1800) *
          0.17;
      value += noise() * Math.exp(-q * 80) * 0.16;
    }
    if (name === "forge-success")
      for (const [i, f] of [523.25, 659.25, 783.99, 1046.5].entries()) {
        const q = t - 0.14 - i * 0.07;
        if (q > 0)
          value +=
            (Math.sin(q * f * 6.283) + Math.sin(q * f * 2.006 * 6.283) * 0.16) *
            Math.exp(-q * 3) *
            Math.min(1, q * 30) *
            0.07;
      }
    if (name === "forge-failure")
      value +=
        lp * Math.exp(-t * 2.6) * Math.min(1, t * 14) * 0.55 +
        Math.sin(6.283 * (110 * t - 24 * t * t)) * Math.exp(-t * 4) * 0.08;
    if (name === "equip" || name === "craft")
      value += lp * Math.exp(-t * 8) * 0.14;
    data[n] = value * Math.min(1, (duration - t) * 40);
  }
  const peak = Math.max(...data.map(Math.abs)),
    scale = 0.72 / Math.max(0.001, peak);
  const wav = Buffer.alloc(44 + frames * 2);
  wav.write("RIFF");
  wav.writeUInt32LE(36 + frames * 2, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(frames * 2, 40);
  for (let n = 0; n < frames; n++)
    wav.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, data[n] * scale)) * 32767),
      44 + n * 2,
    );
  await writeFile(`apps/web/public/assets/audio/${name}-v1.wav`, wav);
  report.push({
    name,
    duration,
    rate,
    bytes: wav.length,
    quality: "development",
    provenance:
      "Original deterministic physical-model synthesis; not recorded production audio",
  });
}
await writeFile(
  "assets/source/interface/audio-manifest.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
