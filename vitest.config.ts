import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["tests/integration/**/*.test.ts"] },
  // Cùng alias với `apps/web/vite.config.ts` để test import được module tầng web
  // (`apps/web/src/...`) mà không cần bundle.
  resolve: {
    alias: Object.fromEntries(
      [
        "game-core",
        "game-content",
        "game-session",
        "game-storage",
        "game-protocol",
      ].map((n) => [
        "@kiem-hiep/" + n,
        fileURLToPath(
          new URL("./packages/" + n + "/src/index.ts", import.meta.url),
        ),
      ]),
    ),
  },
});
