import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pickPhoneticFromApiPayload } from "../src/utils/phoneticFormat.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const listDir = path.join(root, "public/api/wordlists");
const outFile = path.join(root, "src/data/phonetics.json");
const API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en";

const CONCURRENCY = 12;
const RETRY_DELAY_MS = 800;

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPhonetic(word, attempt = 0) {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(word)}`);
  if (res.status === 429 && attempt < 4) {
    await sleep(RETRY_DELAY_MS * (attempt + 1));
    return fetchPhonetic(word, attempt + 1);
  }
  if (!res.ok) return "";
  const data = await res.json().catch(() => []);
  return pickPhoneticFromApiPayload(data);
}

async function mapPool(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;

  async function runWorker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current], current);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runWorker));
  return results;
}

const wordList = [...words.values()];
console.log(`Fetching phonetics for ${wordList.length} words…`);

const phonetics = {};
let found = 0;
let missing = 0;

await mapPool(wordList, CONCURRENCY, async (word, i) => {
  const ipa = await fetchPhonetic(word);
  phonetics[word.toLowerCase()] = ipa;
  if (ipa) found += 1;
  else missing += 1;
  if ((i + 1) % 100 === 0 || i + 1 === wordList.length) {
    console.log(`  ${i + 1}/${wordList.length} (${found} found, ${missing} missing)`);
  }
});

const payload = {
  generatedAt: new Date().toISOString().slice(0, 10),
  totalWords: wordList.length,
  count: found,
  phonetics,
};

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Saved ${found}/${wordList.length} phonetics to ${path.relative(root, outFile)}`);
