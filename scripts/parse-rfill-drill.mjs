import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const htmlPath =
  process.argv[2] ||
  "c:/xwechat_files/wxid_wdpynjb9dknb12_aa2f/msg/file/2026-10/TOEFL_Vocab_Printable_2026-10-12.html";
const html = readFileSync(htmlPath, "utf8");

const rowRe =
  /<tr>\s*<td class="col-rank">(\d+)<\/td><td class="col-word">([\s\S]*?)<\/td>\s*<td class="col-freq">(\d+)<\/td><td class="col-trans">([\s\S]*?)<\/td><td class="col-sent">([\s\S]*?)<\/td>\s*<\/tr>/g;

function stripTags(s) {
  return String(s || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?b>/gi, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

function parseWordCell(cell) {
  return cell
    .split(/<br\s*\/?>/i)
    .map((part) => {
      const m = part.match(/<b>([\s\S]*?)<\/b>([^<]*)/);
      if (!m) return null;
      const prefix = m[1].replace(/\s+/g, "");
      const rest = m[2].replace(/\s+/g, "");
      const word = `${prefix}${rest}`;
      if (!word) return null;
      return { prefix, rest, word };
    })
    .filter(Boolean);
}

function parseSents(cell) {
  return cell
    .split(/<br\s*\/?>/i)
    .map((s) =>
      s
        .replace(/^\s*\d+\.\s*/, "")
        .replace(/<\/?b>/gi, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
}

const entries = [];
let match;
while ((match = rowRe.exec(html))) {
  const rank = Number(match[1]);
  const words = parseWordCell(match[2]);
  const freq = Number(match[3]);
  const gloss = stripTags(match[4]).replace(/\s+/g, " ");
  const sentences = parseSents(match[5]);
  if (!words.length || !sentences.length) continue;
  entries.push({
    id: `r${rank}`,
    rank,
    freq,
    gloss,
    words,
    sentences,
  });
}

// Expand to drill items: each sentence paired with one primary word form.
// Prefer the word form that actually appears in the sentence (case-insensitive).
const items = [];
for (const entry of entries) {
  for (let si = 0; si < entry.sentences.length; si += 1) {
    const sentence = entry.sentences[si];
    const lower = sentence.toLowerCase();
    let chosen = entry.words.find((w) => {
      const re = new RegExp(`\\b${w.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      return re.test(sentence);
    });
    if (!chosen) chosen = entry.words[0];
    // Match case in sentence when possible
    const re = new RegExp(`\\b${chosen.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    const hit = sentence.match(re);
    let answer = chosen.word;
    let prefix = chosen.prefix;
    if (hit) {
      answer = hit[0];
      // Keep given letters length from source markup, adapt case from sentence
      const givenLen = chosen.prefix.length;
      prefix = answer.slice(0, givenLen);
    }
    const rest = answer.slice(prefix.length);
    if (!rest) continue;
    items.push({
      id: `${entry.id}-s${si + 1}`,
      rank: entry.rank,
      freq: entry.freq,
      gloss: entry.gloss,
      letter: prefix.slice(0, 1).toLowerCase() || answer.slice(0, 1).toLowerCase(),
      prefix,
      answer,
      restLen: rest.length,
      sentence,
    });
  }
}

items.sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "server", "data");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "readingFillDrill.json");
writeFileSync(outPath, `${JSON.stringify({ generatedFrom: "TOEFL_Vocab_Printable_2026-10-12.html", items }, null, 0)}\n`);
console.log({
  entries: entries.length,
  items: items.length,
  outPath,
  sample: items.slice(0, 2),
});
