// Kiểm tra sức khoẻ dự án bằng một lệnh: môi trường, git, các cổng kiểm tra
// đang dùng trong repo, và ràng buộc "three chỉ nằm ở chunk nạp lười".
//
//   pnpm healthcheck            # chuẩn: typecheck, lint, test, validate:content, validate:assets
//   pnpm healthcheck --fast     # chỉ typecheck + lint (khi đang sửa dở)
//   pnpm healthcheck --full     # thêm build + test:e2e
//   pnpm healthcheck --runtime  # thêm kiểm chứng headless 3D + 2D (cần Playwright chromium)
//   node scripts/healthcheck.mjs --json
//
// Mã thoát: 0 = mọi bước đạt, 1 = có bước hỏng.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const root = process.cwd();
const argv = new Set(process.argv.slice(2));

if (argv.has("--help") || argv.has("-h")) {
  console.log(
    [
      "Cách dùng: node scripts/healthcheck.mjs [--fast|--full] [--runtime] [--json]",
      "",
      "  --fast     chỉ typecheck + lint",
      "  --full     thêm build + test:e2e",
      "  --runtime  thêm verify headless 3D và 2D (Playwright chromium)",
      "  --json     in JSON thay vì bảng",
    ].join("\n"),
  );
  process.exit(0);
}

const mode = argv.has("--fast")
  ? "fast"
  : argv.has("--full")
    ? "full"
    : "standard";
const asJson = argv.has("--json");
const withRuntime = argv.has("--runtime");

/** Bỏ mã màu ANSI để dòng tóm tắt đọc được trong log/CI. */
const plain = (text) => text.replace(/\u001b\[[0-9;]*m/g, "");

/**
 * Dòng tóm tắt của một bước: bỏ nhiễu của pnpm (echo lệnh, cảnh báo node, JSON
 * một dòng của validate:assets), ưu tiên dòng kết quả test, cắt cho vừa một dòng.
 */
function summaryLine(output) {
  const noise = /^(>|ELIFECYCLE|npm (ERR|WARN)|\(Use `node|\{)/;
  const lines = plain(output)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !noise.test(line));
  const result = lines.find((line) =>
    /Tests?\s+\d+\s+(passed|failed)/i.test(line),
  );
  const picked = result ?? lines.at(-1) ?? "";
  return picked.length > 118 ? `${picked.slice(0, 115)}...` : picked;
}

const steps = [];
const add = (name, script, options = {}) =>
  steps.push({ name, args: ["run", script], ...options });

add("typecheck", "typecheck");
add("lint", "lint");
if (mode !== "fast") {
  add("test", "test");
  add("validate:content", "validate:content");
  add("validate:assets", "validate:assets");
}
if (mode === "full") {
  add("build", "build");
  add("test:e2e", "test:e2e", { timeout: 1_800_000 });
}
if (withRuntime) {
  steps.push({
    name: "runtime 3D",
    command: process.execPath,
    args: ["scripts/verify-renderer-3d.mjs"],
    env: { MODE: "3d" },
    report: "artifacts/renderer-3d/3d/report.json",
    timeout: 900_000,
  });
  steps.push({
    name: "runtime 2D",
    command: process.execPath,
    args: ["scripts/verify-renderer-3d.mjs"],
    env: { MODE: "2d" },
    report: "artifacts/renderer-3d/2d/report.json",
    timeout: 900_000,
  });
}

/** Chạy một bước và trả về kết quả có thời gian + dòng tóm tắt. */
function runStep(step) {
  const started = Date.now();
  const command = step.command ?? "pnpm";
  const args = step.args ?? [];
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...(step.env ?? {}) },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: step.timeout ?? 900_000,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  return {
    name: step.name,
    command: [command === process.execPath ? "node" : command, ...args].join(
      " ",
    ),
    ok: result.status === 0,
    status: result.status,
    signal: result.signal ?? null,
    ms: Date.now() - started,
    summary: summaryLine(output),
    output,
    report: step.report,
  };
}

const readJson = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));
const pkg = readJson("package.json");
const webPkg = readJson("apps/web/package.json");
const git = (...args) => {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
};
const environment = {
  node: process.version,
  pnpm: pkg.packageManager ?? "(không khai báo)",
  platform: `${process.platform} ${process.arch}`,
  branch: git("rev-parse", "--abbrev-ref", "HEAD") || "(không phải git)",
  head: git("rev-parse", "--short", "HEAD"),
  dirty: git("status", "--porcelain").split("\n").filter(Boolean).length,
  three: webPkg.dependencies?.three ?? "(chưa cài)",
};

/**
 * Đọc bundle đã build: kích thước thật + gzip, và kiểm tra three KHÔNG nằm
 * trong bundle chính (ràng buộc "nạp lười" của bộ hiển thị 3D).
 */
function inspectBundle() {
  const dist = join(root, "apps/web/dist/assets");
  if (!existsSync(dist)) return { listed: [], checks: [], built_at: null };
  const newest = (prefix) =>
    readdirSync(dist)
      .filter((file) => file.startsWith(prefix) && file.endsWith(".js"))
      .sort(
        (a, b) =>
          statSync(join(dist, b)).mtimeMs - statSync(join(dist, a)).mtimeMs,
      )[0];
  const listed = [];
  for (const [label, prefix] of [
    ["bundle chính", "index-"],
    ["three (nạp lười)", "ThreeWorld-"],
    ["phaser", "phaser-"],
    ["bootstrap", "bootstrap-"],
  ]) {
    const file = newest(prefix);
    if (!file) continue;
    const bytes = readFileSync(join(dist, file));
    listed.push({
      label,
      file,
      bytes: bytes.length,
      gzip: gzipSync(bytes).length,
      content: bytes.toString("utf8"),
    });
  }
  const main = listed.find((item) => item.label === "bundle chính");
  const three = listed.find((item) => item.label === "three (nạp lười)");
  const checks = [
    {
      name: "three chỉ nằm ở chunk riêng",
      ok:
        Boolean(three) &&
        Boolean(main) &&
        !main.content.includes("WebGLRenderer"),
      detail: three
        ? `${three.file}; bundle chính ${main?.content.includes("WebGLRenderer") ? "CÓ" : "không có"} three`
        : "không tìm thấy chunk ThreeWorld-*.js trong dist",
    },
  ];
  const builtAt = new Date(
    Math.max(...listed.map((item) => statSync(join(dist, item.file)).mtimeMs)),
  )
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
  return {
    listed: listed.map((item) => ({
      label: item.label,
      file: item.file,
      bytes: item.bytes,
      gzip: item.gzip,
    })),
    checks,
    built_at: listed.length ? builtAt : null,
  };
}

/** Số đo runtime đọc từ report.json của script verify (chỉ khi --runtime). */
function runtimeReport(path) {
  if (!path || !existsSync(join(root, path))) return null;
  try {
    const report = readJson(path);
    return {
      mode: report.mode,
      mobile: report.mobile,
      errors: report.errors?.length ?? 0,
      fps: report.steps?.village?.fps ?? null,
      renderMs: report.steps?.village?.renderMs ?? null,
      renderer: report.steps?.village?.renderer ?? null,
      textures: report.steps?.village?.textures ?? null,
      calls: report.steps?.drawCalls?.calls ?? null,
      triangles: report.steps?.drawCalls?.triangles ?? null,
    };
  } catch {
    return null;
  }
}
const seconds = (ms) => `${(ms / 1000).toFixed(1)}s`;
/** Dùng đơn vị 1000-based để khớp output của Vite/rollup. */
const kb = (bytes) => `${(bytes / 1000).toFixed(2)} kB`;

const startedAll = Date.now();
const results = [];
for (const step of steps) {
  if (!asJson)
    console.log(
      `  [ .. ] ${step.name} — ${step.command ?? "pnpm"} ${step.args.join(" ")}`,
    );
  const result = runStep(step);
  results.push(result);
  if (!asJson) {
    const detail = result.ok
      ? result.summary
        ? `  ${result.summary}`
        : ""
      : `  (mã ${result.status ?? result.signal})`;
    console.log(
      `  [${result.ok ? "ĐẠT" : "HỎNG"}] ${seconds(result.ms).padStart(7)}  ${result.name}${detail}`,
    );
    if (!result.ok) {
      const tail = plain(result.output)
        .split("\n")
        .filter((line) => line.trim())
        .slice(-25);
      for (const line of tail) console.log(`         | ${line.trim()}`);
    }
  }
}

const bundle = inspectBundle();
const runtimes = withRuntime
  ? steps
      .filter((step) => step.report)
      .map((step) => runtimeReport(step.report))
  : [];
const failed = results.filter((result) => !result.ok);
const bundleFailed = bundle.checks.filter((check) => !check.ok);
const ok = failed.length === 0 && bundleFailed.length === 0;
const totalMs = Date.now() - startedAll;
const payload = {
  ok,
  mode,
  runtime: withRuntime,
  environment,
  steps: results.map((result) => ({
    name: result.name,
    command: result.command,
    ok: result.ok,
    status: result.status,
    signal: result.signal,
    ms: result.ms,
    summary: result.summary,
  })),
  bundle,
  runtimes,
  totalMs,
};

if (asJson) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log("");
  console.log("=== MÔI TRƯỜNG ===");
  console.log(`Node       : ${environment.node}   pnpm: ${environment.pnpm}`);
  console.log(`Nền tảng   : ${environment.platform}`);
  console.log(
    `Git        : ${environment.branch} @ ${environment.head || "?"} — ${environment.dirty} file thay đổi chưa commit`,
  );
  console.log(`three      : ${environment.three} (apps/web)`);

  if (bundle.listed.length) {
    console.log("");
    console.log(`=== BUNDLE (apps/web/dist, build ${bundle.built_at}) ===`);
    for (const item of bundle.listed)
      console.log(
        `  ${item.label.padEnd(18)} ${kb(item.bytes).padStart(11)}  gzip ${kb(item.gzip).padStart(10)}  ${item.file}`,
      );
    for (const check of bundle.checks)
      console.log(
        `  [${check.ok ? "ĐẠT" : "HỎNG"}] ${check.name} — ${check.detail}`,
      );
  } else {
    console.log("");
    console.log(
      "=== BUNDLE === chưa có apps/web/dist (chạy `pnpm build` hoặc `pnpm healthcheck --full`)",
    );
  }

  if (withRuntime) {
    console.log("");
    console.log("=== RUNTIME (headless Chromium + SwiftShader) ===");
    for (const item of runtimes) {
      if (!item) {
        console.log("  (không đọc được report.json)");
        continue;
      }
      console.log(
        `  ${String(item.mode).toUpperCase()}${item.mobile ? " mobile" : ""}: renderer ${item.renderer}, ${item.fps} FPS, renderMs ${item.renderMs}, textures ${item.textures}, draw calls ${item.calls ?? "n/a"}, triangle ${item.triangles ?? "n/a"}, lỗi trang ${item.errors}`,
      );
    }
  }

  console.log("");
  console.log(
    `=== TỔNG KẾT: ${results.length - failed.length}/${results.length} bước đạt, ` +
      `${bundle.checks.length - bundleFailed.length}/${bundle.checks.length} kiểm tra bundle đạt ` +
      `(${seconds(totalMs)}) — ${ok ? "KHOẺ" : "CÓ VẤN ĐỀ"} ===`,
  );
}

process.exit(ok ? 0 : 1);
