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

/**
 * 用户可用中文释义，也可用英文同义词/近义词解释（如 severe → serious）。
 * 与标准释义一致、或命中逗号分隔义项时本地判对。
 * 多个并列义项可任意顺序、任意常见分隔符作答，连写也算对。
 * 释义中括号内为可选补充，漏答括号内容仍算对。
 */
export function matchesStandardMeaning(userAnswer, definitions) {
  const answer = userAnswer.trim();
  if (!answer || !definitions?.length) return false;

  if (hasUnexpectedDigits(answer, definitions)) return false;

  return (
    matchesFullDefinitionLine(answer, definitions) ||
    matchesChineseDefinition(answer, definitions) ||
    matchesEnglishGloss(answer, definitions)
  );
}

/** 明显乱答（乱码等），本地直接判错，不调用 AI。英文释义交给 AI 判断，不在此拦截。 */
export function isObviouslyWrong(userAnswer, definitions) {
  const answer = userAnswer.trim();
  if (!answer || !definitions?.length) return false;

  return hasUnexpectedDigits(answer, definitions);
}

export function buildLocalCorrectResult() {
  return {
    is_correct: true,
    ai_feedback: "正确！",
    matched_locally: true,
  };
}

export function buildLocalWrongResult(message) {
  return {
    is_correct: false,
    ai_feedback: message,
    matched_locally: true,
  };
}
