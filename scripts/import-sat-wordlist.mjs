import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../public/api/wordlists-sat");
const defaultSourcePath = path.join(__dirname, "raw/sat-level1-list1.txt");

const LEVEL_SUBTITLES = {
  1: "预热级",
  2: "基本级",
  3: "提高级",
  4: "全能级",
};

function formatListTitle(level, list) {
  const subtitle = LEVEL_SUBTITLES[level];
  return subtitle
    ? `Level ${level}${subtitle} · List ${list}`
    : `Level ${level} · List ${list}`;
}

const POS_START =
  /^(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|aux\.|abbr\.|modal\b|n\.\/v\.)/;

function isDefinitionLine(line) {
  return POS_START.test(line);
}

function cleanDefinition(line) {
  return line.replace(/\s*[（(]注：[^）)]*[）)]/g, "").trim();
}

function parseListBody(raw) {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const words = [];
  let current = null;

  for (const line of lines) {
    if (isDefinitionLine(line)) {
      if (!current) {
        throw new Error(`Definition without word: ${line}`);
      }
      current.definitions.push(cleanDefinition(line));
      continue;
    }

    if (current) {
      if (!current.definitions.length) {
        throw new Error(`Word without definitions: ${current.word}`);
      }
      words.push(current);
    }
    current = { word: line, definitions: [] };
  }

  if (current) {
    if (!current.definitions.length) {
      throw new Error(`Word without definitions: ${current.word}`);
    }
    words.push(current);
  }

  return words;
}

function parseSource(text) {
  const sections = [];
  const headerRe = /^===\s*LEVEL\s+(\d+)\s+LIST\s+(\d+)\s*===$/im;
  const parts = text.split(headerRe);

  for (let i = 1; i < parts.length; i += 3) {
    const level = Number(parts[i]);
    const list = Number(parts[i + 1]);
    const body = parts[i + 2] || "";
    sections.push({ level, list, words: parseListBody(body) });
  }

  return sections;
}

const sourcePaths = process.argv.slice(2).length
  ? process.argv.slice(2).map((p) => path.resolve(p))
  : [defaultSourcePath];

const sections = sourcePaths.flatMap((sourcePath) => {
  const source = fs.readFileSync(sourcePath, "utf8").replace(/^\uFEFF/, "");
  return parseSource(source);
});

const updatedAt = new Date().toISOString().slice(0, 10);
const manifestPath = path.join(dir, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

for (const { level, list, words } of sections) {
  const id = `level${level}-list${list}`;
  const data = {
    meta: {
      level,
      list,
      title: formatListTitle(level, list),
      updatedAt,
    },
    words,
  };

  fs.writeFileSync(path.join(dir, `${id}.json`), `${JSON.stringify(data, null, 2)}\n`);

  const existing = manifest.lists.find((entry) => entry.id === id);
  if (existing) {
    existing.wordCount = words.length;
    existing.title = data.meta.title;
  } else {
    manifest.lists.push({
      id,
      title: data.meta.title,
      level,
      list,
      wordCount: words.length,
    });
  }

  console.log(`Created ${id}.json with ${words.length} words`);
}

manifest.updatedAt = updatedAt;
manifest.lists.sort((a, b) => a.level - b.level || a.list - b.list);
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log("Updated manifest.json");
