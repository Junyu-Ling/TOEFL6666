import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../public/api/wordlists");
const sourcePath = path.join(__dirname, "raw/level1-level2.txt");

const POS_START =
  /^(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|aux\.|abbr\.)/;

function isDefinitionLine(line) {
  return POS_START.test(line);
}

function parseListBody(raw) {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const words = [];
  let current = null;

  for (const line of lines) {
    if (isDefinitionLine(line)) {
      if (!current) {
        throw new Error(`Definition without word: ${line}`);
      }
      current.definitions.push(line);
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

  // parts: [preamble, level, list, body, level, list, body, ...]
  for (let i = 1; i < parts.length; i += 3) {
    const level = Number(parts[i]);
    const list = Number(parts[i + 1]);
    const body = parts[i + 2] || "";
    sections.push({ level, list, words: parseListBody(body) });
  }

  return sections;
}

const source = fs.readFileSync(sourcePath, "utf8");
const sections = parseSource(source);
const updatedAt = new Date().toISOString().slice(0, 10);
const manifestPath = path.join(dir, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

for (const { level, list, words } of sections) {
  const id = `level${level}-list${list}`;
  const data = {
    meta: {
      level,
      list,
      title: `Level ${level} · List ${list}`,
      updatedAt,
    },
    words,
  };

  fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(data, null, 2));

  manifest.lists = manifest.lists.filter((l) => l.id !== id);
  manifest.lists.push({
    id,
    title: data.meta.title,
    level,
    list,
    wordCount: words.length,
  });

  console.log(`Created ${id}.json with ${words.length} words`);
}

manifest.updatedAt = updatedAt;
manifest.lists.sort((a, b) => a.level - b.level || a.list - b.list);
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log("Updated manifest.json");
