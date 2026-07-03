export async function evaluatePronunciation(wordData, { transcript, alternatives, pronunciationHint, signal } = {}) {
  const res = await fetch("/api/ai/pronounce-evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      word: wordData.word,
      transcript,
      alternatives,
      pronunciationHint,
    }),
    signal,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `发音批改失败 (${res.status})`);
  }

  return data;
}
