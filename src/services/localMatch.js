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

function hasUnexpectedLatin(answer, definitions) {
  const allowed = collectAllowedLatinTokens(definitions);
  return extractAnswerLatinTokens(answer).some((token) => !isAllowedLatinToken(token, allowed));
}

function hasUnexpectedDigits(answer, definitions) {
  const answerDigits = answer.match(/\d+/g) || [];
  if (answerDigits.length === 0) return false;

  const definitionDigits = definitions.join(" ").match(/\d+/g) || [];
  return answerDigits.some((digit) => !definitionDigits.includes(digit));
}

function isExactDefinitionMatch(answer, definitions) {
  const normalizedAnswer = normalizeForCompare(answer);
  if (!normalizedAnswer) return false;

  return definitions.some((definition) => normalizeForCompare(definition) === normalizedAnswer);
}

/**
 * 仅在用户回答与某条标准释义（含词性标记）完全一致，且没有多余英文/数字杂质时，
 * 才跳过 AI。其余情况一律交给 AI 判定。
 */
export function matchesStandardMeaning(userAnswer, definitions) {
  const answer = userAnswer.trim();
  if (!answer || answer.length < 2 || !definitions?.length) return false;

  if (hasUnexpectedLatin(answer, definitions)) return false;
  if (hasUnexpectedDigits(answer, definitions)) return false;

  return isExactDefinitionMatch(answer, definitions);
}

export function buildLocalCorrectResult(wordData) {
  return {
    is_correct: true,
    ai_feedback: "正确！",
    matched_locally: true,
  };
}
