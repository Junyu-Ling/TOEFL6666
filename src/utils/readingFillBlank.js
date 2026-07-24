import rawArticles from "../data/readingFillBlank.json";

export const READING_FILL_BLANK_TOTAL = 25;

export function parsePassage(raw, answers) {
  const segments = [];
  const blankRe = /([a-zA-Z]*)_+\s*\[(\d+)\]/g;
  let lastIndex = 0;
  let answerIndex = 0;
  let match;

  while ((match = blankRe.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: raw.slice(lastIndex, match.index) });
    }

    const prefix = match[1];
    const bracketLen = Number(match[2]);
    const answer = answers[answerIndex];
    if (!answer) {
      throw new Error(`Missing answer for blank #${answerIndex + 1}`);
    }

    segments.push({
      type: "blank",
      id: `b${answerIndex}`,
      prefix: prefix,
      answer,
      fillLen: bracketLen,
      bracketLen,
    });

    answerIndex += 1;
    lastIndex = blankRe.lastIndex;
  }

  if (lastIndex < raw.length) {
    segments.push({ type: "text", value: raw.slice(lastIndex) });
  }

  return segments;
}

export function getReadingFillBlankArticles() {
  return rawArticles.map((article) => ({
    id: article.id,
    title: article.title,
    segments: parsePassage(article.raw, article.answers),
    answers: article.answers,
    blankCount: article.answers.length,
  }));
}

export function getReadingFillBlankArticle(articleId) {
  return getReadingFillBlankArticles().find((article) => article.id === articleId) ?? null;
}

export function getReadingFillBlankQuestionRange(articles, articleIndex) {
  let start = 1;
  for (let i = 0; i < articleIndex; i += 1) {
    start += articles[i]?.blankCount ?? 0;
  }
  const blankCount = articles[articleIndex]?.blankCount ?? 0;
  const end = start + blankCount - 1;
  return { start, end, total: end };
}

export function getBlankSegments(article) {
  return article.segments.filter((segment) => segment.type === "blank");
}

export function buildUserWord(prefix, letters) {
  return `${prefix}${letters.join("")}`.toLowerCase();
}

export function gradeBlank(blank, letters) {
  const expected = blank.answer.toLowerCase();
  const requiredLen = Math.max(0, expected.length - blank.prefix.length);
  const filledPart = letters.join("").trim().toLowerCase();
  const userWord = buildUserWord(blank.prefix, letters).trim().toLowerCase();
  const isCorrect = filledPart.length === requiredLen && userWord === expected;
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
