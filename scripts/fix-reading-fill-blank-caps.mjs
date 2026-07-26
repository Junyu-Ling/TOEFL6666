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
  "shakespeare",
  "gis",
  "dna",
]);

function isProperNoun(word) {
  return PROPER_NOUNS.has(word.toLowerCase());
}

function adjustCase(text, capitalize) {
  if (!text) return text;
  if (capitalize) {
    return text[0].toUpperCase() + text.slice(1).toLowerCase();
  }
  return text.toLowerCase();
}

const changes = [];

for (const article of articles) {
  const matches = [...article.raw.matchAll(re)];
  let newRaw = "";
  let lastIndex = 0;

  matches.forEach((m, i) => {
    newRaw += article.raw.slice(lastIndex, m.index);

    const prefix = m[1];
    const bracket = m[2];
    const answer = article.answers[i];
    const sentStart = isSentStart(article.raw, m.index);
    const proper = isProperNoun(answer);
    const shouldCap = sentStart || proper;

    const newPrefix = adjustCase(prefix, shouldCap);
    const newAnswer = adjustCase(answer, shouldCap);

    if (newPrefix !== prefix || newAnswer !== answer) {
      changes.push({
        id: article.id,
        blank: i + 1,
        first: i === 0,
        from: { prefix, answer },
        to: { prefix: newPrefix, answer: newAnswer },
      });
    }

    article.answers[i] = newAnswer;
    const underscorePart = m[0].slice(prefix.length, m[0].indexOf(" "));
    newRaw += `${newPrefix}${underscorePart} [${bracket}]`;
    lastIndex = m.index + m[0].length;
  });

  newRaw += article.raw.slice(lastIndex);
  article.raw = newRaw;
}

writeFileSync("src/data/readingFillBlank.json", `${JSON.stringify(articles, null, 2)}\n`, "utf8");

console.log(`Fixed ${changes.length} blank(s) across ${new Set(changes.map((c) => c.id)).size} article(s).`);
console.log(`First-blank fixes: ${changes.filter((c) => c.first).length}`);
changes.forEach((c) => {
  console.log(
    `Article ${c.id} blank ${c.blank}${c.first ? " (first)" : ""}: "${c.from.prefix}|${c.from.answer}" -> "${c.to.prefix}|${c.to.answer}"`
  );
});
