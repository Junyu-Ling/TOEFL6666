function normalizeWord(word = "") {
  return String(word).toLowerCase().replace(/[^a-z]/g, "");
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return row[b.length];
}

function extractAnswerEnglishTokens(answer = "") {
  return [...new Set(String(answer).match(/[a-zA-Z]{3,}/g)?.map((t) => t.toLowerCase()) || [])];
}

function scoreConfusionCandidate(word, targetWord, answerTokens) {
  const normalized = normalizeWord(word);
  const target = normalizeWord(targetWord);
  if (!normalized || normalized === target) return 0;

  let score = 0;
  const distance = levenshtein(normalized, target);

  if (distance <= 3) score += 12 - distance * 3;
  if (Math.abs(normalized.length - target.length) <= 2) score += 2;

  const prefixLen = Math.min(4, normalized.length, target.length);
  if (prefixLen >= 3 && normalized.slice(0, prefixLen) === target.slice(0, prefixLen)) {
    score += 4;
  }

  const suffixLen = Math.min(4, normalized.length, target.length);
  if (suffixLen >= 3 && normalized.slice(-suffixLen) === target.slice(-suffixLen)) {
    score += 3;
  }

  for (const token of answerTokens) {
    if (token === normalized) score += 10;
    else if (levenshtein(token, normalized) <= 1) score += 7;
  }

  return score;
}

function toCompactEntry(item) {
  if (!item?.word) return null;
  const definitions = Array.isArray(item.definitions)
    ? item.definitions.filter(Boolean)
    : [];
  return {
    word: item.word,
    definitions,
  };
}

/** 从熟词本挑选可能与当前题/用户答案混淆的词条，供 AI 优先引用。 */
export function buildRecognizedConfusionContext(recognizedList, targetWord, userAnswer, { maxEntries = 48 } = {}) {
  const list = Array.isArray(recognizedList) ? recognizedList : [];
  const answerTokens = extractAnswerEnglishTokens(userAnswer);
  const compact = list.map(toCompactEntry).filter(Boolean);

  if (compact.length === 0) return [];

  if (compact.length <= maxEntries) {
    return compact.filter((item) => normalizeWord(item.word) !== normalizeWord(targetWord));
  }

  const scored = compact
    .map((item) => ({
      item,
      score: scoreConfusionCandidate(item.word, targetWord, answerTokens),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxEntries)
    .map(({ item }) => item);

  if (scored.length > 0) return scored;

  return compact
    .filter((item) => normalizeWord(item.word) !== normalizeWord(targetWord))
    .slice(0, maxEntries);
}

export function formatRecognizedConfusionContext(recognizedVocabulary = []) {
  if (!recognizedVocabulary.length) {
    return "（熟词本为空或未提供）";
  }

  return recognizedVocabulary
    .map((item) => {
      const defs = (item.definitions || []).filter(Boolean).join("；") || "（无释义）";
      return `- ${item.word}：${defs}`;
    })
    .join("\n");
}
