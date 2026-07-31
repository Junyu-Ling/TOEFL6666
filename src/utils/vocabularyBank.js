import { groupWordsByList, getListReviewLabel } from "./wordListGrouping";
import { groupBankWordsByFamily } from "./wordFamilies";
import { normalizeAppMode } from "./appMode";
import familyData from "../data/wordFamilies.json";

const familyRootByWord = new Map(Object.entries(familyData.wordToRoot || {}));
const multiFamilyRoots = new Set((familyData.families || []).map((item) => item.root));

export const BANK_SORT_OPTIONS = [
  { value: "level-list", label: "Level · List" },
  { value: "alpha-asc", label: "字母 A→Z" },
  { value: "alpha-desc", label: "字母 Z→A" },
];

export const BANK_VIEW_OPTIONS = [
  { value: "all", label: "全部单词" },
  { value: "irregular-pronunciation", label: "特殊发音" },
  { value: "word-family", label: "词族" },
];

const SAT_HIDDEN_BANK_VIEWS = new Set(["irregular-pronunciation", "word-family"]);

export function getBankViewOptions(appMode = "toefl") {
  if (normalizeAppMode(appMode) === "sat") {
    return BANK_VIEW_OPTIONS.filter((option) => !SAT_HIDDEN_BANK_VIEWS.has(option.value));
  }
  return BANK_VIEW_OPTIONS;
}

export function shouldResetBankViewForMode(viewMode, appMode = "toefl") {
  return normalizeAppMode(appMode) === "sat" && SAT_HIDDEN_BANK_VIEWS.has(viewMode);
}

export function getWordFamilyStats() {
  return {
    familyCount: familyData.familyCount || 0,
    memberCount: familyData.memberCount || 0,
    totalWords: familyData.totalWords || 0,
  };
}

export function filterBankFamilyWords(words) {
  return words.filter((item) => multiFamilyRoots.has(familyRootByWord.get(item.word.toLowerCase())));
}

export function groupBankFamilyWords(words) {
  return groupBankWordsByFamily(words, familyRootByWord);
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return row[b.length];
}

export function filterBankWords(words, query) {
  const q = query.trim().toLowerCase();
  if (!q) return words;

  const englishQuery = isEnglishWordQuery(query);
  return words.filter((item) => {
    const word = item.word.toLowerCase();
    if (englishQuery) {
      return word.startsWith(q);
    }
    return (
      word.includes(q) ||
      item.definitions?.some((def) => def.toLowerCase().includes(q))
    );
  });
}

export function findSimilarBankWords(words, query, { limit = 5, maxDistance = 2 } = {}) {
  const q = query.trim().toLowerCase();
  if (!q || !isEnglishWordQuery(query) || isWordInBank(words, q)) return [];

  const threshold = q.length <= 4 ? 1 : maxDistance;
  const scored = [];

  for (const item of words) {
    const word = item.word.toLowerCase();
    if (word === q) continue;

    const distance = levenshtein(q, word);
    if (distance > threshold) continue;

    let score = distance;
    const prefixLen = Math.min(3, q.length, word.length);
    if (prefixLen >= 2 && word.startsWith(q.slice(0, prefixLen))) {
      score -= 0.5;
    }

    scored.push({ item, score });
  }

  return scored
    .sort((a, b) => a.score - b.score || a.item.word.localeCompare(b.item.word, "en"))
    .slice(0, limit)
    .map((entry) => entry.item);
}

export function sortBankWords(words, sortMode, availableLists) {
  const list = [...words];
  if (sortMode === "alpha-asc") {
    return list.sort((a, b) => a.word.localeCompare(b.word, "en"));
  }
  if (sortMode === "alpha-desc") {
    return list.sort((a, b) => b.word.localeCompare(a.word, "en"));
  }

  const metaById = new Map(availableLists.map((item) => [item.id, item]));
  return list.sort((a, b) => {
    const metaA = metaById.get(a.sourceListId);
    const metaB = metaById.get(b.sourceListId);
    const levelA = metaA?.level ?? 999;
    const levelB = metaB?.level ?? 999;
    if (levelA !== levelB) return levelA - levelB;
    const listA = metaA?.list ?? 999;
    const listB = metaB?.list ?? 999;
    if (listA !== listB) return listA - listB;
    return (a.listIndex ?? 999999) - (b.listIndex ?? 999999);
  });
}

export function groupBankWords(words, sortMode, availableLists, wordListIndex) {
  if (sortMode !== "level-list") return null;
  return groupWordsByList(words, availableLists, wordListIndex);
}

export function getBankWordLabel(item, availableLists) {
  if (!item?.sourceListId) return "";
  return getListReviewLabel(item.sourceListId, availableLists);
}

export function isEnglishWordQuery(query) {
  const q = query.trim();
  if (!q || q.length > 48) return false;
  return /^[a-zA-Z][a-zA-Z' -]*$/.test(q);
}

export function isWordInBank(words, query) {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return words.some((item) => item.word.toLowerCase() === q);
}
