import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const publicRoot = path.join(root, "public");

const MODES = [
  { name: "toefl", src: "api/wordlists", dest: "wordlists", generated: "toefl" },
  { name: "sat", src: "api/wordlists-sat", dest: "wordlists-sat", generated: "sat" },
];

const META_FILES = ["manifest.json", "word-index.json", "word-bank.json"];

function copyMetaToGenerated(srcDir, generatedName) {
  const outDir = path.join(root, "src/generated/wordlists", generatedName);
  fs.mkdirSync(outDir, { recursive: true });

  for (const file of META_FILES) {
    const src = path.join(srcDir, file);
    if (!fs.existsSync(src)) continue;
    fs.copyFileSync(src, path.join(outDir, file));
  }
}

function copyListFilesToPublic(srcDir, destDirName) {
  const outDir = path.join(publicRoot, destDirName);
  fs.mkdirSync(outDir, { recursive: true });

  for (const file of fs.readdirSync(srcDir)) {
    if (!file.endsWith(".json")) continue;
    if (META_FILES.includes(file)) continue;
    fs.copyFileSync(path.join(srcDir, file), path.join(outDir, file));
  }
}

for (const mode of MODES) {
  const srcDir = path.join(publicRoot, mode.src);
  if (!fs.existsSync(srcDir)) continue;
  copyMetaToGenerated(srcDir, mode.generated);
  copyListFilesToPublic(srcDir, mode.dest);
  console.log(`Wordlists bundled: ${mode.name}`);
}
