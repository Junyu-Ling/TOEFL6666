export async function lookupWordDefinitions(word, { signal } = {}) {
  const query = String(word || "").trim();
  if (!query) {
    throw new Error("请输入要查询的单词");
  }

  const res = await fetch("/api/ai/word-lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ word: query }),
    signal,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `AI 查词失败 (${res.status})`);
  }

  return data;
}
