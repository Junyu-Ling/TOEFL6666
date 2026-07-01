export const UNCategorized_LIST_ID = "__uncategorized__";

export function inferSourceListId(item, wordListIndex = null) {
  if (item?.sourceListId) return item.sourceListId;
  const word = item?.word?.trim().toLowerCase();
  if (word && wordListIndex?.[word]) return wordListIndex[word];
  return undefined;
}

export function resolveWordListId(item, wordListIndex = null) {
  return inferSourceListId(item, wordListIndex) || UNCategorized_LIST_ID;
}

export function getListReviewLabel(listId, availableLists) {
  if (listId === UNCategorized_LIST_ID) return "未归类";
  const meta = availableLists.find((item) => item.id === listId);
  return meta?.title || listId;
}

export function groupWordsByList(words, availableLists, wordListIndex = null) {
  const listMetaById = new Map(availableLists.map((item) => [item.id, item]));
  const buckets = new Map();

  for (const word of words) {
    const listId = resolveWordListId(word, wordListIndex);
    if (!buckets.has(listId)) buckets.set(listId, []);
    buckets.get(listId).push(word);
  }

  const sortListIds = (a, b) => {
    if (a === UNCategorized_LIST_ID) return 1;
    if (b === UNCategorized_LIST_ID) return -1;
    const metaA = listMetaById.get(a);
    const metaB = listMetaById.get(b);
    if (!metaA && !metaB) return a.localeCompare(b);
    if (!metaA) return 1;
    if (!metaB) return -1;
    if (metaA.level !== metaB.level) return metaA.level - metaB.level;
    return metaA.list - metaB.list;
  };

  return [...buckets.keys()]
    .sort(sortListIds)
    .map((listId) => {
      const items = buckets.get(listId);
      const wrongTotal = items.reduce((sum, item) => sum + (item.wrongCount ?? 0), 0);
      return {
        listId,
        label: getListReviewLabel(listId, availableLists),
        level: listMetaById.get(listId)?.level ?? null,
        words: items,
        wrongTotal,
      };
    });
}
