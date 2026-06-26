import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const fontDir = path.join(root, "public", "fonts", "qcf4");

const requiredFonts = [
  "QCF4_QBSML.woff2",
  ...Array.from({ length: 47 }, (_, index) => `QCF4_Hafs_${String(index + 1).padStart(2, "0")}_W.woff2`)
];

async function assertFile(file) {
  const stat = await fs.stat(file).catch(() => null);
  if (!stat?.isFile() || stat.size === 0) throw new Error(`Missing required file: ${file}`);
}

for (const font of requiredFonts) {
  await assertFile(path.join(fontDir, font));
}

console.log(`Validated ${requiredFonts.length} QCF4 font files`);
console.log("Next gate: add exact QCF4 Hafs mapping source before running generate:qcf4-pages");
