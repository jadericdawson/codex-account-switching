import { mkdir, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = process.env.CODEX_TARGET_TRIPLE || detectTarget();
const packageJson = JSON.parse(await readText(path.join(root, "package.json")));
const tag = process.env.CODEX_RELEASE_TAG || `v${packageJson.version}`;
const archiveName = `codex-${target}.tar.gz`;
const url = `https://github.com/jadericdawson/codex-account-switching/releases/download/${tag}/${archiveName}`;
const vendorRoot = path.join(root, "npm", "vendor");
const targetRoot = path.join(vendorRoot, target);
const archivePath = path.join(vendorRoot, archiveName);

console.log(`Downloading Codex ${tag} for ${target}...`);
await mkdir(vendorRoot, { recursive: true });
await writeFile(archivePath, Buffer.from(await fetchBytes(url)));
await rm(targetRoot, { recursive: true, force: true });
await mkdir(targetRoot, { recursive: true });

await run("tar", ["-xzf", archivePath, "-C", targetRoot]);
await rm(archivePath, { force: true });
console.log(`Codex installed for ${target}.`);

async function fetchBytes(resource) {
  const response = await fetch(resource, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${resource}`);
  }
  return response.arrayBuffer();
}

async function readText(file) {
  const { readFile } = await import("node:fs/promises");
  return readFile(file, "utf8");
}

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
