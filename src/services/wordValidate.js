export async function validateEnglishWord(word, { signal } = {}) {
  const query = String(word || "").trim();
  if (!query) {
    throw new Error("请输入要验证的单词");
  }

  const res = await fetch("/api/ai/word-validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ word: query }),
    signal,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `单词验证失败 (${res.status})`);
  }

  return data;
}
