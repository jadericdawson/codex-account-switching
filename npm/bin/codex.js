#!/usr/bin/env node

import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const target = process.env.CODEX_TARGET_TRIPLE || detectTarget();
const executable = path.join(
  root,
  "npm",
  "vendor",
  target,
  "bin",
  process.platform === "win32" ? "codex.exe" : "codex",
);

if (!existsSync(executable)) {
  throw new Error(
    `Codex binary for ${target} is missing. Reinstall with npm or run: node ${path.join(root, "npm", "install.js")}`,
  );
}

const binDir = path.dirname(executable);
const child = spawn(executable, process.argv.slice(2), {
  stdio: "inherit",
  env: {
    ...process.env,
    PATH: `${binDir}${path.delimiter}${process.env.PATH || ""}`,
  },
});

child.on("error", (error) => {
  console.error(`Failed to start Codex: ${error.message}`);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exitCode = code ?? 1;
  }
});

function detectTarget() {
  const targets = {
    "linux-x64": "x86_64-unknown-linux-musl",
    "linux-arm64": "aarch64-unknown-linux-musl",
    "darwin-x64": "x86_64-apple-darwin",
    "darwin-arm64": "aarch64-apple-darwin",
    "win32-x64": "x86_64-pc-windows-msvc",
    "win32-arm64": "aarch64-pc-windows-msvc",
  };
  const target = targets[`${process.platform}-${process.arch}`];
  if (!target) {
    throw new Error(`Unsupported platform: ${process.platform} (${process.arch})`);
  }
  return target;
}
