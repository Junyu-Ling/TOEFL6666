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

function parsePipeDefinitions(raw) {
  return parseChineseDefinitions(String(raw || "").replace(/；/g, ";"));
}

function parsePipeBody(text) {
  const sections = [];
  const parts = text.split(/^Word List\s+(\d+)\s*$/im);

  for (let i = 1; i < parts.length; i += 2) {
    const list = Number(parts[i]);
    const lines = parts[i + 1]
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const words = [];
    for (const line of lines) {
      const segments = line.split(/\s*\|\s*/);
      if (segments.length < 3) continue;

      const word = segments[0].trim().toLowerCase();
      const definitions = parsePipeDefinitions(segments.slice(2).join(" | "));
      if (!word || !definitions.length) continue;

      words.push({ word, definitions });
    }

    sections.push({ level: 1, list, words });
  }

  return sections;
}

function toRawText(level, list, words) {
  const lines = [`=== LEVEL ${level} LIST ${list} ===`];
  for (const { word, definitions } of words) {
    lines.push(word);
    lines.push(...definitions);
  }
  return `${lines.join("\n")}\n`;
}

function writeSections(sections) {
  const updatedAt = new Date().toISOString().slice(0, 10);
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
    fs.writeFileSync(path.join(rawDir, `sat-level1-list${list}.txt`), toRawText(level, list, words), "utf8");

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
}

function isMainModule() {
  const entry = process.argv[1];
  if (!entry) return false;
  return path.resolve(entry) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  const inputPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(rawDir, "sat-level1-list6-11-latest.txt");

  if (!fs.existsSync(inputPath)) {
    throw new Error(`找不到文件：${inputPath}`);
  }

  const text = fs.readFileSync(inputPath, "utf8").replace(/^\uFEFF/, "");
  const sections = parsePipeBody(text);
  if (!sections.length) {
    throw new Error("未解析到任何 Word List");
  }

  writeSections(sections);
}
