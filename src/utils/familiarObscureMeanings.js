import data from "../data/familiarObscureMeanings.json";

export function getFamiliarObscureTitle() {
  return data.title;
}

export function getFamiliarObscureEntries() {
  return data.entries;
}

export function getFamiliarObscureEntry(id) {
  return data.entries.find((entry) => entry.id === id) ?? null;
}

export function getObscureDefinitions(entry) {
  const obscure = entry.obscureMeaning?.trim();
  if (!obscure) return [];
  return obscure
    .split(/[①②]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function buildFamiliarObscureWordData(entry) {
  return {
    word: entry.word,
    definitions: getObscureDefinitions(entry),
    familiarObscure: {
      entryId: entry.id,
      commonMeaning: entry.commonMeaning || "",
      memoryTip: entry.memoryTip || "",
      obscureMeaning: entry.obscureMeaning || "",
    },
  };
}

export function filterFamiliarObscureEntries(entries, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((entry) => {
    const haystack = [
      entry.word,
      entry.commonMeaning,
      entry.obscureMeaning,
      entry.memoryTip,
      entry.exampleEn,
      entry.exampleZh,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function getFamiliarObscureIdBounds(entries) {
  if (!entries.length) return { min: 1, max: 1 };
  let min = entries[0].id;
  let max = entries[0].id;
  for (const entry of entries) {
    min = Math.min(min, entry.id);
    max = Math.max(max, entry.id);
  }
  return { min, max };
}

export function filterEntriesByQuizScope(entries, scope, progress = {}) {
  const fromId = Math.min(scope.fromId, scope.toId);
  const toId = Math.max(scope.fromId, scope.toId);
  const mastered = new Set(progress.masteredIds || []);
  const unknown = new Set(progress.unknownIds || []);

  return entries.filter((entry) => {
    if (entry.id < fromId || entry.id > toId) return false;
    if (scope.onlyReview && !unknown.has(entry.id)) return false;
    if (scope.onlyUnmastered && mastered.has(entry.id)) return false;
    return true;
  });
}

export function createDefaultQuizScope(entries) {
  const { min, max } = getFamiliarObscureIdBounds(entries);
  return { fromId: min, toId: max, onlyReview: false, onlyUnmastered: false };
}
