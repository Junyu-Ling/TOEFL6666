import { readFileSync, writeFileSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const PDF_PATH =
  process.argv[2] ||
  "C:/Users/LingJ/Downloads/SAT熟词僻义汇总表(1).pdf";
const OUT_PATH = "src/data/familiarObscureMeanings.json";

const POS_RE = "(v\\.|n\\.|adj\\.|adv\\.|prep\\.|num\\.|conj\\.)";

function cleanLine(line) {
  return line.replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
}

function parseStartLine(line) {
  const withPos = line.match(new RegExp(`^(\\d{1,3})([A-Za-z'-]+)${POS_RE}(.*)$`));
  if (withPos) {
    return {
      id: Number(withPos[1]),
      word: withPos[2],
      rest: withPos[4].trim(),
      hasPosOnLine: true,
    };
  }
  const plain = line.match(/^(\d{1,3})([A-Za-z'-]+)$/);
  if (plain) {
    return { id: Number(plain[1]), word: plain[2], rest: "", hasPosOnLine: false };
  }
  return null;
}

function splitExampleLine(line) {
  const match = line.match(/^(.*?)(?:译[:：]\s*(.+))$/);
  if (!match) return { en: line, zh: "" };
  return {
    en: match[1].replace(/^"|"$/g, "").trim(),
    zh: match[2].trim(),
  };
}

function isObscureStart(line) {
  return (
    /^[①②]/.test(line) ||
    (new RegExp(`^${POS_RE}`).test(line) && /[=（(]/.test(line))
  );
}

function isCommonHint(line) {
  return (
    /^词根|^由|^v\. mean|^adj\.|^n\.|^v\.|^prep\.|^num\.|^conj\./.test(line) &&
    !isObscureStart(line)
  );
}

function parseEntries(text) {
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const entries = [];
  let current = null;
  let section = null;

  function flush() {
    if (!current) return;
    for (const key of ["commonMeaning", "obscureMeaning", "exampleEn", "exampleZh", "memoryTip"]) {
      current[key] = (current[key] || "").replace(/\s+/g, " ").trim();
    }
    current.exampleEn = current.exampleEn.replace(/^"|"$/g, "").trim();
    if (current.word) entries.push(current);
    current = null;
    section = null;
  }

  for (const line of lines) {
    if (/^-- \d+ of \d+ --$/.test(line)) continue;
    if (line === "SAT常⻅熟词僻义" || line === "SAT常见熟词僻义") continue;
    if (/^编号单词/.test(line)) continue;

    const start = parseStartLine(line);
    if (start) {
      flush();
      current = {
        id: start.id,
        word: start.word,
        commonMeaning: start.rest,
        obscureMeaning: "",
        exampleEn: "",
        exampleZh: "",
        memoryTip: "",
      };
      section = start.rest ? "common" : "common";
      continue;
    }

    if (!current) continue;

    if (/^译[:：]/.test(line)) {
      current.exampleZh += (current.exampleZh ? " " : "") + line.replace(/^译[:：]\s*/, "");
      section = "exampleZh";
      continue;
    }

    if (line.includes("译：") || line.includes("译:")) {
      const { en, zh } = splitExampleLine(line);
      if (en) current.exampleEn += (current.exampleEn ? " " : "") + en;
      if (zh) current.exampleZh += (current.exampleZh ? " " : "") + zh;
      section = zh ? "memory" : "example";
      continue;
    }

    if (line.startsWith('"') || (section === "example" && !current.memoryTip)) {
      if (!current.exampleEn && line.startsWith('"')) {
        section = "example";
        current.exampleEn = line.replace(/^"|"$/g, "");
        continue;
      }
    }

    if (section === "example") {
      if (isObscureStart(line)) {
        section = "obscure";
        current.obscureMeaning += (current.obscureMeaning ? " " : "") + line;
      } else if (/^[A-Za-z].*[.!?]"?$/.test(line) || /^[A-Za-z]/.test(line)) {
        current.exampleEn += " " + line.replace(/"$/g, "");
      } else {
        section = "memory";
        current.memoryTip = line;
      }
      continue;
    }

    if (section === "exampleZh") {
      if (isObscureStart(line)) {
        section = "obscure";
        current.obscureMeaning = line;
      } else {
        section = "memory";
        current.memoryTip = line;
      }
      continue;
    }

    if (section === "memory") {
      current.memoryTip += " " + line;
      continue;
    }

    if (!current.obscureMeaning && isObscureStart(line)) {
      section = "obscure";
      current.obscureMeaning = line;
      continue;
    }

    if (section === "obscure") {
      if (line.startsWith('"')) {
        section = "example";
        current.exampleEn = line.replace(/^"|"$/g, "");
      } else if (isCommonHint(line)) {
        current.commonMeaning += " " + line;
      } else {
        current.obscureMeaning += " " + line;
      }
      continue;
    }

    if (section === "common") {
      if (isObscureStart(line)) {
        section = "obscure";
        current.obscureMeaning = line;
      } else if (line.startsWith('"')) {
        section = "example";
        current.exampleEn = line.replace(/^"|"$/g, "");
      } else if (isCommonHint(line) || !current.obscureMeaning) {
        current.commonMeaning += " " + line;
      }
    }
  }

  flush();
  return entries;
}

const POS_MARK = "(?:v\\.|n\\.|adj\\.|adv\\.|prep\\.|num\\.|conj\\.)";

function findPosSegmentStarts(text) {
  const re = new RegExp(`(?:^|[\\s；;])(${POS_MARK})\\s`, "g");
  const starts = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    starts.push(match.index + match[0].indexOf(match[1]));
  }
  return starts;
}

function fixObscureSplit(entry) {
  if (entry.obscureMeaning?.trim()) return entry;

  const text = entry.commonMeaning.trim();
  if (!text) return entry;

  const rareIdx = text.search(/生僻含义[:：]/);
  if (rareIdx >= 0) {
    return {
      ...entry,
      commonMeaning: text.slice(0, rareIdx).trim(),
      obscureMeaning: text.slice(rareIdx).replace(/^生僻含义[:：]\s*/, "").trim(),
    };
  }

  const numberedIdx = text.search(/[①②]/);
  if (numberedIdx > 0) {
    return {
      ...entry,
      commonMeaning: text.slice(0, numberedIdx).trim(),
      obscureMeaning: text.slice(numberedIdx).trim(),
    };
  }

  const starts = findPosSegmentStarts(text);
  if (starts.length > 0) {
    for (let i = starts.length - 1; i >= 0; i -= 1) {
      const segStart = starts[i];
      const segEnd = starts[i + 1] ?? text.length;
      const segment = text.slice(segStart, segEnd);
      if (!/[=（(]/.test(segment)) continue;
      const common = text.slice(0, segStart).trim();
      const obscure = text.slice(segStart).trim();
      if (common && obscure) {
        return { ...entry, commonMeaning: common, obscureMeaning: obscure };
      }
    }
  }

  const bareMatch = text.match(
    new RegExp(`^(.+?\\s)(?=${POS_MARK}\\s[^；;]*[=（(])`)
  );
  if (bareMatch) {
    return {
      ...entry,
      commonMeaning: bareMatch[1].trim(),
      obscureMeaning: text.slice(bareMatch[1].length).trim(),
    };
  }

  return entry;
}

function fixExampleZh(entry) {
  const zh = entry.exampleZh?.trim() ?? "";
  const tip = entry.memoryTip?.trim() ?? "";
  if (!zh || !tip) return entry;
  if (/[。！？.!?]$/.test(zh)) return entry;

  const periodIdx = tip.search(/[。！？]/);
  if (periodIdx < 0) return entry;

  const continuation = tip.slice(0, periodIdx + 1).trim();
  const restTip = tip.slice(periodIdx + 1).trim();
  if (!continuation) return entry;

  return {
    ...entry,
    exampleZh: `${zh}${continuation}`.replace(/\s+/g, " ").trim(),
    memoryTip: restTip,
  };
}

function normalizeEntry(entry) {
  return fixExampleZh(fixObscureSplit(entry));
}

const buffer = readFileSync(PDF_PATH);
const parsed = await pdfParse(buffer);
const entries = parseEntries(parsed.text).map(normalizeEntry);

const missingTips = entries.filter((e) => !e.memoryTip);
const missingObscure = entries.filter((e) => !e.obscureMeaning);

console.log(`Parsed ${entries.length} entries`);
if (missingTips.length) {
  console.warn(`Missing memory tips (${missingTips.length}):`, missingTips.map((e) => e.id).join(", "));
}
if (missingObscure.length) {
  console.warn(`Missing obscure (${missingObscure.length}):`, missingObscure.slice(0, 10).map((e) => e.id).join(", "));
}

writeFileSync(
  OUT_PATH,
  `${JSON.stringify(
    {
      title: "SAT 熟词僻义",
      source: "SAT熟词僻义汇总表",
      total: entries.length,
      entries,
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log(`Wrote ${OUT_PATH}`);
