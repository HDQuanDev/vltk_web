import { screenToWorld, worldToScreen } from "@kiem-hiep/game-core";
export const CHUNK_SIZE = 8;
export const LANDSCAPE_PADDING = 18;
export interface ViewRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface ChunkPosition {
  x: number;
  y: number;
  key: string;
}
export function chunkBounds(x: number, y: number) {
  const p = worldToScreen({ x: x * CHUNK_SIZE - 0.5, y: y * CHUNK_SIZE - 0.5 });
  return {
    x: p.x - CHUNK_SIZE * 48 - 2,
    y: p.y - 2,
    width: CHUNK_SIZE * 96 + 4,
    height: CHUNK_SIZE * 48 + 4,
  };
}
export function visibleChunks(
  width: number,
  height: number,
  view: ViewRect,
  margin = 180,
): ChunkPosition[] {
  const rect = {
    x: view.x - margin,
    y: view.y - margin,
    width: view.width + margin * 2,
    height: view.height + margin * 2,
  };
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x, y: rect.y + rect.height },
    { x: rect.x + rect.width, y: rect.y + rect.height },
  ].map(screenToWorld);
  const loX = Math.max(
      Math.floor(-LANDSCAPE_PADDING / CHUNK_SIZE),
      Math.floor(Math.min(...corners.map((p) => p.x)) / CHUNK_SIZE),
    ),
    hiX = Math.min(
      Math.ceil((width + LANDSCAPE_PADDING) / CHUNK_SIZE) - 1,
      Math.floor(Math.max(...corners.map((p) => p.x)) / CHUNK_SIZE),
    );
  const loY = Math.max(
      Math.floor(-LANDSCAPE_PADDING / CHUNK_SIZE),
      Math.floor(Math.min(...corners.map((p) => p.y)) / CHUNK_SIZE),
    ),
    hiY = Math.min(
      Math.ceil((height + LANDSCAPE_PADDING) / CHUNK_SIZE) - 1,
      Math.floor(Math.max(...corners.map((p) => p.y)) / CHUNK_SIZE),
    );
  const out: ChunkPosition[] = [];
  for (let y = loY; y <= hiY; y++)
    for (let x = loX; x <= hiX; x++) {
      const b = chunkBounds(x, y);
      if (
        b.x + b.width >= rect.x &&
        b.x <= rect.x + rect.width &&
        b.y + b.height >= rect.y &&
        b.y <= rect.y + rect.height
      )
        out.push({ x, y, key: `${x}:${y}` });
    }
  return out;
}
export function clampCameraCenter(
  point: { x: number; y: number },
  width: number,
  height: number,
  viewWidth: number,
  viewHeight: number,
  zoom: number,
) {
  const p = screenToWorld(point),
    margin = (viewWidth / 192 + viewHeight / 96) / zoom,
    min = -LANDSCAPE_PADDING + margin,
    maxX = width + LANDSCAPE_PADDING - margin,
    maxY = height + LANDSCAPE_PADDING - margin;
  return worldToScreen({
    x: Math.max(min, Math.min(maxX, p.x)),
    y: Math.max(min, Math.min(maxY, p.y)),
  });
}
