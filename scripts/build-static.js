import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

const filesToCopy = [
  "index.html",
  "manifest.webmanifest",
  "icon.svg",
  "sw.js",
  "version.json"
];

const directoriesToCopy = ["public", "src"];

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

for (const file of filesToCopy) {
  await cp(path.join(rootDir, file), path.join(distDir, file));
}

for (const directory of directoriesToCopy) {
  await cp(path.join(rootDir, directory), path.join(distDir, directory), { recursive: true });
}

const packageJson = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8"));
const appVersion = {
  name: packageJson.name,
  version: packageJson.version,
  build: process.env.APP_BUILD_NUMBER || "local",
  revision: process.env.APP_GIT_SHA || "local",
  branch: process.env.APP_BRANCH || "local",
  builtAt: process.env.APP_BUILT_AT || new Date().toISOString()
};

await writeFile(
  path.join(distDir, "version.json"),
  `${JSON.stringify(appVersion, null, 2)}\n`
);

console.log(`Built static app into ${distDir}`);
