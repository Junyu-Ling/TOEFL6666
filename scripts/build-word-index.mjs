import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wordlistsDir = path.join(__dirname, "../public/api/wordlists");
const manifest = JSON.parse(fs.readFileSync(path.join(wordlistsDir, "manifest.json"), "utf8"));

const index = {};
let total = 0;

for (const list of manifest.lists) {
  const filePath = path.join(wordlistsDir, `${list.id}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  for (const entry of data.words) {
    const key = entry.word.toLowerCase();
    if (!index[key]) {
      index[key] = list.id;
      total += 1;
    }
  }
}

const output = {
  version: 1,
  updatedAt: manifest.updatedAt,
  count: total,
  index,
};

fs.writeFileSync(path.join(wordlistsDir, "word-index.json"), JSON.stringify(output));

console.log(`Word index built: ${total} unique words`);
