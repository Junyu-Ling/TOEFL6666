import data from "../data/transitionWords.json";
import { buildLocalCorrectResult, buildLocalWrongResult } from "../services/localMatch";

const CATEGORY_MAP = new Map(data.categories.map((category) => [category.id, category]));

export function getTransitionWordsTitle() {
  return data.title;
}

export function getTransitionWordCategories() {
  return data.categories;
}

export function getTransitionWordEntries() {
  return data.entries;
}

export function getTransitionWordCategory(categoryId) {
  return CATEGORY_MAP.get(categoryId) ?? null;
}

export function buildTransitionWordData(entry) {
  const category = getTransitionWordCategory(entry.categoryId);
  if (!category) return null;

  return {
    word: entry.word,
    definitions: [`${category.label}：${category.subtitle}`],
    transitionWord: {
      entryId: entry.id,
      categoryId: category.id,
      categoryLabel: category.label,
      categorySubtitle: category.subtitle,
      categoryAliases: category.aliases ?? [],
    },
  };
}

function seededShuffle(items, seed) {
  const arr = [...items];
  let state = Math.abs(seed) || 1;
  for (let i = arr.length - 1; i > 0; i -= 1) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const j = state % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function buildTransitionWordChoices(entry, optionCount = 4) {
  const categories = getTransitionWordCategories();
  const correct = getTransitionWordCategory(entry.categoryId);
  if (!correct) return [];

  const distractors = seededShuffle(
    categories.filter((category) => category.id !== entry.categoryId),
    entry.id * 17 + 3
  ).slice(0, Math.max(0, optionCount - 1));

  return seededShuffle([correct, ...distractors], entry.id * 31 + 7).map((category) => ({
    id: category.id,
    label: category.label,
    subtitle: category.subtitle,
  }));
}

export function evaluateTransitionWordChoice(selectedCategoryId, transitionWord) {
  if (!transitionWord) {
    return buildLocalWrongResult("题目数据异常，请刷新后重试。");
  }

  if (selectedCategoryId === transitionWord.categoryId) {
    return buildLocalCorrectResult({
      matchedIndices: [0],
      missedIndices: [],
    });
  }

  return buildLocalWrongResult(
    `正确关系：${transitionWord.categoryLabel}（${transitionWord.categorySubtitle}）`
  );
}

function normalizeTransitionAnswer(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[·/、，。；：:!?！？]/g, "");
}

function phraseMatchesAnswer(normalizedAnswer, phrase) {
  const normalizedPhrase = normalizeTransitionAnswer(phrase);
  if (!normalizedPhrase || !normalizedAnswer) return false;
  return (
    normalizedAnswer === normalizedPhrase ||
    normalizedAnswer.includes(normalizedPhrase) ||
    normalizedPhrase.includes(normalizedAnswer)
  );
}

export function matchTransitionWordAnswer(userAnswer, transitionWord) {
  const normalized = normalizeTransitionAnswer(userAnswer);
  if (!normalized) {
    return buildLocalWrongResult("请输入这个过渡词表示的逻辑关系。");
  }

  const candidates = [
    transitionWord.categoryLabel,
    transitionWord.categorySubtitle,
    ...(transitionWord.categoryAliases ?? []),
  ];

  for (const phrase of candidates) {
    if (phraseMatchesAnswer(normalized, phrase)) {
      return buildLocalCorrectResult({
        matchedIndices: [0],
        missedIndices: [],
      });
    }
  }

  return buildLocalWrongResult(
    `正确关系：${transitionWord.categoryLabel}（${transitionWord.categorySubtitle}）`
  );
}

export function evaluateTransitionWordAnswer(wordData, userAnswer) {
  if (!wordData?.transitionWord) return null;
  return matchTransitionWordAnswer(userAnswer, wordData.transitionWord);
}

export function buildShuffledTransitionOrder(length) {
  const order = Array.from({ length }, (_, index) => index);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
