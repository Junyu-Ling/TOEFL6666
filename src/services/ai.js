import {
  matchesStandardMeaning,
  isObviouslyWrong,
  isUsingTargetWordItself,
  buildLocalCorrectResult,
  buildLocalWrongResult,
  TARGET_WORD_ITSELF_MESSAGE,
} from "./localMatch";
import { loadRecognized } from "./storage";
import { buildRecognizedConfusionContext } from "../shared/confusionContext";

export async function evaluateAnswer(wordData, userAnswer, options = {}) {
  const { signal } = options;
  const trimmed = userAnswer.trim();

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  if (isUsingTargetWordItself(trimmed, wordData.word)) {
    return buildLocalWrongResult(TARGET_WORD_ITSELF_MESSAGE);
  }

  if (matchesStandardMeaning(trimmed, wordData.definitions)) {
    return buildLocalCorrectResult();
  }

  if (isObviouslyWrong(trimmed, wordData.definitions, wordData.word)) {
    return buildLocalWrongResult("回答含有明显无关内容，请重新作答。");
  }

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const recognizedVocabulary =
    options.recognizedVocabulary ??
    buildRecognizedConfusionContext(loadRecognized(), wordData.word, trimmed);

  const res = await fetch("/api/ai/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      word: wordData.word,
      definitions: wordData.definitions,
      userAnswer: trimmed,
      recognizedVocabulary,
    }),
    signal,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `AI 批改失败 (${res.status})`);
  }

  return data;
}
