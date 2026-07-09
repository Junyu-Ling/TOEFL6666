export const LEXGRID_LEVELS = [1, 2, 3, 4];
export const LEXGRID_MIN_LEN = 4;
export const LEXGRID_MAX_LEN = 8;

export const TILE_STATES = {
  empty: "empty",
  correct: "correct",
  present: "present",
  absent: "absent",
};

const KEY_RANK = { absent: 0, present: 1, correct: 2 };

const KEYBOARD_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["enter", "z", "x", "c", "v", "b", "n", "m", "backspace"],
];

export function getKeyboardRows() {
  return KEYBOARD_ROWS;
}

export function getMaxGuesses(wordLength) {
  return Math.max(6, wordLength + 1);
}

export function buildLexGridPool(words, availableLists, levels = LEXGRID_LEVELS) {
  const allowedLevels = new Set(levels);
  const levelByListId = new Map(availableLists.map((item) => [item.id, item.level]));

  return words.filter((item) => {
    const level = levelByListId.get(item.sourceListId);
    if (!level || !allowedLevels.has(level)) return false;

    const word = String(item.word || "").trim();
    if (!/^[a-zA-Z]+$/.test(word)) return false;

    const len = word.length;
    return len >= LEXGRID_MIN_LEN && len <= LEXGRID_MAX_LEN;
  });
}

export function pickRandomLexGridWord(pool) {
  if (!pool?.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Wordle 规则：绿 > 黄 > 灰，重复字母按频次计算 */
export function evaluateGuess(guess, target) {
  const g = guess.toLowerCase();
  const t = target.toLowerCase();
  const result = Array(g.length).fill(TILE_STATES.absent);
  const remaining = {};

  for (let i = 0; i < t.length; i++) {
    if (g[i] === t[i]) {
      result[i] = TILE_STATES.correct;
    } else {
      remaining[t[i]] = (remaining[t[i]] || 0) + 1;
    }
  }

  for (let i = 0; i < g.length; i++) {
    if (result[i] === TILE_STATES.correct) continue;
    const letter = g[i];
    if (remaining[letter] > 0) {
      result[i] = TILE_STATES.present;
      remaining[letter]--;
    }
  }

  return result;
}

export function mergeKeyStates(current, guess, evaluation) {
  const next = { ...current };
  for (let i = 0; i < guess.length; i++) {
    const letter = guess[i].toLowerCase();
    const state = evaluation[i];
    if (!(state in KEY_RANK)) continue;
    if (!next[letter] || KEY_RANK[state] > KEY_RANK[next[letter]]) {
      next[letter] = state;
    }
  }
  return next;
}

export function buildWordBankSet(words) {
  const set = new Set();
  for (const item of words || []) {
    const word = String(item.word || "").trim().toLowerCase();
    if (word) set.add(word);
  }
  return set;
}

export async function validateGuessWord(guess, bankSet, { validateRemote, cache, signal } = {}) {
  const word = String(guess || "").trim().toLowerCase();
  if (!word) return { valid: false, source: "empty" };

  if (bankSet?.has(word)) {
    return { valid: true, source: "bank" };
  }

  if (cache?.has(word)) {
    return cache.get(word);
  }

  if (!validateRemote) {
    return { valid: false, source: "missing" };
  }

  const remote = await validateRemote(word, { signal });
  const result = { valid: Boolean(remote?.valid), source: "ai" };
  cache?.set(word, result);
  return result;
}

export function createLexGridRound(pool) {
  const target = pickRandomLexGridWord(pool);
  if (!target) return null;

  const word = target.word.toLowerCase();
  return {
    target,
    wordLength: word.length,
    maxGuesses: getMaxGuesses(word.length),
    rows: [],
    currentGuess: "",
    status: "playing",
    keyStates: {},
    shake: false,
    revealingRow: null,
    validating: false,
    invalidMsg: null,
    recallHint: null,
  };
}
