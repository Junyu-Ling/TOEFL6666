export const UNCategorized_LIST_ID = "__uncategorized__";

export function resolveWordListId(item) {
  return item?.sourceListId || UNCategorized_LIST_ID;
}

export function countPastWrongByListId(words) {
  const counts = new Map();
  for (const item of words) {
    if ((item.wrongCount ?? 0) < 1) continue;
    const listId = resolveWordListId(item);
    counts.set(listId, (counts.get(listId) || 0) + 1);
  }
  return counts;
}

export function filterPastWrongByListId(words, listId) {
  if (!listId) return [];
  return words.filter(
    (item) => (item.wrongCount ?? 0) >= 1 && resolveWordListId(item) === listId
  );
}

export function getListReviewLabel(listId, availableLists) {
  if (listId === UNCategorized_LIST_ID) return "未归类";
  const meta = availableLists.find((item) => item.id === listId);
  return meta?.title || "曾错题巩固";
}
