import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { normalizeIpa } from "../src/utils/phoneticFormat.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outFile = path.join(root, "src/data/phonetics.json");
const IPA_DICT = {
  us: "https://raw.githubusercontent.com/open-dict-data/ipa-dict/master/data/en_US.txt",
  uk: "https://raw.githubusercontent.com/open-dict-data/ipa-dict/master/data/en_UK.txt",
};
const WIKTIONARY =
  "https://en.wiktionary.org/w/api.php?action=parse&prop=wikitext&formatversion=2&format=json&redirects=1";
const USER_AGENT = "TOEFL6666/1.0 (educational vocabulary IPA build)";

const RETRY_DELAY_MS = 800;
const MAX_ATTEMPTS = 5;
const SKIP_FILES = new Set(["manifest.json", "word-index.json", "word-bank.json"]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function collectWords() {
  const words = new Map();
  for (const dir of ["public/api/wordlists", "public/api/wordlists-sat"]) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) continue;
    for (const file of fs.readdirSync(abs)) {
      if (!file.endsWith(".json") || SKIP_FILES.has(file)) continue;
      const data = JSON.parse(fs.readFileSync(path.join(abs, file), "utf8"));
      for (const item of data.words || []) {
        const key = String(item.word || "").toLowerCase().trim();
        if (!key) continue;
        if (!words.has(key)) words.set(key, String(item.word).trim());
      }
    }
  }
  return words;
}

function parseIpaDict(text) {
  const map = new Map();
  for (const line of String(text || "").split(/\n/)) {
    const match = line.match(/^(.+?)\t+(.+)$/) || line.match(/^(\S+)\s+(\/.+)$/);
    if (!match) continue;
    const word = match[1].trim().toLowerCase();
    const rest = match[2].trim();
    const first = rest.split(/,\s*(?=\/)/)[0]?.trim();
    if (!word || !first || map.has(word)) continue;
    map.set(word, normalizeIpa(first));
  }
  return map;
}

function lookupDict(map, word) {
  const key = String(word || "").toLowerCase();
  if (map.has(key)) return map.get(key);
  const stripped = key.replace(/-/g, "");
  if (stripped !== key && map.has(stripped)) return map.get(stripped);
  return "";
}

function emptyPair() {
  return { us: "", uk: "" };
}

function readExisting() {
  if (!fs.existsSync(outFile)) return {};
  const data = JSON.parse(fs.readFileSync(outFile, "utf8"));
  const raw = data.phonetics || {};
  const out = {};
  for (const [word, value] of Object.entries(raw)) {
    if (value && typeof value === "object") {
      out[word] = { us: value.us || "", uk: value.uk || "" };
    } else if (typeof value === "string" && value) {
      out[word] = { us: value, uk: "" };
    } else {
      out[word] = emptyPair();
    }
  }
  return out;
}

async function fetchJson(url, { attempt = 0, headers = {} } = {}) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, ...headers } });
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_ATTEMPTS) {
      await sleep(RETRY_DELAY_MS * (attempt + 1));
      return fetchJson(url, { attempt: attempt + 1, headers });
    }
    if (!res.ok) return null;
    return res.json().catch(() => null);
  } catch {
    if (attempt < MAX_ATTEMPTS) {
      await sleep(RETRY_DELAY_MS * (attempt + 1));
      return fetchJson(url, { attempt: attempt + 1, headers });
    }
    return null;
  }
}

async function fetchText(url, attempt = 0) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) throw new Error(`下载失败 ${url} (${res.status})`);
    return res.text();
  } catch (err) {
    if (attempt < MAX_ATTEMPTS) {
      await sleep(RETRY_DELAY_MS * (attempt + 1));
      return fetchText(url, attempt + 1);
    }
    throw err;
  }
}

async function loadIpaDict(kind, url) {
  const cacheFile = path.join(__dirname, `_ipa-en_${kind.toUpperCase()}.txt`);
  if (fs.existsSync(cacheFile) && fs.statSync(cacheFile).size > 1000) {
    return fs.readFileSync(cacheFile, "utf8");
  }
  const text = await fetchText(url);
  fs.writeFileSync(cacheFile, text);
  return text;
}

function pickFromWikitext(wikitext) {
  const english = String(wikitext || "").split(/==\s*English\s*==/i)[1] || String(wikitext || "");
  const section = english.split(/^==[^=]/m)[0] || english;
  let us = "";
  let uk = "";

  for (const match of section.matchAll(/\{\{IPA\|en\|([^}]+)\}\}/gi)) {
    const parts = match[1].split("|").map((part) => part.trim());
    const ipas = parts.filter((part) => part.startsWith("/") && part.endsWith("/"));
    const accent = (parts.find((part) => part.startsWith("a=")) || "").slice(2).toLowerCase();
    const first = ipas[0] || "";
    if (!first) continue;
    if (/rp|gb|uk|received/.test(accent) && !uk) uk = first;
    else if (/ga|us|genam|general american/.test(accent) && !us) us = first;
  }

  for (const line of section.split("\n")) {
    if (!/\{\{IPA\|en\|/i.test(line)) continue;
    const labels = [...line.matchAll(/\{\{a\|([^}]+)\}\}/gi)]
      .map((match) => match[1].toLowerCase())
      .join(" ");
    const ipa = line.match(/\{\{IPA\|en\|(\/[^}|]+\/)/i)?.[1];
    if (!ipa) continue;
    if (/rp|received pronunciation|\buk\b|\bgb\b/.test(labels) && !uk) uk = ipa;
    if (/ga|genam|general american|\bus\b/.test(labels) && !us) us = ipa;
  }

  return { us: normalizeIpa(us), uk: normalizeIpa(uk) };
}

async function fetchWiktionaryPair(word) {
  const data = await fetchJson(`${WIKTIONARY}&page=${encodeURIComponent(word)}`);
  const wikitext = data?.parse?.wikitext;
  if (!wikitext) return emptyPair();
  return pickFromWikitext(wikitext);
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

function mergePair(base, extra) {
  return {
    us: base.us || extra.us || "",
    uk: base.uk || extra.uk || "",
  };
}

function needsFill(pair) {
  return !pair.us || !pair.uk;
}

function savePayload(wordList, phonetics) {
  const countUs = wordList.filter((word) => phonetics[word.toLowerCase()].us).length;
  const countUk = wordList.filter((word) => phonetics[word.toLowerCase()].uk).length;
  const countBoth = wordList.filter((word) => {
    const pair = phonetics[word.toLowerCase()];
    return pair.us && pair.uk;
  }).length;
  const payload = {
    generatedAt: new Date().toISOString().slice(0, 10),
    totalWords: wordList.length,
    count: countBoth,
    countUs,
    countUk,
    phonetics: Object.fromEntries(wordList.map((word) => [word.toLowerCase(), phonetics[word.toLowerCase()]])),
  };
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`);
  return { countUs, countUk, countBoth };
}

const words = collectWords();
const wordList = [...words.values()].sort((a, b) => a.localeCompare(b, "en"));
const existing = readExisting();
const phonetics = {};

console.log(`Collecting IPA for ${wordList.length} words…`);
console.log("Downloading Wiktionary IPA dictionaries (US / UK)…");

const [usText, ukText] = await Promise.all([loadIpaDict("US", IPA_DICT.us), loadIpaDict("UK", IPA_DICT.uk)]);
const usDict = parseIpaDict(usText);
const ukDict = parseIpaDict(ukText);
console.log(`Loaded IPA-dict entries: US ${usDict.size}, UK ${ukDict.size}`);

let fromDict = 0;
for (const word of wordList) {
  const key = word.toLowerCase();
  const pair = {
    us: lookupDict(usDict, key),
    uk: lookupDict(ukDict, key),
  };
  const fallback = existing[key] || emptyPair();
  phonetics[key] = mergePair(pair, fallback);
  if (phonetics[key].us && phonetics[key].uk) fromDict += 1;
}

console.log(`IPA-dict filled both dialects for ${fromDict}/${wordList.length}`);
savePayload(wordList, phonetics);

const missingAfterDict = wordList.filter((word) => needsFill(phonetics[word.toLowerCase()]));
if (missingAfterDict.length) {
  console.log(`Fetching Wiktionary for ${missingAfterDict.length} incomplete words…`);
  await mapPool(missingAfterDict, 2, async (word, i) => {
    const key = word.toLowerCase();
    try {
      const extra = await fetchWiktionaryPair(word);
      phonetics[key] = mergePair(phonetics[key], extra);
    } catch (err) {
      console.warn(`  wiktionary skip ${word}: ${err.message}`);
    }
    if ((i + 1) % 25 === 0 || i + 1 === missingAfterDict.length) {
      savePayload(wordList, phonetics);
      console.log(`  wiktionary ${i + 1}/${missingAfterDict.length}`);
    }
    await sleep(150);
  });
}

const { countUs, countUk, countBoth } = savePayload(wordList, phonetics);
console.log(
  `Saved ${countBoth} both / ${countUs} US / ${countUk} UK of ${wordList.length} to ${path.relative(root, outFile)}`
);
