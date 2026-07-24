const PROGRESS_KEY = "toefl666_reading_fill_blank";

function emptyInputsForArticle(article) {
  const inputs = {};
  for (const segment of article.segments) {
    if (segment.type !== "blank") continue;
    inputs[segment.id] = Array.from({ length: segment.fillLen }, () => "");
  }
  return inputs;
}

export function loadReadingFillBlankProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) {
      return {
        articleIndex: 0,
        inputsByArticle: {},
        checkedByArticle: {},
      };
    }

    const parsed = JSON.parse(raw);
    const articleIndex = Number.isFinite(parsed.articleIndex) ? parsed.articleIndex : 0;
    return {
      articleIndex: Math.max(0, articleIndex),
      inputsByArticle: parsed.inputsByArticle && typeof parsed.inputsByArticle === "object" ? parsed.inputsByArticle : {},
      checkedByArticle:
        parsed.checkedByArticle && typeof parsed.checkedByArticle === "object" ? parsed.checkedByArticle : {},
    };
  } catch {
    return {
      articleIndex: 0,
      inputsByArticle: {},
      checkedByArticle: {},
    };
  }
}

export function saveReadingFillBlankProgress(progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function getArticleInputs(article, savedInputs) {
  const base = emptyInputsForArticle(article);
  const stored = savedInputs?.[article.id];
  if (!stored || typeof stored !== "object") return base;

  for (const segment of article.segments) {
    if (segment.type !== "blank") continue;
    const savedLetters = stored[segment.id];
    if (!Array.isArray(savedLetters)) continue;
    base[segment.id] = Array.from({ length: segment.fillLen }, (_, index) =>
      typeof savedLetters[index] === "string" ? savedLetters[index] : ""
    );
  }

  return base;
}

export function patchArticleInputs(progress, articleId, inputs) {
  const next = {
    ...progress,
    inputsByArticle: {
      ...progress.inputsByArticle,
      [articleId]: inputs,
    },
  };
  saveReadingFillBlankProgress(next);
  return next;
}

export function patchArticleChecked(progress, articleId, checked) {
  const next = {
    ...progress,
    checkedByArticle: {
      ...progress.checkedByArticle,
      [articleId]: checked,
    },
  };
  saveReadingFillBlankProgress(next);
  return next;
}

export function patchArticleIndex(progress, articleIndex) {
  const next = { ...progress, articleIndex };
  saveReadingFillBlankProgress(next);
  return next;
}
