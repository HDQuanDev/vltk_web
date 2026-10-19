import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { items } from "../../packages/game-content/src/index";
import {
  interfaceIcons,
  iconUrl,
  itemArtKey,
} from "../../apps/web/src/ui/interface-art";

describe("interface asset contract", () => {
  it("every live item resolves to a real 128px bitmap, without an SVG fallback", () => {
    for (const d of items) {
      const url = iconUrl(d.icon, d.id);
      expect(url, d.id).toBeTruthy();
      const b = readFileSync(`apps/web/public${url}`);
      expect(b.subarray(1, 4).toString()).toBe("PNG");
      expect([b.readUInt32BE(16), b.readUInt32BE(20)]).toEqual([128, 128]);
    }
  });
  it("unrelated equipment/material silhouettes remain distinct", () => {
    const groups = [
      ["cloud-spear", "thunder-saber", "jade-fan", "pine-blade"],
      ["wood", "cloud-silk", "beast-hide", "ore", "jade-ore", "storm-iron"],
      ["bamboo-hat", "jade-crown", "thunder-helm"],
      ["jade-gem", "amber-gem", "ward-stone"],
    ];
    for (const ids of groups)
      expect(new Set(ids.map(itemArtKey)).size).toBe(ids.length);
  });
  it("WebGL atlas fits every stable frame and contains no duplicate IDs", () => {
    const b = readFileSync(
      "apps/web/public/assets/interface/icons-atlas-v1.png",
    );
    const frames = ((b.readUInt32BE(16) / 128) * b.readUInt32BE(20)) / 128;
    expect(new Set(interfaceIcons).size).toBe(interfaceIcons.length);
    expect(frames).toBe(interfaceIcons.length);
    const cells = JSON.parse(
      readFileSync("assets/source/interface/atlas-cells.json", "utf8"),
    );
    expect(cells.names).toEqual([...interfaceIcons]);
  });
});
