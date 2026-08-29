import {
  getLexGridLevelLabel,
  getLexGridLevels,
  pickRandomLexGridWord,
} from "./lexGrid.js";

export const HANGMAN_MIN_LEN = 4;
export const HANGMAN_MAX_LEN = 12;
export const HANGMAN_MAX_MISSES = 6;

export function getHangmanLevelLabel(appMode) {
  return getLexGridLevelLabel(appMode);
}

export function buildHangmanPool(words, availableLists, appMode = "toefl") {
  const allowedLevels = new Set(getLexGridLevels(appMode));
  const levelByListId = new Map(availableLists.map((item) => [item.id, item.level]));

  return words.filter((item) => {
    const level = levelByListId.get(item.sourceListId);
    if (!level || !allowedLevels.has(level)) return false;

    const word = String(item.word || "").trim();
    if (!/^[a-zA-Z]+$/.test(word)) return false;

    const len = word.length;
    return len >= HANGMAN_MIN_LEN && len <= HANGMAN_MAX_LEN;
  });
}

export function createHangmanRound(pool) {
  const target = pickRandomLexGridWord(pool);
  if (!target) return null;

  const word = target.word.toLowerCase();
  return {
    target,
    word,
    guessed: {},
    misses: 0,
    status: "playing",
  };
}

export function applyHangmanGuess(round, letter) {
  if (!round || round.status !== "playing") return round;
  const ch = String(letter || "").toLowerCase();
  if (!/^[a-z]$/.test(ch) || round.guessed[ch]) return round;

  const hit = round.word.includes(ch);
  const guessed = { ...round.guessed, [ch]: hit ? "correct" : "absent" };
  const misses = hit ? round.misses : round.misses + 1;
  const revealed = [...round.word].every((letter) => guessed[letter] === "correct");
  const lost = !revealed && misses >= HANGMAN_MAX_MISSES;

  return {
    ...round,
    guessed,
    misses,
    status: revealed ? "won" : lost ? "lost" : "playing",
  };
}

export function hangmanSlots(round) {
  if (!round) return [];
  const showAll = round.status === "lost";
  return [...round.word].map((letter) => ({
    letter,
    revealed: round.guessed[letter] === "correct" || showAll,
    missed: showAll && round.guessed[letter] !== "correct",
  }));
}
