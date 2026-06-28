function extractMeaning(definition) {
  return definition.replace(/^[^.]+\.\s*/, "").trim();
}

function extractKeywords(text) {
  const keywords = text.match(/[\u4e00-\u9fff]{2,}/g) || [];
  return [...new Set(keywords)];
}

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[\s，,。．.；;、！!？?"""''']/g, "")
    .trim();
}

function matchesSingleMeaning(answer, meaning) {
  const keywords = extractKeywords(meaning);
  if (keywords.length === 0) return false;

  if (keywords.every((kw) => answer.includes(kw))) {
    return true;
  }

  const hits = keywords.filter((kw) => answer.includes(kw)).length;
  return hits / keywords.length >= 0.85 && hits >= Math.min(2, keywords.length);
}

export function matchesStandardMeaning(userAnswer, definitions) {
  const answer = userAnswer.trim();
  if (!answer || answer.length < 2) return false;

  const meanings = definitions.map(extractMeaning).filter(Boolean);
  if (meanings.length === 0) return false;

  if (meanings.some((meaning) => matchesSingleMeaning(answer, meaning))) {
    return true;
  }

  const combined = meanings.join("");
  const normalizedAnswer = normalize(answer);
  const normalizedStandard = normalize(combined);

  if (
    normalizedStandard.includes(normalizedAnswer) ||
    normalizedAnswer.includes(normalizedStandard)
  ) {
    return normalizedAnswer.length >= 2;
  }

  const allKeywords = extractKeywords(combined);
  if (allKeywords.length === 0) return false;

  const hits = allKeywords.filter((kw) => answer.includes(kw)).length;
  const ratio = hits / allKeywords.length;

  return ratio >= 0.8 && hits >= Math.min(3, allKeywords.length);
}

export function buildLocalCorrectResult(wordData) {
  return {
    is_correct: true,
    ai_feedback: "正确！",
    matched_locally: true,
  };
}
