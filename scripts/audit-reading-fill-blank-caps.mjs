import { readFileSync, writeFileSync } from "fs";

const articles = JSON.parse(readFileSync("src/data/readingFillBlank.json", "utf8"));
const re = /([a-zA-Z]*)_+\s*\[(\d+)\]/g;

function isSentStart(raw, idx) {
  const before = raw.slice(0, idx).trimEnd();
  if (before.length === 0) return true;
  return /[.!?]\s*$/.test(before);
}

const PROPER_NOUNS = new Set([
  "earth",
  "i",
  "europe",
  "asia",
  "africa",
  "america",
  "greece",
  "roman",
  "egypt",
  "india",
  "china",
  "japan",
  "sun",
  "enceladus",
  "europa",
  "jefferson",
  "louisiana",
  "renaissance",
  "neolithic",
  "paleolithic",
  "gis",
  "dna",
  "greek",
  "european",
  "african",
  "asian",
  "indian",
  "medieval",
  "michelangelo",
  "saturn",
  "jupiter",
  "mars",
  "venus",
  "mercury",
  "neptune",
  "pinta",
  "erie",
  "pacific",
  "atlantic",
  "mediterranean",
  "arctic",
  "antarctic",
  "sahara",
  "english",
  "french",
  "german",
  "italian",
  "spanish",
  "latin",
  "christian",
  "christianity",
  "islam",
  "buddhist",
  "buddhism",
  "hindu",
  "hinduism",
  "judaism",
  "jewish",
  "catholic",
  "protestant",
]);

function isProperNoun(word) {
  return PROPER_NOUNS.has(word.toLowerCase());
}

function capitalizeWord(word) {
  if (!word) return word;
  return word[0].toUpperCase() + word.slice(1).toLowerCase();
}

function lowercaseWord(word) {
  if (!word) return word;
  return word.toLowerCase();
}

const needLower = [];
const needUpper = [];

for (const article of articles) {
  const matches = [...article.raw.matchAll(re)];
  matches.forEach((m, i) => {
    const prefix = m[1];
    const answer = article.answers[i];
    const sentStart = isSentStart(article.raw, m.index);
    const proper = isProperNoun(answer);

    const preCap = prefix.length > 0 && /^[A-Z]/.test(prefix);
    const preLow = prefix.length > 0 && /^[a-z]/.test(prefix);
    const ansCap = /^[A-Z]/.test(answer);
    const ansLow = /^[a-z]/.test(answer);

    if (sentStart && !proper) {
      if (preLow || ansLow) {
        needUpper.push({ id: article.id, blank: i + 1, prefix, answer, first: i === 0 });
      }
    }
    if (!sentStart && !proper) {
      if (preCap || ansCap) {
        needLower.push({ id: article.id, blank: i + 1, prefix, answer, first: i === 0 });
      }
    }
  });
}

console.log("Need lowercase (mid-sentence):", needLower.length);
needLower.forEach((x) => console.log(JSON.stringify(x)));
console.log("\nNeed uppercase (sentence start):", needUpper.length);
needUpper.forEach((x) => console.log(JSON.stringify(x)));

const firstBlankIssues = needLower.filter((x) => x.first).length + needUpper.filter((x) => x.first).length;
console.log("\nFirst blank issues:", firstBlankIssues);
