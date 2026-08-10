import readingVocabData from "../data/readingVocabMatch.json";

function normalizeCollections(data) {
  if (Array.isArray(data.collections) && data.collections.length > 0) {
    return data.collections;
  }
  if (Array.isArray(data.sets)) {
    return [{ id: "default", title: data.title || "新托福阅读词汇题", sets: data.sets }];
  }
  return [];
}

const collections = normalizeCollections(readingVocabData);

export function getReadingVocabCollections() {
  return collections;
}

export function getReadingVocabCollection(collectionIndex = 0) {
  const safeIndex = Math.max(0, Math.min(collectionIndex, collections.length - 1));
  return collections[safeIndex] ?? null;
}

export function getReadingVocabSets(collectionIndex = 0) {
  return getReadingVocabCollection(collectionIndex)?.sets ?? [];
}

export function getReadingVocabTitle(collectionIndex = 0) {
  return getReadingVocabCollection(collectionIndex)?.title ?? "阅读词汇题";
}

export function getSetDisplayLabel(set, setIndexInCollection) {
  if (set?.label) return set.label;
  return `第 ${setIndexInCollection + 1} 组`;
}

export function normalizeMatchText(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function pairKey(setId, pairIndex) {
  return `${setId}-${pairIndex}`;
}

export function shuffleArray(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getAllReadingVocabPairs(collectionIndex = 0) {
  return getReadingVocabSets(collectionIndex).flatMap((set) =>
    set.pairs.map((pair, index) => ({
      ...pair,
      id: pairKey(set.id, index),
      pairIndex: index,
      setId: set.id,
    }))
  );
}

export function buildSetRound(set) {
  const pairs = set.pairs.map((pair, index) => ({
    ...pair,
    id: pairKey(set.id, index),
    pairIndex: index,
    setId: set.id,
  }));

  return {
    setId: set.id,
    pairs,
    leftItems: shuffleArray(pairs.map((p) => ({ id: p.id, text: p.word, side: "left" }))),
    rightItems: shuffleArray(pairs.map((p) => ({ id: p.id, text: p.synonym, side: "right" }))),
  };
}

export function buildSetRoundFromOrder(set, leftItemIds, rightItemIds) {
  const pairs = set.pairs.map((pair, index) => ({
    ...pair,
    id: pairKey(set.id, index),
    pairIndex: index,
    setId: set.id,
  }));
  const pairById = new Map(pairs.map((pair) => [pair.id, pair]));

  const leftItems = leftItemIds
    .map((id) => pairById.get(id))
    .filter(Boolean)
    .map((pair) => ({ id: pair.id, text: pair.word, side: "left" }));

  const rightItems = rightItemIds
    .map((id) => pairById.get(id))
    .filter(Boolean)
    .map((pair) => ({ id: pair.id, text: pair.synonym, side: "right" }));

  if (leftItems.length !== pairs.length || rightItems.length !== pairs.length) {
    return buildSetRound(set);
  }

  return { setId: set.id, pairs, leftItems, rightItems };
}

export function restoreSetRound(set, savedSetProgress) {
  if (
    savedSetProgress?.leftItemIds?.length &&
    savedSetProgress?.rightItemIds?.length
  ) {
    return buildSetRoundFromOrder(set, savedSetProgress.leftItemIds, savedSetProgress.rightItemIds);
  }
  return buildSetRound(set);
}

export function buildFullRound(collectionIndex = 0) {
  const pairs = getAllReadingVocabPairs(collectionIndex);
  return {
    pairs,
    leftItems: shuffleArray(pairs.map((p) => ({ id: p.id, text: p.word, side: "left" }))),
    rightItems: shuffleArray(pairs.map((p) => ({ id: p.id, text: p.synonym, side: "right" }))),
  };
}

export const READING_VOCAB_TEST_SIZE = 16;

/** 综合测试：从当前合集全部题目中随机抽取一批，每次开始/重来都会重新抽取与打乱。 */
export function buildTestRound(sampleSize = READING_VOCAB_TEST_SIZE, collectionIndex = 0) {
  const allPairs = shuffleArray(getAllReadingVocabPairs(collectionIndex));
  const pairs = allPairs.slice(0, Math.min(sampleSize, allPairs.length));
  return {
    pairs,
    leftItems: shuffleArray(pairs.map((p) => ({ id: p.id, text: p.word, side: "left" }))),
    rightItems: shuffleArray(pairs.map((p) => ({ id: p.id, text: p.synonym, side: "right" }))),
  };
}

export function findPairById(round, pairId) {
  return round.pairs.find((pair) => pair.id === pairId) ?? null;
}

export function resolveWordData(word, wordBankMap) {
  const key = normalizeMatchText(word);
  const fromBank = wordBankMap?.get(key);
  if (fromBank?.definitions?.length) {
    return fromBank;
  }
  return { word, definitions: [] };
}
