import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function buildWordBank(dir) {
  const manifestPath = path.join(dir, "manifest.json");
  if (!fs.existsSync(manifestPath)) return;

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const seen = new Set();
  const words = [];

  for (const list of manifest.lists ?? []) {
    const filePath = path.join(dir, `${list.id}.json`);
    if (!fs.existsSync(filePath)) continue;
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    for (let index = 0; index < (data.words ?? []).length; index += 1) {
      const entry = data.words[index];
      const key = entry.word.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      words.push({ ...entry, sourceListId: list.id, listIndex: index });
    }
  }

  const output = {
    version: manifest.version,
    updatedAt: manifest.updatedAt,
    count: words.length,
    words,
  };

  fs.writeFileSync(path.join(dir, "word-bank.json"), JSON.stringify(output));
  console.log(`Word bank built: ${words.length} words (${path.basename(dir)})`);
}

const apiRoot = path.join(__dirname, "../public/api");
buildWordBank(path.join(apiRoot, "wordlists"));
buildWordBank(path.join(apiRoot, "wordlists-sat"));
