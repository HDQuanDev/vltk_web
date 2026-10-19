import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
const scenes = [
  "creation",
  "selection",
  "hud",
  "inventory",
  "equipment",
  "shop",
  "enhancement",
  "crafting",
  "gems",
  "warehouse",
  "skills",
  "dialogue",
  "quests",
  "map",
  "settings",
  "thanhvanson",
];
const browser = await chromium.launch();
try {
  for (const width of [1366, 844]) {
    const images = await Promise.all(
      scenes.map(async (name) => ({
        name,
        src:
          "data:image/png;base64," +
          (
            await readFile(`artifacts/visual-after/${name}-${width}.png`)
          ).toString("base64"),
      })),
    );
    const page = await browser.newPage();
    const result = await page.evaluate(async (images) => {
      const c = document.createElement("canvas");
      c.width = 1440;
      c.height = 1040;
      const g = c.getContext("2d");
      g.fillStyle = "#101a1c";
      g.fillRect(0, 0, c.width, c.height);
      for (let n = 0; n < images.length; n++) {
        const img = new Image();
        img.src = images[n].src;
        await img.decode();
        const x = (n % 4) * 360,
          y = Math.floor(n / 4) * 260,
          scale = Math.min(352 / img.width, 226 / img.height);
        g.drawImage(
          img,
          x + 4 + (352 - img.width * scale) / 2,
          y + 26,
          img.width * scale,
          img.height * scale,
        );
        g.fillStyle = "#e6cc96";
        g.font = "14px Arial";
        g.fillText(images[n].name, x + 10, y + 19);
      }
      return c.toDataURL("image/png").split(",")[1];
    }, images);
    await writeFile(
      `artifacts/visual-after/contact-${width}.png`,
      Buffer.from(result, "base64"),
    );
    await page.close();
  }
} finally {
  await browser.close();
}
