import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputPath = path.join(__dirname, "raw/sat-level1-list2-5-user.txt");
const rawDir = path.join(__dirname, "raw");

const POS_START =
  /^(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|aux\.|abbr\.|modal\b|n\.\/v\.|n\.\/adj\.|v\.\/n\.)/;

const WORD_LINE = /^([A-Za-z][A-Za-z-]*)\s*(?:\/[^/]*\/)?\s*$/;

function isDefinitionLine(line) {
  return POS_START.test(line);
}

function parseUserFormat(text) {
  const sections = [];
  const parts = text.split(/^Word List (\d+)\s*$/im);

  for (let i = 1; i < parts.length; i += 2) {
    const list = Number(parts[i]);
    const lines = parts[i + 1]
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const words = [];
    let current = null;

    for (const line of lines) {
      if (isDefinitionLine(line)) {
        if (!current) throw new Error(`List ${list}: definition without word: ${line}`);
        current.definitions.push(line);
        continue;
      }

      const wordMatch = line.match(WORD_LINE);
      if (wordMatch) {
        if (current) {
          if (!current.definitions.length) throw new Error(`List ${list}: word without definitions: ${current.word}`);
          words.push(current);
        }
        current = { word: wordMatch[1].toLowerCase(), definitions: [] };
        continue;
      }

      throw new Error(`List ${list}: unrecognized line: ${line}`);
    }

    if (current) {
      if (!current.definitions.length) throw new Error(`List ${list}: word without definitions: ${current.word}`);
      words.push(current);
    }

    sections.push({ level: 1, list, words });
  }

  return sections;
}

function toRawFormat({ level, list, words }) {
  const lines = [`=== LEVEL ${level} LIST ${list} ===`];
  for (const { word, definitions } of words) {
    lines.push(word);
    lines.push(...definitions);
  }
  return `${lines.join("\n")}\n`;
}

const text = fs.readFileSync(inputPath, "utf8").replace(/^\uFEFF/, "");
const sections = parseUserFormat(text);

for (const section of sections) {
  const outPath = path.join(rawDir, `sat-level1-list${section.list}.txt`);
  fs.writeFileSync(outPath, toRawFormat(section), "utf8");
  console.log(`Wrote ${path.basename(outPath)} (${section.words.length} words)`);
}
