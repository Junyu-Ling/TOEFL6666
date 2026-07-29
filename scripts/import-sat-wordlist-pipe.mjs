import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseChineseDefinitions } from "./import-sat-wordlist-xlsx.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../public/api/wordlists-sat");
const rawDir = path.join(__dirname, "raw");

function formatListTitle(level, list) {
  return `Level ${level} · List ${list}`;
}

function normalizeDefinitionText(raw) {
  return String(raw || "")
    .replace(/；/g, ";")
    .replace(/\s+\/\s*(?=(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.))/gi, "; ");
}

function parseDefinitions(raw) {
  return parseChineseDefinitions(normalizeDefinitionText(raw));
}

function parsePipeLine(line) {
  const segments = line.split(/\s*\|\s*/);
  if (segments.length < 3) return null;

  const word = segments[0].trim().toLowerCase();
  const definitions = parseDefinitions(segments.slice(2).join(" | "));
  if (!word || !definitions.length) return null;

  return { word, definitions };
}

function parseDashLine(line) {
  const marker = " — 释: ";
  const idx = line.indexOf(marker);
  if (idx === -1) return null;

  const left = line.slice(0, idx).trim();
  const definitions = parseDefinitions(line.slice(idx + marker.length).trim());
  const word = left.replace(/\s+\/[^/]*\/\s*$/, "").trim().toLowerCase();

  if (!word || !definitions.length) return null;
  return { word, definitions };
}

export function parseSatWordlistText(text) {
  let currentLevel = 1;
  let currentList = null;
  const sectionMap = new Map();

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const levelMatch = line.match(/^Level\s+(\d+)\s*$/i);
    if (levelMatch) {
      currentLevel = Number(levelMatch[1]);
      continue;
    }

    const listMatch = line.match(/^Word List\s+(\d+)\s*$/i);
    if (listMatch) {
      currentList = Number(listMatch[1]);
      continue;
    }

    if (currentList == null) continue;

    const parsed = line.includes(" — 释: ")
      ? parseDashLine(line)
      : line.includes("|")
        ? parsePipeLine(line)
        : null;

    if (!parsed) continue;

    const key = `${currentLevel}-${currentList}`;
    if (!sectionMap.has(key)) {
      sectionMap.set(key, { level: currentLevel, list: currentList, words: [] });
    }
    sectionMap.get(key).words.push(parsed);
  }

  return [...sectionMap.values()].sort((a, b) => a.level - b.level || a.list - b.list);
}

function toRawText(level, list, words) {
  const lines = [`=== LEVEL ${level} LIST ${list} ===`];
  for (const { word, definitions } of words) {
    lines.push(word);
    lines.push(...definitions);
  }
  return `${lines.join("\n")}\n`;
}

function writeSections(sections, updatedAt = new Date().toISOString().slice(0, 10)) {
  const manifestPath = path.join(outDir, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  fs.mkdirSync(rawDir, { recursive: true });

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

    fs.writeFileSync(path.join(outDir, `${id}.json`), `${JSON.stringify(data, null, 2)}\n`);
    fs.writeFileSync(
      path.join(rawDir, `sat-level${level}-list${list}.txt`),
      toRawText(level, list, words),
      "utf8"
    );

    const existing = manifest.lists.find((entry) => entry.id === id);
    if (existing) {
      existing.wordCount = words.length;
      existing.title = data.meta.title;
      existing.level = level;
      existing.list = list;
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
}

function isMainModule() {
  const entry = process.argv[1];
  if (!entry) return false;
  return path.resolve(entry) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  const inputPaths = process.argv.slice(2).length
    ? process.argv.slice(2).map((p) => path.resolve(p))
    : [path.join(rawDir, "sat-level1-list6-11-latest.txt")];

  const sections = inputPaths.flatMap((inputPath) => {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`找不到文件：${inputPath}`);
    }
    const text = fs.readFileSync(inputPath, "utf8").replace(/^\uFEFF/, "");
    return parseSatWordlistText(text);
  });

  if (!sections.length) {
    throw new Error("未解析到任何 Word List");
  }

  writeSections(sections, "2026-07-29.3");
}
