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

export function countWordsByListId(words, wordListIndex = null) {
  const counts = new Map();
  for (const item of words) {
    const listId = resolveWordListId(item, wordListIndex);
    counts.set(listId, (counts.get(listId) || 0) + 1);
  }
  return counts;
}

export function countPastWrongByListId(words, wordListIndex = null) {
  const counts = new Map();
  for (const item of words) {
    if ((item.wrongCount ?? 0) < 1) continue;
    const listId = resolveWordListId(item, wordListIndex);
    counts.set(listId, (counts.get(listId) || 0) + 1);
  }
  return counts;
}

export function filterWordsByListId(words, listId, wordListIndex = null) {
  if (!listId) return [];
  return words.filter((item) => resolveWordListId(item, wordListIndex) === listId);
}

export function filterWordsByListIds(words, listIds, wordListIndex = null) {
  if (!listIds?.length) return [];
  const selected = new Set(listIds);
  return words.filter((item) => selected.has(resolveWordListId(item, wordListIndex)));
}

export function filterPastWrongByListId(words, listId, wordListIndex = null) {
  return filterWordsByListId(words, listId, wordListIndex).filter(
    (item) => (item.wrongCount ?? 0) >= 1
  );
}

export function filterPastWrongByListIds(words, listIds, wordListIndex = null) {
  return filterWordsByListIds(words, listIds, wordListIndex).filter(
    (item) => (item.wrongCount ?? 0) >= 1
  );
}

export function countWordsInListIds(countsByListId, listIds) {
  if (!listIds?.length) return 0;
  return listIds.reduce((sum, listId) => sum + (countsByListId.get(listId) || 0), 0);
}

export function sameListIdSet(left, right) {
  const a = [...(left || [])].sort();
  const b = [...(right || [])].sort();
  if (a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
}

export function getSessionListIds(session) {
  if (session?.listIds?.length) return session.listIds;
  if (session?.listId) return [session.listId];
  return [];
}

export function matchesBookPracticeListId(session, item, wordListIndex = null) {
  const listIds = getSessionListIds(session);
  if (!listIds.length) return true;
  return listIds.includes(resolveWordListId(item, wordListIndex));
}

export function getListReviewScopeLabel(listIds, availableLists) {
  if (!listIds?.length) return "复习";
  if (listIds.length === 1) return getListReviewLabel(listIds[0], availableLists);
  return `${listIds.length} 个列表`;
}

export function pickDefaultReviewListIds(countsByListId, availableLists, sessionListIds) {
  if (
    sessionListIds?.length &&
    sessionListIds.every((listId) => (countsByListId.get(listId) || 0) > 0)
  ) {
    return sessionListIds;
  }

  const listIds = availableLists
    .filter((item) => (countsByListId.get(item.id) || 0) > 0)
    .map((item) => item.id);

  if ((countsByListId.get(UNCategorized_LIST_ID) || 0) > 0) {
    listIds.push(UNCategorized_LIST_ID);
  }

  return listIds;
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
        words: items.sort((a, b) => (a.listIndex ?? 999999) - (b.listIndex ?? 999999)),
        wrongTotal,
      };
    });
}
