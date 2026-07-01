function normalizeForCompare(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[，,。．.；;、！!？?"""''']/g, "");
}

function extractPosParts(definition) {
  const match = definition.trim().match(/^([a-z./]+)\.\s*/i);
  if (!match) return [];
  return match[1]
    .split("/")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function extractChinesePart(definition) {
  return definition.replace(/^[^.]+\.\s*/, "").trim();
}

function stripOptionalPos(answer) {
  return answer.replace(/^[a-z./]+\.\s*/i, "").trim();
}

const PAREN_INNER = /[（(]([^）)]*)[）)]/g;
const PAREN_SEGMENT = /[（(][^）)]*[）)]/g;

/** 括号内为可选补充：保留括号内容 / 去掉整段括号，都算有效义项。 */
function expandParentheticalVariants(text) {
  const variants = new Set();
  const base = normalizeForCompare(text);
  if (base) variants.add(base);

  const withContent = normalizeForCompare(text.replace(PAREN_INNER, "$1"));
  if (withContent) variants.add(withContent);

  const withoutParens = normalizeForCompare(text.replace(PAREN_SEGMENT, ""));
  if (withoutParens) variants.add(withoutParens);

  return variants;
}

function addMeaningVariants(variants, text) {
  if (!text?.trim()) return;
  for (const variant of expandParentheticalVariants(text)) {
    if (variant) variants.add(variant);
  }
}

function collectAllowedLatinTokens(definitions) {
  const allowed = new Set();

  for (const definition of definitions) {
    for (const part of extractPosParts(definition)) {
      allowed.add(part);
    }

    const inlineLatin = definition.match(/[a-zA-Z]{2,}/g) || [];
    for (const token of inlineLatin) {
      allowed.add(token.toLowerCase());
    }
  }

  return allowed;
}

function extractAnswerLatinTokens(answer) {
  return (answer.match(/[a-zA-Z]+/g) || []).map((token) => token.toLowerCase());
}

const TRIVIAL_ANSWER_WORDS = new Set([
  "a",
  "an",
  "the",
  "to",
  "of",
  "is",
  "are",
  "was",
  "be",
  "means",
  "mean",
  "word",
  "this",
  "that",
  "it",
  "its",
  "n",
  "v",
  "adj",
  "adv",
  "prep",
]);

function tokenMatchesTargetWord(token, target) {
  if (token === target) return true;
  if (target.length > 2 && token === `${target}s`) return true;
  if (target.length > 3 && token === `${target}ed`) return true;
  if (target.length > 3 && token === `${target}ing`) return true;
  if (token.startsWith(target) && token.length <= target.length + 2) return true;
  return false;
}

/** 用本题英文单词本身作答，等同未掌握释义。 */
export function isUsingTargetWordItself(userAnswer, word) {
  const target = normalizeForCompare(word);
  if (!target || target.length < 2) return false;

  const stripped = stripOptionalPos(userAnswer).trim();
  if (!stripped) return false;

  if (normalizeForCompare(stripped) === target) return true;

  const latinTokens = extractAnswerLatinTokens(stripped);
  if (latinTokens.length === 0) return false;

  const substantive = latinTokens.filter(
    (token) => !TRIVIAL_ANSWER_WORDS.has(token) && token.length > 1
  );
  if (substantive.length === 0) return false;

  return substantive.every((token) => tokenMatchesTargetWord(token, target));
}

function isAllowedLatinToken(token, allowed) {
  if (allowed.has(token)) return true;
  return [...allowed].some((part) => part.startsWith(token) || token.startsWith(part));
}

function isPureEnglishAnswer(answer) {
  const stripped = stripOptionalPos(answer).trim();
  if (!stripped) return false;
  return /^[a-zA-Z\s.,;/-]+$/.test(stripped);
}

function matchesEnglishGloss(answer, definitions) {
  if (!isPureEnglishAnswer(answer)) return false;

  const normalizedAnswer = normalizeForCompare(stripOptionalPos(answer));
  if (!normalizedAnswer) return false;

  const answerTokens = extractAnswerLatinTokens(answer);
  if (answerTokens.length === 0) return false;

  const allowed = collectAllowedLatinTokens(definitions);
  return answerTokens.every((token) => isAllowedLatinToken(token, allowed));
}

function hasUnexpectedDigits(answer, definitions) {
  const answerDigits = answer.match(/\d+/g) || [];
  if (answerDigits.length === 0) return false;

  const definitionDigits = definitions.join(" ").match(/\d+/g) || [];
  return answerDigits.some((digit) => !definitionDigits.includes(digit));
}

function matchesFullDefinitionLine(answer, definitions) {
  const normalizedAnswer = normalizeForCompare(answer);
  if (!normalizedAnswer) return false;

  return definitions.some((definition) => normalizeForCompare(definition) === normalizedAnswer);
}

function getCommaSeparatedParts(definition) {
  const chinese = extractChinesePart(definition);
  if (/…|\.\.\./.test(chinese)) return null;

  const parts = chinese.split(/[,，、；]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  if (!parts.every((part) => normalizeForCompare(part).length >= 2)) return null;

  return parts;
}

function getPartVariantSets(parts) {
  return parts.map((part) => {
    const variants = new Set();
    addMeaningVariants(variants, part);
    return variants;
  });
}

function splitAnswerSegments(answer) {
  const stripped = stripOptionalPos(answer).trim();
  if (!stripped) return [];

  const segments = stripped.split(/[,，;；、\s]+/).map((part) => part.trim()).filter(Boolean);
  return segments.length > 0 ? segments : [stripped];
}

function segmentMatchesVariants(segment, variants) {
  const normalized = normalizeForCompare(stripOptionalPos(segment));
  if (!normalized) return false;
  return [...variants].some((variant) => variant && normalized === variant);
}

function cartesianProduct(arrays) {
  return arrays.reduce(
    (acc, curr) => acc.flatMap((prefix) => curr.map((value) => [...prefix, value])),
    [[]]
  );
}

function permuteIndices(length) {
  if (length <= 1) return [[0]];
  const result = [];
  function walk(prefix, remaining) {
    if (remaining.length === 0) {
      result.push(prefix);
      return;
    }
    for (let i = 0; i < remaining.length; i++) {
      walk([...prefix, remaining[i]], [...remaining.slice(0, i), ...remaining.slice(i + 1)]);
    }
  }
  walk([], [...Array(length).keys()]);
  return result;
}

function matchesConcatenatedParts(normalizedAnswer, partVariantSets) {
  const lists = partVariantSets.map((set) => [...set].filter(Boolean));
  if (lists.some((list) => list.length === 0)) return false;

  for (const order of permuteIndices(lists.length)) {
    const orderedLists = order.map((index) => lists[index]);
    for (const combo of cartesianProduct(orderedLists)) {
      if (combo.join("") === normalizedAnswer) return true;
    }
  }
  return false;
}

function matchesAllChineseParts(answer, parts) {
  const partVariantSets = getPartVariantSets(parts);
  const segments = splitAnswerSegments(answer);

  if (segments.length >= parts.length) {
    const used = new Set();
    for (const variants of partVariantSets) {
      let matched = false;
      for (let i = 0; i < segments.length; i++) {
        if (used.has(i)) continue;
        if (segmentMatchesVariants(segments[i], variants)) {
          used.add(i);
          matched = true;
          break;
        }
      }
      if (!matched) return false;
    }
    return used.size === segments.length;
  }

  if (segments.length === 1) {
    const normalized = normalizeForCompare(stripOptionalPos(segments[0]));
    if (!normalized) return false;
    return matchesConcatenatedParts(normalized, partVariantSets);
  }

  return false;
}

function matchesMultiPartChineseDefinition(answer, definitions) {
  return definitions.some((definition) => {
    const parts = getCommaSeparatedParts(definition);
    if (!parts) return false;
    return matchesAllChineseParts(answer, parts);
  });
}

function getChineseMeaningVariants(definition) {
  const chinese = extractChinesePart(definition);
  const variants = new Set();
  addMeaningVariants(variants, chinese);

  // 「讲，为……作解说」这类逗号是句内停顿，不是并列义项
  if (/…|\.\.\./.test(chinese)) {
    return [...variants];
  }

  const parts = chinese.split(/[,，、；]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1 && parts.every((part) => normalizeForCompare(part).length >= 2)) {
    for (const part of parts) {
      addMeaningVariants(variants, part);
    }
  }

  return [...variants];
}

function matchesChineseDefinition(answer, definitions) {
  const normalizedAnswer = normalizeForCompare(stripOptionalPos(answer));
  if (!normalizedAnswer) return false;

  if (matchesMultiPartChineseDefinition(answer, definitions)) return true;

  return definitions.some((definition) =>
    getChineseMeaningVariants(definition).some(
      (variant) => variant && normalizedAnswer === variant
    )
  );
}

function matchesDefinitionLine(userAnswer, definition) {
  const answer = userAnswer.trim();
  if (!answer || !definition) return false;

  const definitions = [definition];
  if (hasUnexpectedDigits(answer, definitions)) return false;

  return (
    matchesFullDefinitionLine(answer, definitions) ||
    matchesChineseDefinition(answer, definitions) ||
    matchesEnglishGloss(answer, definitions)
  );
}

/** 分析用户答案覆盖了书上哪些义项（definitions 数组每一项为一个义项）。 */
export function analyzeDefinitionCoverage(userAnswer, definitions) {
  if (!definitions?.length) {
    return {
      matchedIndices: [],
      missedIndices: [],
      isCorrect: false,
      isPartial: false,
    };
  }

  const matchedIndices = [];
  const missedIndices = [];

  for (let i = 0; i < definitions.length; i++) {
    if (matchesDefinitionLine(userAnswer, definitions[i])) {
      matchedIndices.push(i);
    } else {
      missedIndices.push(i);
    }
  }

  return {
    matchedIndices,
    missedIndices,
    isCorrect: matchedIndices.length > 0,
    isPartial: matchedIndices.length > 0 && missedIndices.length > 0,
  };
}

export function enrichResultWithDefinitionCoverage(result, userAnswer, definitions) {
  if (!result?.is_correct || !definitions?.length) return result;

  const coverage = analyzeDefinitionCoverage(userAnswer, definitions);
  if (!coverage.isCorrect) return result;

  const partial = coverage.isPartial;
  let ai_feedback = result.ai_feedback || "正确！";
  if (partial && !/义项|其它|其他/.test(ai_feedback)) {
    ai_feedback =
      ai_feedback === "正确！" || ai_feedback === "批改完成。"
        ? "这个意思对了！书上还有其它义项，请看高亮提醒。"
        : `${ai_feedback} 书上还有其它义项未答到，已高亮提醒。`;
  }

  return {
    ...result,
    ai_feedback,
    matched_definition_indices: coverage.matchedIndices,
    missed_definition_indices: coverage.missedIndices,
    partial_meaning: partial,
  };
}

/**
 * 用户可用中文释义，也可用英文同义词/近义词解释（如 severe → serious）。
 * 与标准释义中任意一条义项一致即可判对。
 */
export function matchesStandardMeaning(userAnswer, definitions) {
  const answer = userAnswer.trim();
  if (!answer || !definitions?.length) return false;

  if (hasUnexpectedDigits(answer, definitions)) return false;

  return analyzeDefinitionCoverage(answer, definitions).isCorrect;
}

export const TARGET_WORD_ITSELF_MESSAGE =
  "不能用单词本身来解释这个词，请用中文释义或别的英文近义词。";

/** 明显乱答（乱码、照抄原词等），本地直接判错，不调用 AI。 */
export function isObviouslyWrong(userAnswer, definitions, word = "") {
  const answer = userAnswer.trim();
  if (!answer || !definitions?.length) return false;

  if (word && isUsingTargetWordItself(answer, word)) return true;

  return hasUnexpectedDigits(answer, definitions);
}

export function buildLocalCorrectResult(coverage) {
  const partial = coverage?.isPartial;
  return {
    is_correct: true,
    ai_feedback: partial
      ? "这个意思对了！书上还有其它义项，请看高亮提醒。"
      : "正确！",
    matched_locally: true,
    matched_definition_indices: coverage?.matchedIndices ?? [],
    missed_definition_indices: coverage?.missedIndices ?? [],
    partial_meaning: Boolean(partial),
  };
}

export function buildLocalWrongResult(message) {
  return {
    is_correct: false,
    ai_feedback: message,
    matched_locally: true,
  };
}
