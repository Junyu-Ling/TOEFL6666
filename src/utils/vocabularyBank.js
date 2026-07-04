import { groupWordsByList, getListReviewLabel } from "./wordListGrouping";
import { groupBankWordsByFamily } from "./wordFamilies";
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

export function filterBankWords(words, query) {
  const q = query.trim().toLowerCase();
  if (!q) return words;
  return words.filter(
    (item) =>
      item.word.toLowerCase().includes(q) ||
      item.definitions?.some((def) => def.toLowerCase().includes(q))
  );
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
