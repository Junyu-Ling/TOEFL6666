import phoneticData from "../data/phonetics.json";
import { matchesStandardMeaning } from "../services/localMatch.js";
import {
  detectHomophoneTypo,
  buildTypoClarificationQuestion,
} from "../shared/homophoneTypo.js";

function normalizeIpaKey(ipa) {
  return String(ipa || "")
    .replace(/[/[\]ˈˌ\u0329\s.·-]/g, "")
    .toLowerCase();
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

const ipaIndex = new Map();

for (const [word, ipa] of Object.entries(phoneticData.phonetics || {})) {
  if (!ipa) continue;
  const key = normalizeIpaKey(ipa);
  if (!key) continue;
  if (!ipaIndex.has(key)) ipaIndex.set(key, []);
  ipaIndex.get(key).push(word);
}

export function buildWordBankMap(words = []) {
  const map = new Map();
  for (const item of words) {
    if (!item?.word) continue;
    map.set(item.word.toLowerCase(), item);
  }
  return map;
}

export function getSimilarSoundWords(word, { maxDistance = 1 } = {}) {
  const normalized = String(word || "").trim().toLowerCase();
  const ipa = phoneticData.phonetics?.[normalized];
  if (!ipa) return [];

  const key = normalizeIpaKey(ipa);
  if (!key) return [];

  const results = new Set();

  for (const candidate of ipaIndex.get(key) || []) {
    if (candidate.toLowerCase() !== normalized) results.add(candidate);
  }

  if (maxDistance <= 0) return [...results];

  for (const [otherKey, candidates] of ipaIndex) {
    if (otherKey === key) continue;
    if (Math.abs(otherKey.length - key.length) > maxDistance + 1) continue;
    if (levenshtein(key, otherKey) > maxDistance) continue;
    for (const candidate of candidates) {
      if (candidate.toLowerCase() !== normalized) results.add(candidate);
    }
  }

  return [...results];
}

/**
 * 在判错前检查：中文同音错字，或释义命中读音相近的另一词。
 */
export function detectAnswerConfusion(targetWord, targetDefinitions, userAnswer, wordBankMap) {
  const typoInfo = detectHomophoneTypo(userAnswer, targetDefinitions);
  if (typoInfo) {
    return { type: "chinese_typo", typoInfo };
  }

  if (!wordBankMap?.size) return null;

  const similarWords = getSimilarSoundWords(targetWord, { maxDistance: 1 });
  for (const otherWord of similarWords) {
    const entry = wordBankMap.get(otherWord.toLowerCase());
    if (!entry?.definitions?.length) continue;
    if (matchesStandardMeaning(userAnswer, entry.definitions)) {
      return {
        type: "homophone_meaning",
        confusedWord: entry.word,
        confusedDefinitions: entry.definitions,
      };
    }
  }

  return null;
}

export function buildConfusionQuestion(targetWord, confusion) {
  if (confusion?.type === "chinese_typo") {
    return buildTypoClarificationQuestion(targetWord, confusion.typoInfo);
  }

  if (confusion?.type === "homophone_meaning") {
    const defs = confusion.confusedDefinitions.slice(0, 2).join("；");
    return `你的意思更像「${confusion.confusedWord}」（${defs}），和「${targetWord}」读音很接近。是打错字了，还是其实不认识 ${targetWord}？`;
  }

  return buildTypoClarificationQuestion(targetWord, null);
}

export function buildConfusionClarificationResult(targetWord, targetDefinitions, userAnswer, confusion) {
  const question = buildConfusionQuestion(targetWord, confusion);

  if (confusion?.type === "chinese_typo") {
    return {
      is_correct: false,
      needs_typo_clarification: true,
      typo_clarification_question: question,
      typo_match: confusion.typoInfo,
      matched_locally: true,
    };
  }

  if (confusion?.type === "homophone_meaning") {
    return {
      is_correct: false,
      needs_typo_clarification: true,
      typo_clarification_question: question,
      typo_match: {
        confusedWord: confusion.confusedWord,
        confusedDefinitions: confusion.confusedDefinitions,
        got: userAnswer.trim(),
      },
      matched_locally: true,
    };
  }

  return null;
}

export function applyConfusionToWrongResult(result, targetWord, targetDefinitions, userAnswer, wordBankMap) {
  if (result?.is_correct || result?.needs_typo_clarification) return result;

  const confusion = detectAnswerConfusion(targetWord, targetDefinitions, userAnswer, wordBankMap);
  if (!confusion) return result;

  const clarification = buildConfusionClarificationResult(
    targetWord,
    targetDefinitions,
    userAnswer,
    confusion
  );
  if (!clarification) return result;

  return {
    ...result,
    ...clarification,
    ai_feedback: result.ai_feedback || clarification.typo_clarification_question,
  };
}
