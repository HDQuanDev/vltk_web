import { it, expect } from "vitest";
import {
  validateContent,
  assetManifest,
} from "../../packages/game-content/src/index";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
it("content references, spawn, loot và ID hợp lệ", () =>
  expect(validateContent()).toEqual([]));
it("asset manifest trỏ tới tài nguyên thực của dự án", () => {
  for (const key of ["character", "portrait"] as const)
    expect(
      existsSync(resolve("apps/web/public", assetManifest[key].slice(1))),
    ).toBe(true);
});
it("core chạy trong Node và không import browser, UI hoặc storage", () => {
  function visit(path: string): string[] {
    return readdirSync(path, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory()
        ? visit(resolve(path, e.name))
        : e.name.endsWith(".ts")
          ? [readFileSync(resolve(path, e.name), "utf8")]
          : [],
    );
  }
  for (const source of visit(resolve("packages/game-core/src")))
    expect(source).not.toMatch(
      /(?:from\s*['"](?:phaser|react|dexie)|\b(?:window|document|localStorage|indexedDB|WebSocket)\b)/,
    );
});
