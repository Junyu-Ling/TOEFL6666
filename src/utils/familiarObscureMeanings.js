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
