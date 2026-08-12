import rawArticles from "../data/readingFillBlank.json";
import { getArticleInputs } from "../services/readingFillBlankProgress";

export const READING_FILL_BLANK_TOTAL = rawArticles.length;
export const READING_FILL_BLANK_QUESTION_TOTAL = rawArticles.reduce(
  (sum, article) => sum + (article.answers?.length ?? 0),
  0
);

export function getReadingFillBlankQuestionTotal(articles) {
  return articles.reduce((sum, article) => sum + (article.blankCount ?? 0), 0);
}

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
  const end = blankCount > 0 ? start + blankCount - 1 : Math.max(start - 1, 0);
  return { start, end, total: READING_FILL_BLANK_QUESTION_TOTAL };
}

export function getBlankSegments(article) {
  return article.segments.filter((segment) => segment.type === "blank");
}

export function buildUserWord(prefix, letters) {
  return `${prefix}${letters.join("")}`.toLowerCase();
}

export function formatArticleUserAnswers(article, inputs) {
  const blanks = getBlankSegments(article);
  const words = blanks
    .map((blank) => {
      const letters = inputs[blank.id] ?? Array.from({ length: blank.fillLen }, () => "");
      if (!letters.some((letter) => letter.trim())) return null;
      return buildUserWord(blank.prefix, letters);
    })
    .filter(Boolean);

  return words.length > 0 ? words.join(", ") : "—";
}

export function getReadingFillBlankReviewRows(articles, progress) {
  return articles.map((article, index) => {
    const range = getReadingFillBlankQuestionRange(articles, index);
    const inputs = getArticleInputs(article, progress.inputsByArticle);
    const checked = Boolean(progress.checkedByArticle?.[article.id]);
    const grade = checked ? gradeArticle(article, inputs) : null;

    return {
      index,
      articleId: article.id,
      numberLabel: range.end >= range.start ? `${range.start}-${range.end}` : "—",
      title: article.title,
      type: "单词填空",
      description: `第 ${article.id} 篇：${article.title}`,
      userAnswers: formatArticleUserAnswers(article, inputs),
      checked,
      scoreLabel: grade ? `${grade.correctCount}/${grade.total}` : null,
    };
  });
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
