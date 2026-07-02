import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { detectIrregularPronunciation } from "../src/utils/pronunciationRules.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const listDir = path.join(root, "public/api/wordlists");
const outFile = path.join(root, "src/data/irregularPronunciation.json");

const words = new Map();

for (const file of fs.readdirSync(listDir)) {
  if (!file.endsWith(".json") || file === "manifest.json" || file === "word-index.json") {
    continue;
  }
  const data = JSON.parse(fs.readFileSync(path.join(listDir, file), "utf8"));
  for (const item of data.words || []) {
    const key = item.word.toLowerCase();
    if (!words.has(key)) words.set(key, item.word);
  }
}

const entries = [];

for (const [normalized, display] of words) {
  const result = detectIrregularPronunciation(normalized);
  if (result) {
    entries.push({
      word: display,
      message: result.message,
      category: result.category,
    });
  }
}

entries.sort((a, b) => a.word.localeCompare(b.word, "en"));

const payload = {
  generatedAt: new Date().toISOString().slice(0, 10),
  totalWords: words.size,
  count: entries.length,
  entries,
};

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`);

console.log(`Scanned ${words.size} words, found ${entries.length} irregular pronunciation entries.`);
