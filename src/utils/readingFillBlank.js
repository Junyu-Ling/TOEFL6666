import rawArticles from "../data/readingFillBlank.json";

const BLANK_RE = /([a-zA-Z]*)_+\s*\[(\d+)\]/g;

export const READING_FILL_BLANK_TOTAL = 7;

export function parsePassage(raw, answers) {
  const segments = [];
  let lastIndex = 0;
  let answerIndex = 0;
  let match;

  while ((match = BLANK_RE.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: raw.slice(lastIndex, match.index) });
    }

    const prefix = match[1];
    const bracketLen = Number(match[2]);
    const answer = answers[answerIndex];
    if (!answer) {
      throw new Error(`Missing answer for blank #${answerIndex + 1}`);
    }

    const derivedLen = Math.max(0, answer.length - prefix.length);
    const fillLen = derivedLen > 0 ? derivedLen : bracketLen;

    segments.push({
      type: "blank",
      id: `b${answerIndex}`,
      prefix,
      answer,
      fillLen,
      bracketLen,
    });

    answerIndex += 1;
    lastIndex = match.lastIndex;
  }

  if (lastIndex < raw.length) {
    segments.push({ type: "text", value: raw.slice(lastIndex) });
  }

  return segments;
}

let cachedArticles = null;

export function getReadingFillBlankArticles() {
  if (cachedArticles) return cachedArticles;

  cachedArticles = rawArticles.map((article) => ({
    id: article.id,
    title: article.title,
    segments: parsePassage(article.raw, article.answers),
    answers: article.answers,
    blankCount: article.answers.length,
  }));

  return cachedArticles;
}

export function getReadingFillBlankArticle(articleId) {
  return getReadingFillBlankArticles().find((article) => article.id === articleId) ?? null;
}

export function getBlankSegments(article) {
  return article.segments.filter((segment) => segment.type === "blank");
}

export function buildUserWord(prefix, letters) {
  return `${prefix}${letters.join("")}`.toLowerCase();
}

export function gradeBlank(blank, letters) {
  const userWord = buildUserWord(blank.prefix, letters);
  const expected = blank.answer.toLowerCase();
  const filledLen = letters.filter((ch) => ch.trim()).length;
  const isCorrect = filledLen === blank.fillLen && userWord === expected;
  return { isCorrect, userWord, expected };
}

export function gradeArticle(article, inputs) {
  const blanks = getBlankSegments(article);
  const results = blanks.map((blank) => {
    const letters = inputs[blank.id] ?? Array.from({ length: blank.fillLen }, () => "");
    return { blank, ...gradeBlank(blank, letters) };
  });

  const correctCount = results.filter((item) => item.isCorrect).length;
  return { results, correctCount, total: blanks.length };
}
