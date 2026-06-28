import {
  matchesStandardMeaning,
  isObviouslyWrong,
  buildLocalCorrectResult,
  buildLocalWrongResult,
} from "./localMatch";

export async function evaluateAnswer(wordData, userAnswer) {
  const trimmed = userAnswer.trim();

  if (matchesStandardMeaning(trimmed, wordData.definitions)) {
    return buildLocalCorrectResult();
  }

  if (isObviouslyWrong(trimmed, wordData.definitions)) {
    return buildLocalWrongResult("回答含有无关英文或乱码，请只输入中文释义。");
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
