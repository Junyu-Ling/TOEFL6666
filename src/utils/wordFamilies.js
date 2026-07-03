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
  "ize",
  "ise",
  "ify",
];

function normalizeWord(word = "") {
  return String(word).trim().toLowerCase();
}

/** 词根在接后缀前的常见拼写变体（如 acquire → acquis + ition） */
function expandRootToStems(root) {
  const stems = new Set([root]);

  if (root.endsWith("e")) {
    stems.add(root.slice(0, -1));
  }

  if (root.endsWith("ire")) {
    stems.add(root.slice(0, -3) + "is");
  }

  if (root.endsWith("ade")) {
    stems.add(root.slice(0, -2) + "s");
  } else if (root.endsWith("de")) {
    stems.add(root.slice(0, -2) + "s");
  }

  if (root.endsWith("ce")) {
    stems.add(root.slice(0, -1) + "t");
  }

  if (root.endsWith("y")) {
    stems.add(root.slice(0, -1) + "i");
  }

  return [...stems];
}

function expandStemToRoots(stem) {
  const roots = new Set([stem, `${stem}e`]);

  if (stem.endsWith("is")) {
    roots.add(`${stem.slice(0, -2)}ire`);
  }

  if (stem.endsWith("as")) {
    roots.add(`${stem.slice(0, -1)}de`);
    roots.add(`${stem}e`);
  }

  if (stem.endsWith("s") && !stem.endsWith("ss")) {
    roots.add(`${stem.slice(0, -1)}de`);
  }

  if (stem.endsWith("t") && !stem.endsWith("tt")) {
    roots.add(`${stem}e`);
  }

  return [...roots];
}

function isMorphologicalDerivative(root, word) {
  for (const stem of expandRootToStems(root)) {
    if (word === stem) return true;
    if (!word.startsWith(stem)) continue;
    const rest = word.slice(stem.length);
    if (rest && FAMILY_SUFFIXES.includes(rest)) return true;
  }
  return false;
}

function isCandidateFamilyRoot(prefix, allWords, wordSet) {
  if (wordSet.has(prefix)) return true;
  for (const word of allWords) {
    if (expandRootToStems(word).includes(prefix)) return true;
  }
  return getMorphologicalFamily(prefix, allWords).length >= 2;
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
export function resolveBankFamilyRoot(word, wordSet, allWords = []) {
  const w = normalizeWord(word);
  if (!w) return w;

  for (const suffix of FAMILY_SUFFIXES) {
    if (!w.endsWith(suffix) || w.length <= suffix.length + MIN_ROOT_LEN - 1) continue;

    let stem = w.slice(0, -suffix.length);

    if (suffix === "ies" && wordSet.has(`${stem}y`)) {
      return resolveBankFamilyRoot(`${stem}y`, wordSet, allWords);
    }

    if (wordSet.has(stem)) {
      return resolveBankFamilyRoot(stem, wordSet, allWords);
    }

    for (const candidate of expandStemToRoots(stem)) {
      if (wordSet.has(candidate)) {
        return resolveBankFamilyRoot(candidate, wordSet, allWords);
      }
    }

    if (getMorphologicalFamily(stem, allWords).length >= 2) {
      return stem;
    }

    if (stem.length > 2 && stem.endsWith(stem.slice(-1))) {
      const undoubled = stem.slice(0, -1);
      if (wordSet.has(undoubled)) {
        return resolveBankFamilyRoot(undoubled, wordSet, allWords);
      }
    }
  }

  for (let len = w.length - 1; len >= MIN_ROOT_LEN; len--) {
    const prefix = w.slice(0, len);
    if (wordSet.has(prefix)) {
      return resolveBankFamilyRoot(prefix, wordSet, allWords);
    }
  }

  return w;
}

function resolveSharedPrefixRoot(word, allWords, wordSet) {
  const w = normalizeWord(word);
  let best = w;
  let bestMembers = null;

  for (let len = MIN_ROOT_LEN; len <= w.length; len++) {
    const prefix = w.slice(0, len);
    if (!isCandidateFamilyRoot(prefix, allWords, wordSet)) continue;

    const members = getMorphologicalFamily(prefix, allWords);
    if (members.length < 2) continue;

    if (
      !bestMembers ||
      members.length > bestMembers.length ||
      (members.length === bestMembers.length &&
        (wordSet.has(prefix) && !wordSet.has(best) ? true : len > best.length))
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
  const bankRoot = resolveBankFamilyRoot(w, wordSet, allWords);
  if (bankRoot !== w) return bankRoot;
  return resolveSharedPrefixRoot(w, allWords, wordSet);
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
