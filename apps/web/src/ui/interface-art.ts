import { getItem } from "@kiem-hiep/game-content";
/** Client-only presentation metadata: never changes item definitions or save data. */
export const interfaceIcons = [
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
] as const;
const specific: Record<string, string> = {
  "cloud-spear": "spear",
  "thunder-saber": "saber",
  "jade-pendant": "pendant",
  "wolf-fang": "ring",
  "cloud-ring": "ring",
  "dragon-seal": "talisman",
  "ward-stone": "ward",
  "enhance-stone": "ward",
  "amber-gem": "amber-gem",
  "amber-gem-deep": "amber-gem",
  ore: "ore",
  "jade-ore": "jade-ore",
  "storm-iron": "storm-iron",
  wood: "wood",
  "spirit-wood": "wood",
  "jade-fan": "fan",
  "scale-mail": "scale-armor",
  "bamboo-hat": "bamboo-hat",
  "jade-crown": "crown",
  "cloud-silk": "silk",
  "beast-hide": "hide",
  "jade-gem": "jade-gem",
  "jade-gem-deep": "jade-gem",
  "boss-sword": "dragon-sword",
  "cloud-blade": "dragon-sword",
  elixir: "elixir",
  "revive-pill": "elixir",
  "hp-great": "elixir",
};
export function itemArtKey(id: string) {
  const d = getItem(id);
  return (
    specific[id] ??
    (d.kind === "helmet"
      ? "helmet"
      : d.kind === "accessory"
        ? "pendant"
        : d.icon)
  );
}
export function iconUrl(name: string, itemId?: string) {
  const key = itemId ? itemArtKey(itemId) : name;
  return interfaceIcons.includes(key as (typeof interfaceIcons)[number])
    ? `/assets/interface/${key}-v1.png`
    : null;
}
export const interfaceArtManifest = {
  version: 1,
  id: "wuxia-interface-v1",
  quality: "review-required",
  provenance:
    "Original art generated with built-in ImageGen, 2026-10-19. No third-party game assets.",
  iconSize: 128,
  icons: interfaceIcons,
  atlas: {
    id: "ui:icons",
    url: "/assets/interface/icons-atlas-v1.png",
    width: 768,
    height: 768,
    frameWidth: 128,
    frameHeight: 128,
  },
  portraits: ["male", "female", "elder", "merchant", "smith", "teacher"].map(
    (id) => ({
      id: `portrait:${id}`,
      url: `/assets/interface/portrait-${id}-v1.png`,
      width: 256,
      height: 256,
      usage: "framed portrait",
    }),
  ),
  lobby: {
    id: "ui:lobby",
    url: "/assets/interface/lobby-v1.png",
    width: 1920,
    height: 1080,
  },
};
