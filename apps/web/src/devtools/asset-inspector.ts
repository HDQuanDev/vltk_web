import { propAssets, groundTextureAsset } from "@kiem-hiep/game-content";
for (const asset of propAssets) {
  const card = document.createElement("article"),
    title = document.createElement("strong"),
    canvas = document.createElement("canvas"),
    description = document.createElement("small");
  title.textContent = asset.id;
  canvas.width = 512;
  canvas.height = 512;
  card.append(title, canvas, description);
  document.getElementById("assets")!.append(card);
  const img = new Image();
  img.src = asset.url;
  await img.decode();
  const ctx = canvas.getContext("2d")!,
    scale = Math.min(480 / img.width, 450 / img.height),
    w = img.width * scale,
    h = img.height * scale,
    x = (512 - w) / 2,
    y = 512 - h - 20;
  ctx.drawImage(img, x, y, w, h);
  const px = x + w * asset.pivot.x,
    py = y + h * asset.pivot.y;
  ctx.strokeStyle = "#e6bb60";
  ctx.beginPath();
  ctx.moveTo(px - 9, py);
  ctx.lineTo(px + 9, py);
  ctx.moveTo(px, py - 9);
  ctx.lineTo(px, py + 9);
  ctx.stroke();
  description.textContent = `${img.width}×${img.height} · feet (${asset.pivot.x}, ${asset.pivot.y}) · world width ${asset.displayWidth}px · ${asset.quality}`;
}

const card = document.createElement("article"),
  title = document.createElement("strong"),
  texture = document.createElement("div"),
  note = document.createElement("small");
title.textContent = groundTextureAsset.id;
texture.style.cssText = `height:300px;margin-top:12px;background-image:url(${groundTextureAsset.url});background-size:256px`;
note.textContent = "Texture lặp 2×2 · cần review seam/scale trong scene";
card.append(title, texture, note);
document.getElementById("assets")!.append(card);

// Live item art catalog: the same mapping consumed by inventory and ground loot.
const { items } = await import("@kiem-hiep/game-content");
const { iconUrl } = await import("../ui/interface-art");
const catalog = document.createElement("section");
catalog.style.cssText =
  "grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px";
for (const item of items) {
  const entry = document.createElement("article"),
    icon = document.createElement("img"),
    name = document.createElement("strong"),
    meta = document.createElement("small");
  icon.src = iconUrl(item.icon, item.id) ?? "";
  icon.alt = item.name;
  icon.width = 64;
  icon.height = 64;
  name.textContent = item.name;
  meta.textContent = `${item.id} · ${item.rarity} · review-required`;
  entry.style.cssText =
    "display:flex;flex-direction:column;align-items:start;gap:8px;padding:12px";
  entry.append(icon, name, meta);
  catalog.append(entry);
}
document.getElementById("assets")!.append(catalog);
