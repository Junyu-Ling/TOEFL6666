import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function buildWordIndex(dir) {
  const manifestPath = path.join(dir, "manifest.json");
  if (!fs.existsSync(manifestPath)) return;

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const index = {};
  let total = 0;

  for (const list of manifest.lists ?? []) {
    const filePath = path.join(dir, `${list.id}.json`);
    if (!fs.existsSync(filePath)) continue;
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    for (const entry of data.words ?? []) {
      const key = entry.word.toLowerCase();
      if (!index[key]) {
        index[key] = list.id;
        total += 1;
      }
    }
  }

  const output = {
    version: manifest.version,
    updatedAt: manifest.updatedAt,
    count: total,
    index,
  };

  fs.writeFileSync(path.join(dir, "word-index.json"), JSON.stringify(output));
  console.log(`Word index built: ${total} unique words (${path.basename(dir)})`);
}

const dataRoot = path.join(__dirname, "../data");
buildWordIndex(path.join(dataRoot, "wordlists"));
buildWordIndex(path.join(dataRoot, "wordlists-sat"));
