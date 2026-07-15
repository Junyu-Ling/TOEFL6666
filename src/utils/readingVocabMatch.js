import readingVocabData from "../data/readingVocabMatch.json";

export function getReadingVocabSets() {
  return readingVocabData.sets;
}

export function getReadingVocabTitle() {
  return readingVocabData.title;
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

export function getAllReadingVocabPairs() {
  return readingVocabData.sets.flatMap((set) =>
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

export function buildFullRound() {
  const pairs = getAllReadingVocabPairs();
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
