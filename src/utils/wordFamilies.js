const MIN_ROOT_LEN = 4;

const FAMILY_SUFFIXES = [
  "isation",
  "ization",
  "fulness",
  "lessness",
  "ibility",
  "ability",
  "ation",
  "ition",
  "ution",
  "sion",
  "tion",
  "ment",
  "ness",
  "ship",
  "ward",
  "wise",
  "ance",
  "ence",
  "able",
  "ible",
  "ical",
  "ious",
  "eous",
  "ive",
  "ous",
  "ist",
  "ism",
  "ant",
  "ent",
  "ful",
  "ing",
  "ied",
  "ies",
  "ied",
  "ed",
  "er",
  "ly",
  "al",
  "en",
  "es",
  "s",
  "y",
  "ate",
];

function normalizeWord(word = "") {
  return String(word).trim().toLowerCase();
}

function isMorphologicalDerivative(root, word) {
  if (word === root) return true;
  if (!word.startsWith(root)) return false;
  const rest = word.slice(root.length);
  if (!rest) return false;
  return FAMILY_SUFFIXES.includes(rest);
}

function getMorphologicalFamily(prefix, allWords) {
  const members = [];
  for (const word of allWords) {
    if (isMorphologicalDerivative(prefix, word)) {
      members.push(word);
    }
  }
  return members;
}

/**
 * @param {string} word
 * @param {Set<string>} wordSet
 */
export function resolveBankFamilyRoot(word, wordSet) {
  const w = normalizeWord(word);
  if (!w) return w;

  for (const suffix of FAMILY_SUFFIXES) {
    if (!w.endsWith(suffix) || w.length <= suffix.length + MIN_ROOT_LEN - 1) continue;

    let stem = w.slice(0, -suffix.length);

    if (suffix === "ies" && wordSet.has(`${stem}y`)) {
      return resolveBankFamilyRoot(`${stem}y`, wordSet);
    }

    if (wordSet.has(stem)) {
      return resolveBankFamilyRoot(stem, wordSet);
    }

    if (stem.length > 2 && stem.endsWith(stem.slice(-1))) {
      const undoubled = stem.slice(0, -1);
      if (wordSet.has(undoubled)) {
        return resolveBankFamilyRoot(undoubled, wordSet);
      }
    }
  }

  for (let len = w.length - 1; len >= MIN_ROOT_LEN; len--) {
    const prefix = w.slice(0, len);
    if (wordSet.has(prefix)) {
      return resolveBankFamilyRoot(prefix, wordSet);
    }
  }

  return w;
}

function resolveSharedPrefixRoot(word, allWords) {
  const w = normalizeWord(word);
  let best = w;
  let bestMembers = null;

  for (let len = MIN_ROOT_LEN; len <= w.length; len++) {
    const prefix = w.slice(0, len);
    const members = getMorphologicalFamily(prefix, allWords);
    if (members.length < 2) continue;

    if (
      !bestMembers ||
      members.length > bestMembers.length ||
      (members.length === bestMembers.length && len < best.length)
    ) {
      best = prefix;
      bestMembers = members;
    }
  }

  return bestMembers ? best : w;
}

/**
 * @param {string} word
 * @param {Set<string>} wordSet
 * @param {string[]} allWords
 */
export function resolveFamilyRoot(word, wordSet, allWords) {
  const w = normalizeWord(word);
  const bankRoot = resolveBankFamilyRoot(w, wordSet);
  if (bankRoot !== w) return bankRoot;
  return resolveSharedPrefixRoot(w, allWords);
}

/** @deprecated alias */
export function resolveFamilyRootLegacy(word, wordSet) {
  return resolveBankFamilyRoot(word, wordSet);
}

/**
 * @param {{ word: string }[]} words
 */
export function buildWordFamilyMap(words) {
  const normalizedWords = words.map((item) => normalizeWord(item.word));
  const wordSet = new Set(normalizedWords);
  const rootByWord = new Map();

  for (const item of words) {
    const key = normalizeWord(item.word);
    rootByWord.set(key, resolveFamilyRoot(key, wordSet, normalizedWords));
  }

  const families = new Map();
  for (const item of words) {
    const key = normalizeWord(item.word);
    const root = rootByWord.get(key) || key;
    if (!families.has(root)) families.set(root, []);
    families.get(root).push(item);
  }

  for (const members of families.values()) {
    members.sort((a, b) => {
      const lenDiff = a.word.length - b.word.length;
      if (lenDiff !== 0) return lenDiff;
      return a.word.localeCompare(b.word, "en");
    });
  }

  return families;
}

/**
 * @param {{ word: string }[]} words
 * @returns {{ root: string, words: { word: string }[] }[]}
 */
export function getWordFamilyGroups(words) {
  const families = buildWordFamilyMap(words);
  return [...families.entries()]
    .filter(([, members]) => members.length >= 2)
    .map(([root, members]) => ({ root, words: members }))
    .sort((a, b) => a.root.localeCompare(b.root, "en"));
}

/**
 * @param {{ word: string }[]} words
 * @param {Map<string, string>} wordToRoot
 */
export function groupBankWordsByFamily(words, wordToRoot) {
  const groups = new Map();

  for (const item of words) {
    const root = wordToRoot.get(normalizeWord(item.word));
    if (!root) continue;
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(item);
  }

  return [...groups.entries()]
    .map(([root, members]) => ({
      root,
      label: members.map((m) => m.word).join(" · "),
      words: [...members].sort((a, b) => {
        const lenDiff = a.word.length - b.word.length;
        if (lenDiff !== 0) return lenDiff;
        return a.word.localeCompare(b.word, "en");
      }),
    }))
    .sort((a, b) => a.root.localeCompare(b.root, "en"));
}
