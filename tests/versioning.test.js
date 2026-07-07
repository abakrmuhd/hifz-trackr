import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const buildScript = readFileSync(new URL("../scripts/build-static.js", import.meta.url), "utf8");
const offlineAssetsSource = readFileSync(new URL("../src/data/offline-assets.js", import.meta.url), "utf8");
const serviceWorkerSource = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
const packageJson = readFileSync(new URL("../package.json", import.meta.url), "utf8");
const versionJson = JSON.parse(readFileSync(new URL("../version.json", import.meta.url), "utf8"));
const workflowSource = readFileSync(new URL("../.github/workflows/versioned-build.yml", import.meta.url), "utf8");

function readCssBlock(selector) {
  const start = stylesSource.indexOf(`${selector} {`);
  if (start === -1) return "";
  const end = stylesSource.indexOf("\n}", start);
  return end === -1 ? "" : stylesSource.slice(start, end + 2);
}

test("settings displays the current app version from version metadata", () => {
  const appVersionStyles = readCssBlock(".app-version");
  assert.match(appSource, /const DEFAULT_APP_VERSION = \{[\s\S]*version:\s*"0\.1\.0"[\s\S]*build:\s*"local"/);
  assert.match(appSource, /async function loadAppVersion\(\)/);
  assert.match(appSource, /fetch\("\/version\.json",\s*\{\s*cache:\s*"no-store"\s*\}\)/);
  assert.match(appSource, /appVersion = loadedAppVersion/);
  assert.match(appSource, /function renderAppVersionBadge\(\)/);
  assert.match(appSource, /<span class="settings-title"><strong data-dev-mode-trigger>Settings<\/strong>\$\{renderAppVersionBadge\(\)\}<\/span>/);
  assert.match(stylesSource, /\.settings-title\s*\{[\s\S]*display:\s*grid[\s\S]*gap:\s*2px/);
  assert.match(appVersionStyles, /display:\s*block/);
  assert.match(appVersionStyles, /font-size:\s*\.64rem/);
  assert.doesNotMatch(appVersionStyles, /border-radius:\s*999px/);
});

test("builds stamp version metadata for main branch runs", () => {
  assert.equal(versionJson.name, "hifz-trackr");
  assert.equal(versionJson.version, "0.1.2");
  assert.equal(versionJson.build, "local");
  assert.match(buildScript, /APP_BUILD_NUMBER/);
  assert.match(buildScript, /APP_GIT_SHA/);
  assert.match(buildScript, /writeFile\(\s*path\.join\(distDir,\s*"version\.json"\)/);
  assert.match(packageJson, /node --check scripts\/build-static\.js/);
  assert.match(workflowSource, /on:\s*[\s\S]*push:\s*[\s\S]*branches:\s*[\s\S]*-\s*main/);
  assert.match(workflowSource, /APP_BUILD_NUMBER:\s*\$\{\{\s*github\.run_number\s*\}\}/);
  assert.match(workflowSource, /APP_GIT_SHA:\s*\$\{\{\s*github\.sha\s*\}\}/);
  assert.match(workflowSource, /npm run build/);
  assert.match(workflowSource, /actions\/upload-artifact@v4/);
});

test("offline shell includes version metadata and refreshes it first", () => {
  assert.match(offlineAssetsSource, /"\/version\.json"/);
  assert.match(serviceWorkerSource, /url\.pathname === "\/version\.json"/);
});
