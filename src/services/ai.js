import { matchesStandardMeaning, buildLocalCorrectResult } from "./localMatch";

export async function evaluateAnswer(wordData, userAnswer) {
  const trimmed = userAnswer.trim();

  if (matchesStandardMeaning(trimmed, wordData.definitions)) {
    return buildLocalCorrectResult(wordData);
  }

  const res = await fetch("/api/ai/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      word: wordData.word,
      definitions: wordData.definitions,
      userAnswer: trimmed,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `AI 批改失败 (${res.status})`);
  }

  return data;
}
