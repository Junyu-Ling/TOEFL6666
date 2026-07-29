import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../public/api/wordlists-sat");
const rawDir = path.join(__dirname, "raw");

const POS_SEGMENT =
  /^(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|aux\.|abbr\.|modal\b|n\.\/v\.|v\.\/n\.|n\.\/adj\.)/i;

function formatListTitle(level, list) {
  return `Level ${level} · List ${list}`;
}

function normalizeDefinitionSegment(segment) {
  let part = String(segment || "").trim();
  if (!part) return "";

  part = part.replace(
    /^((?:n|v|adj|adv|prep|conj|pron|aux|abbr|modal)(?:\.(?:\/[a-z.]+)+|\.)+)\s*/i,
    (_, prefix) => (/\s$/.test(prefix) ? prefix : `${prefix} `)
  );

  const match = part.match(/^([a-z./]+\.\s*)(.+)$/i);
  if (match) {
    return `${match[1]}${match[2].replace(/,\s*/g, "，")}`;
  }

  return part.replace(/,\s*/g, "，");
}

export function parseChineseDefinitions(raw) {
  const text = String(raw || "").trim();
  if (!text) return ["（暂无释义）"];

  const segments = text
    .split(/;\s*/)
    .map(normalizeDefinitionSegment)
    .filter(Boolean);

  const definitions = [];
  for (const segment of segments) {
    if (POS_SEGMENT.test(segment) || !definitions.length) {
      definitions.push(segment);
      continue;
    }
    definitions[definitions.length - 1] += `；${segment}`;
  }

  return definitions;
}

function parseSheetRows(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }).slice(1);
  const words = [];

  for (const row of rows) {
    const word = String(row[1] || "").trim().toLowerCase();
    if (!word) continue;
    words.push({
      word,
      definitions: parseChineseDefinitions(row[3]),
    });
  }

  return words;
}

function toRawText(level, list, words) {
  const lines = [`=== LEVEL ${level} LIST ${list} ===`];
  for (const { word, definitions } of words) {
    lines.push(word);
    lines.push(...definitions);
  }
  return `${lines.join("\n")}\n`;
}

function loadWorkbook(inputPath) {
  const resolved = path.resolve(inputPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`找不到文件：${resolved}`);
  }
  return XLSX.readFile(resolved);
}

export function importSatWordlistsFromXlsx(inputPath, { level = 1 } = {}) {
  const workbook = loadWorkbook(inputPath);
  const sections = [];

  for (const sheetName of workbook.SheetNames) {
    const match = sheetName.match(/^Word List\s+(\d+)$/i);
    if (!match) {
      console.warn(`跳过工作表：${sheetName}`);
      continue;
    }

    const list = Number(match[1]);
    const words = parseSheetRows(workbook.Sheets[sheetName]);
    if (!words.length) {
      console.warn(`工作表 ${sheetName} 无有效词条`);
      continue;
    }

    sections.push({ level, list, words });
  }

  sections.sort((a, b) => a.list - b.list);
  return sections;
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
  const inputPath =
    process.argv[2] || "C:/Users/LingJ/Downloads/美国高考3000词_分类整理.xlsx";
  const sections = importSatWordlistsFromXlsx(inputPath);
  writeSections(sections);
}
