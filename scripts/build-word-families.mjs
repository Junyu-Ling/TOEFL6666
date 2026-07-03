import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildWordFamilyMap } from "../src/utils/wordFamilies.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const listDir = path.join(root, "public/api/wordlists");
const outFile = path.join(root, "src/data/wordFamilies.json");

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

const wordList = [...words.values()].map((word) => ({ word }));
const familyMap = buildWordFamilyMap(wordList);

const families = [];
const wordToRoot = {};

for (const [root, members] of familyMap.entries()) {
  for (const item of members) {
    wordToRoot[item.word.toLowerCase()] = root;
  }
  if (members.length >= 2) {
    families.push({
      root,
      words: members.map((item) => item.word),
    });
  }
}

families.sort((a, b) => a.root.localeCompare(b.root, "en"));

const payload = {
  generatedAt: new Date().toISOString().slice(0, 10),
  totalWords: wordList.length,
  familyCount: families.length,
  memberCount: families.reduce((sum, item) => sum + item.words.length, 0),
  families,
  wordToRoot,
};

fs.writeFileSync(outFile, JSON.stringify(payload, null, 2));
console.log(
  `word families: ${families.length} groups, ${payload.memberCount} words in families (${wordList.length} total)`
);
