import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { healthz } from "./healthz-plugin";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";
import { readFileSync } from "node:fs";

/**
 * Phiên bản + ngày build được chèn vào bundle tại thời điểm build.
 * Nguồn duy nhất cho số phiên bản là `version` trong package.json gốc; mọi chỗ
 * hiển thị đọc qua `apps/web/src/app/version.ts`.
 */
const appVersion = (
  JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
  ) as { version?: string }
).version;
const buildNow = new Date();
const appBuildDate = `${String(buildNow.getDate()).padStart(2, "0")}/${String(
  buildNow.getMonth() + 1,
).padStart(2, "0")}/${buildNow.getFullYear()}`;
/**
 * Host được phép truy cập dev/preview server khi mở từ LAN hoặc domain ngoài.
 * Vite mặc định chặn Host lạ (chống DNS rebinding), nên phải khai báo tường minh.
 * Thêm host mới vào đây khi đổi domain/tunnel; dấu chấm đầu cho phép mọi subdomain.
 */
const allowedHosts = [
  "vltk.quanhd.net",
  ".quanhd.net",
  "ykglermamlhv6harvybrgtnr.138.2.81.196.sslip.io",
  ".sslip.io",
];
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  // Phiên bản/ngày build: nguồn duy nhất là package.json gốc (xem version.ts).
  define: {
    __APP_VERSION__: JSON.stringify(appVersion ?? "0.0.0"),
    __APP_BUILD_DATE__: JSON.stringify(appBuildDate),
  },
  plugins: [
    react(),
    healthz(),
    tailwind(),
    VitePWA({
      registerType: "prompt",
      manifest: {
        name: "Kiếm Hiệp Web — Giang Hồ Ký",
        short_name: "Kiếm Hiệp",
        description: "Hành trình võ hiệp offline của riêng bạn.",
        theme_color: "#101c19",
        background_color: "#101c19",
        display: "standalone",
        orientation: "landscape", // Installed mobile PWA always opens horizontally.
        icons: [
          {
            src: "/assets/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        clientsClaim: true,
        dontCacheBustURLsMatching: /-[\w-]{8,}\.(?:js|css)$/,
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,svg,woff2,png,wav}"],
        // Sprite quái + nhân vật (~24MB + ~30MB) tải lazy theo khung đang hiển
        // thị: cache lúc dùng thay vì nhét hết vào precache của bước install.
        globIgnores: ["assets/monsters/**", "assets/actors/**"],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/(monsters|actors)\/.*\.png$/,
            handler: "CacheFirst",
            options: {
              cacheName: "actor-sprites",
              expiration: { maxEntries: 1600, purgeOnQuotaError: true },
            },
          },
        ],
        navigateFallback: "index.html",
      },
    }),
  ],
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
          new URL("../../packages/" + n + "/src/index.ts", import.meta.url),
        ),
      ]),
    ),
  },
  server: { port: 5173, allowedHosts },
  preview: { allowedHosts },
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
    rollupOptions: { output: { manualChunks: { phaser: ["phaser"] } } },
  },
});
