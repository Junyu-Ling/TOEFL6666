import irregularData from "../data/irregularPronunciation.json";
import { detectIrregularPronunciation, normalizePronunciationWord } from "./pronunciationRules.js";

const bankIndex = new Map(
  irregularData.entries.map((entry) => [normalizePronunciationWord(entry.word), entry])
);

/**
 * @returns {{ message: string, source: 'known'|'pattern'|'ai'|'bank' } | null}
 */
export function getPronunciationAlert(word, aiNote) {
  const normalized = normalizePronunciationWord(word);
  if (!normalized) return null;

  if (aiNote?.trim()) {
    return { message: aiNote.trim(), source: "ai" };
  }

  const bankEntry = bankIndex.get(normalized);
  if (bankEntry) {
    return { message: bankEntry.message, source: "bank", category: bankEntry.category };
  }

  const detected = detectIrregularPronunciation(normalized);
  if (detected) {
    return { message: detected.message, source: detected.category === "known" ? "known" : "pattern", category: detected.category };
  }

  return null;
}

export function isIrregularPronunciation(word) {
  return Boolean(getPronunciationAlert(word));
}

export function getIrregularPronunciationEntries() {
  return irregularData.entries;
}

export function getIrregularPronunciationStats() {
  return {
    totalWords: irregularData.totalWords,
    count: irregularData.count,
    generatedAt: irregularData.generatedAt,
  };
}

export function filterIrregularWords(words) {
  return words.filter((item) => isIrregularPronunciation(item.word));
}
