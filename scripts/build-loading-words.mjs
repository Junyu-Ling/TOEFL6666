import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const listDir = path.join(root, "public/api/wordlists");
const outFile = path.join(root, "src/data/loadingWords.json");

function extractMeaning(definition) {
  const text = String(definition || "").trim();
  const withoutPos = text.replace(/^[a-zA-Z./]+\.\s*/, "").trim();
  return withoutPos || text;
}

const seen = new Set();
const words = [];

for (const file of fs.readdirSync(listDir)) {
  if (!file.endsWith(".json") || file === "manifest.json" || file === "word-index.json") {
    continue;
  }
  const data = JSON.parse(fs.readFileSync(path.join(listDir, file), "utf8"));
  for (const item of data.words || []) {
    const key = item.word.toLowerCase();
    if (seen.has(key)) continue;
    const definitions = Array.isArray(item.definitions) ? item.definitions : [];
    if (!definitions.length) continue;
    const meaning = extractMeaning(definitions[0]);
    if (!meaning) continue;
    seen.add(key);
    words.push({ word: item.word, meaning });
  }
}

fs.writeFileSync(outFile, JSON.stringify({ words }));

console.log(`Loading words built: ${words.length} entries`);
