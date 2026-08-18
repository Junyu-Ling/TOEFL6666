import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const articles = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../src/data/readingFillBlank.json"), "utf8")
);

function normTitle(t) {
  return String(t).trim().toLowerCase().replace(/\s+/g, " ");
}

function normRaw(r) {
  return String(r).replace(/\s+/g, " ").trim().toLowerCase();
}

function simplifyTitle(t) {
  return t
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(s) {
  return new Set(
    normRaw(s)
      .split(/[^a-z]+/)
      .filter(Boolean)
  );
}

function jaccard(a, b) {
  const A = words(a);
  const B = words(b);
  let inter = 0;
  for (const w of A) {
    if (B.has(w)) inter += 1;
  }
  return inter / (A.size + B.size - inter);
}

const byTitle = new Map();
const byRaw = new Map();
const bySimpleTitle = new Map();

for (const article of articles) {
  const titleKey = normTitle(article.title);
  const rawKey = normRaw(article.raw);
  const simpleKey = simplifyTitle(article.title);

  if (!byTitle.has(titleKey)) byTitle.set(titleKey, []);
  byTitle.get(titleKey).push(article);

  if (!byRaw.has(rawKey)) byRaw.set(rawKey, []);
  byRaw.get(rawKey).push(article);

  if (!bySimpleTitle.has(simpleKey)) bySimpleTitle.set(simpleKey, []);
  bySimpleTitle.get(simpleKey).push(article);
}

const report = {
  exactTitleDuplicates: [],
  exactRawDuplicates: [],
  similarTitleGroups: [],
  highSimilarityPairs: [],
};

for (const [title, group] of byTitle.entries()) {
  if (group.length > 1) {
    report.exactTitleDuplicates.push({
      title: group[0].title,
      ids: group.map((a) => a.id),
    });
  }
}

for (const [, group] of byRaw.entries()) {
  if (group.length > 1) {
    report.exactRawDuplicates.push({
      title: group[0].title,
      ids: group.map((a) => a.id),
      titles: group.map((a) => ({ id: a.id, title: a.title })),
    });
  }
}

for (const [simple, group] of bySimpleTitle.entries()) {
  const uniqueTitles = new Set(group.map((a) => normTitle(a.title)));
  if (group.length > 1 && uniqueTitles.size > 1) {
    report.similarTitleGroups.push({
      simplified: simple,
      items: group.map((a) => ({ id: a.id, title: a.title })),
    });
  }
}

for (let i = 0; i < articles.length; i += 1) {
  for (let j = i + 1; j < articles.length; j += 1) {
    const sim = jaccard(articles[i].raw, articles[j].raw);
    if (sim >= 0.9) {
      report.highSimilarityPairs.push({
        idA: articles[i].id,
        titleA: articles[i].title,
        idB: articles[j].id,
        titleB: articles[j].title,
        similarity: Number(sim.toFixed(4)),
      });
    }
  }
}

report.highSimilarityPairs.sort((a, b) => b.similarity - a.similarity);

console.log(JSON.stringify(report, null, 2));
