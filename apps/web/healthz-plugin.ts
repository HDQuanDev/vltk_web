import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

/**
 * Endpoint healthcheck `GET /healthz` cho máy chủ dev và preview của Vite.
 *
 * Repo này là PWA tĩnh (không có backend runtime), nên endpoint được gắn vào
 * chính máy chủ đang phục vụ app thay vì thêm một service mới. Nó chỉ đọc dữ
 * liệu có sẵn (package.json, git, bundle đã build) — không chạy typecheck/test,
 * nên trả lời trong vài ms và dùng được cho uptime monitor.
 *
 *   GET /healthz        JSON trạng thái; 200 khi khoẻ, 503 khi thiếu bundle
 *   GET /healthz?full=1 kèm danh sách chunk và cảnh báo chi tiết
 */
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");
const distAssets = join(here, "dist", "assets");

type BundleSnapshot = {
  available: boolean;
  scannedAt: number;
  mainFile: string | null;
  mainBytes: number | null;
  threeFile: string | null;
  threeBytes: number | null;
  phaserFile: string | null;
  /** `null` khi chưa có bundle để kiểm tra. */
  mainHasThree: boolean | null;
};

type PackageJson = { version?: string; packageManager?: string };

const readJson = <T>(path: string): T | null => {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
};

const git = (...args: string[]): string => {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
};

/** Chunk mới nhất theo tiền tố (tên có hash nên phải chọn theo mtime). */
const newestChunk = (prefix: string): string | null => {
  if (!existsSync(distAssets)) return null;
  const files = readdirSync(distAssets)
    .filter((file) => file.startsWith(prefix) && file.endsWith(".js"))
    .sort(
      (a, b) =>
        statSync(join(distAssets, b)).mtimeMs -
        statSync(join(distAssets, a)).mtimeMs,
    );
  return files[0] ?? null;
};

const sizeOf = (file: string | null): number | null =>
  file ? statSync(join(distAssets, file)).size : null;

/** Quét bundle, cache 5 giây để monitor gọi liên tục cũng không tốn I/O. */
let bundleCache: { at: number; data: BundleSnapshot } | null = null;
const bundleSnapshot = (): BundleSnapshot => {
  if (bundleCache && Date.now() - bundleCache.at < 5000)
    return bundleCache.data;
  const mainFile = newestChunk("index-");
  const threeFile = newestChunk("ThreeWorld-");
  let mainHasThree: boolean | null = null;
  if (mainFile) {
    try {
      mainHasThree = readFileSync(join(distAssets, mainFile), "utf8").includes(
        "WebGLRenderer",
      );
    } catch {
      mainHasThree = null;
    }
  }
  const data: BundleSnapshot = {
    available: existsSync(distAssets),
    scannedAt: Date.now(),
    mainFile,
    mainBytes: sizeOf(mainFile),
    threeFile,
    threeBytes: sizeOf(threeFile),
    phaserFile: newestChunk("phaser-"),
    mainHasThree,
  };
  bundleCache = { at: Date.now(), data };
  return data;
};

const buildPayload = (mode: "dev" | "preview", full: boolean) => {
  const pkg = readJson<PackageJson>(join(repoRoot, "package.json"));
  const webPkg = readJson<{ dependencies?: Record<string, string> }>(
    join(here, "package.json"),
  );
  const bundle = bundleSnapshot();
  const threeSeparate =
    Boolean(bundle.threeFile) && bundle.mainHasThree === false;
  const warnings: string[] = [];
  // Ở chế độ preview, máy chủ phục vụ chính thư mục dist nên thiếu bundle = hỏng.
  if (mode === "preview" && !bundle.available)
    warnings.push(
      "Không thấy apps/web/dist — chạy `pnpm build` trước khi preview.",
    );
  if (bundle.available && !bundle.threeFile)
    warnings.push("Bundle không có chunk ThreeWorld-*.js (bản 3D chưa build).");
  if (bundle.mainHasThree)
    warnings.push("Bundle chính chứa three — ràng buộc nạp lười bị vi phạm.");
  const healthy = mode === "preview" ? bundle.available : true;
  return {
    status: healthy ? "ok" : "unavailable",
    service: "kiem-hiep-web",
    mode,
    version: pkg?.version ?? null,
    packageManager: pkg?.packageManager ?? null,
    three: webPkg?.dependencies?.three ?? null,
    git: {
      branch: git("rev-parse", "--abbrev-ref", "HEAD") || null,
      commit: git("rev-parse", "--short", "HEAD") || null,
    },
    process: {
      node: process.version,
      pid: process.pid,
      uptimeSeconds: Math.round(process.uptime()),
    },
    bundle: {
      available: bundle.available,
      checks: { threeInSeparateChunk: bundle.available ? threeSeparate : null },
      ...(full
        ? {
            main: { file: bundle.mainFile, bytes: bundle.mainBytes },
            three: { file: bundle.threeFile, bytes: bundle.threeBytes },
            phaser: { file: bundle.phaserFile },
            scannedAt: new Date(bundle.scannedAt).toISOString(),
          }
        : {}),
    },
    warnings,
    timestamp: new Date().toISOString(),
  };
};

export function healthz(): Plugin {
  const handler =
    (mode: "dev" | "preview") =>
    (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      const method = req.method ?? "GET";
      if (method !== "GET" && method !== "HEAD") return next();
      const url = new URL(req.url ?? "/", "http://localhost");
      const payload = buildPayload(mode, url.searchParams.get("full") === "1");
      res.statusCode = payload.status === "ok" ? 200 : 503;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.setHeader("cache-control", "no-store");
      res.end(
        method === "HEAD" ? undefined : `${JSON.stringify(payload, null, 2)}\n`,
      );
    };
  return {
    name: "kiem-hiep-healthz",
    configureServer(server) {
      server.middlewares.use("/healthz", handler("dev"));
    },
    configurePreviewServer(server) {
      server.middlewares.use("/healthz", handler("preview"));
    },
  };
}
