import { readFileSync } from "fs";

const articles = JSON.parse(readFileSync("src/data/readingFillBlank.json", "utf8"));
const re = /([a-zA-Z]*)_+\s*\[(\d+)\]/g;

let errors = 0;

for (const article of articles) {
  const matches = [...article.raw.matchAll(re)];
  if (matches.length !== article.answers.length) {
    console.error(`Article ${article.id}: ${matches.length} blanks vs ${article.answers.length} answers`);
    errors++;
    continue;
  }

  for (let i = 0; i < matches.length; i++) {
    const prefix = matches[i][1];
    const bracket = Number(matches[i][2]);
    const answer = article.answers[i];
    const required = answer.length - prefix.length;
    if (required !== bracket) {
      console.error(
        `Article ${article.id} blank ${i + 1} (${answer}): prefix "${prefix}" needs ${required} letters, bracket says [${bracket}]`
      );
      errors++;
    }
  }
}

if (errors === 0) {
  console.log(`All ${articles.length} articles verified OK (${articles.reduce((n, a) => n + a.answers.length, 0)} blanks).`);
} else {
  console.error(`${errors} error(s) found.`);
  process.exit(1);
}
