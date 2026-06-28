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

export function hasUnexpectedLatin(answer, definitions) {
  const allowed = collectAllowedLatinTokens(definitions);
  return extractAnswerLatinTokens(answer).some((token) => !isAllowedLatinToken(token, allowed));
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

function matchesChineseDefinition(answer, definitions) {
  const normalizedAnswer = normalizeForCompare(stripOptionalPos(answer));
  if (!normalizedAnswer) return false;

  return definitions.some((definition) => {
    const chinese = normalizeForCompare(extractChinesePart(definition));
    return chinese && normalizedAnswer === chinese;
  });
}

/**
 * 用户只需中文释义即可。与任一条标准释义的中文部分完全一致时，本地判对，不调用 AI。
 */
export function matchesStandardMeaning(userAnswer, definitions) {
  const answer = userAnswer.trim();
  if (!answer || answer.length < 2 || !definitions?.length) return false;

  if (hasUnexpectedLatin(answer, definitions)) return false;
  if (hasUnexpectedDigits(answer, definitions)) return false;

  return matchesFullDefinitionLine(answer, definitions) || matchesChineseDefinition(answer, definitions);
}

/** 明显乱答（乱码/无关英文），本地直接判错，不调用 AI。 */
export function isObviouslyWrong(userAnswer, definitions) {
  const answer = userAnswer.trim();
  if (!answer || !definitions?.length) return false;

  return hasUnexpectedLatin(answer, definitions) || hasUnexpectedDigits(answer, definitions);
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
