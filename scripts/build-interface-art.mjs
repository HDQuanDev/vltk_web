// Portable crop/normalize/pack pipeline. Original ImageGen sources are preserved.
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const names = [
  "sword",
  "saber",
  "spear",
  "staff",
  "daggers",
  "robe",
  "helmet",
  "boots",
  "ring",
  "pendant",
  "talisman",
  "potion-red",
  "potion-blue",
  "ore",
  "herb",
  "wood",
  "gem",
  "ward",
  "slash",
  "lightning",
  "wind",
  "lotus",
  "shield",
  "manual",
];
const extraNames = [
  "fan",
  "scale-armor",
  "bamboo-hat",
  "crown",
  "silk",
  "hide",
  "jade-ore",
  "storm-iron",
  "jade-gem",
  "amber-gem",
  "dragon-sword",
  "elixir",
];
const portraits = ["male", "female", "elder", "merchant", "smith", "teacher"];
const rows = [0, 340, 644, 921, 1254],
  extraRows = [0, 362, 697, 1086];
const sources = await Promise.all(
  [
    "icons-v1.png",
    "icons-extra-v1.png",
    "portraits-v1.png",
    "lobby-v1.png",
  ].map(
    async (file) =>
      "data:image/png;base64," +
      (await readFile(`assets/source/interface/${file}`)).toString("base64"),
  ),
);
await mkdir("apps/web/public/assets/interface", { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const outputs = await page.evaluate(
    async ({ sources, names, extraNames, portraits, rows, extraRows }) => {
      const imgs = await Promise.all(
        sources.map(async (src) => {
          const img = new Image();
          img.src = src;
          await img.decode();
          return img;
        }),
      );
      if (
        imgs[0].width !== 1254 ||
        imgs[0].height !== 1254 ||
        imgs[1].width !== 1448 ||
        imgs[1].height !== 1086 ||
        imgs[2].width !== 1536 ||
        imgs[2].height !== 1024
      )
        throw new Error(
          "Source dimensions changed; review atlas cell metadata before rebuilding.",
        );
      const outputs = [],
        cells = [];
      const crop = (img, x, y, w, h, size, padding = 0) => {
        const c = document.createElement("canvas");
        c.width = c.height = size;
        const g = c.getContext("2d");
        if (padding) {
          g.fillStyle = "#171410";
          g.fillRect(0, 0, size, size);
        }
        g.imageSmoothingQuality = "high";
        const scale = Math.min(
          (size - padding * 2) / w,
          (size - padding * 2) / h,
        );
        g.drawImage(
          img,
          x,
          y,
          w,
          h,
          (size - w * scale) / 2,
          (size - h * scale) / 2,
          w * scale,
          h * scale,
        );
        return c;
      };
      const emit = (name, c) =>
        outputs.push({ name, data: c.toDataURL("image/png").split(",")[1] });
      for (let n = 0; n < names.length; n++) {
        const row = Math.floor(n / 6),
          cell = crop(
            imgs[0],
            (n % 6) * 209 + 2,
            rows[row] + 2,
            205,
            rows[row + 1] - rows[row] - 4,
            128,
            2,
          );
        cells.push(cell);
        emit(`${names[n]}-v1.png`, cell);
      }
      for (let n = 0; n < extraNames.length; n++) {
        const row = Math.floor(n / 4),
          cell = crop(
            imgs[1],
            (n % 4) * 362 + 2,
            extraRows[row] + 2,
            358,
            extraRows[row + 1] - extraRows[row] - 4,
            128,
            2,
          );
        cells.push(cell);
        emit(`${extraNames[n]}-v1.png`, cell);
      }
      for (let n = 0; n < portraits.length; n++)
        emit(
          `portrait-${portraits[n]}-v1.png`,
          crop(
            imgs[2],
            (n % 3) * 512 + 6,
            Math.floor(n / 3) * 512 + 6,
            500,
            500,
            256,
          ),
        );
      const atlas = document.createElement("canvas");
      atlas.width = atlas.height = 768;
      const g = atlas.getContext("2d");
      cells.forEach((c, n) =>
        g.drawImage(c, (n % 6) * 128, Math.floor(n / 6) * 128),
      );
      emit("icons-atlas-v1.png", atlas);
      const lobby = document.createElement("canvas");
      lobby.width = 1920;
      lobby.height = 1080;
      const scale = Math.max(1920 / imgs[3].width, 1080 / imgs[3].height);
      lobby
        .getContext("2d")
        .drawImage(
          imgs[3],
          (1920 - imgs[3].width * scale) / 2,
          (1080 - imgs[3].height * scale) / 2,
          imgs[3].width * scale,
          imgs[3].height * scale,
        );
      emit("lobby-v1.png", lobby);
      return outputs;
    },
    { sources, names, extraNames, portraits, rows, extraRows },
  );
  for (const output of outputs)
    await writeFile(
      `apps/web/public/assets/interface/${output.name}`,
      Buffer.from(output.data, "base64"),
    );
  await writeFile(
    "assets/source/interface/atlas-cells.json",
    JSON.stringify(
      {
        source: "icons-v1.png",
        width: 1254,
        height: 1254,
        columns: 6,
        rows,
        names: [...names, ...extraNames],
        extraSource: {
          file: "icons-extra-v1.png",
          width: 1448,
          height: 1086,
          columns: 4,
          rows: extraRows,
          names: extraNames,
        },
        quality: "review-required",
        background: "opaque charcoal, intentionally framed icons",
        license: "Original ImageGen output for this project",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Built ${names.length + extraNames.length} 128px icons, 6 framed portraits, 768px WebGL atlas and 1920×1080 lobby. Original sources preserved.`,
  );
} finally {
  await browser.close();
}
