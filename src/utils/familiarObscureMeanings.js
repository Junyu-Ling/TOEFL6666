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
