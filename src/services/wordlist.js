const API_BASE = import.meta.env.VITE_WORDLIST_API || "/api/wordlists";

export async function fetchWordListManifest() {
  const res = await fetch(`${API_BASE}/manifest.json`);
  if (!res.ok) throw new Error("无法加载词库目录");
  return res.json();
}

export async function fetchWordListIndex() {
  const res = await fetch(`${API_BASE}/word-index.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error("无法加载词库索引");
  const data = await res.json();
  return data.index ?? data;
}

export async function fetchWordList(listId) {
  const res = await fetch(`${API_BASE}/${listId}.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`无法加载词库：${listId}`);
  const data = await res.json();
  return {
    meta: data.meta,
    words: data.words ?? [],
  };
}

export async function fetchAllWordBank(lists) {
  const batches = await Promise.all(
    lists.map(async (list) => {
      const { words } = await fetchWordList(list.id);
      return words.map((word) => ({ ...word, sourceListId: list.id }));
    })
  );

  const seen = new Set();
  const result = [];
  for (const batch of batches) {
    for (const item of batch) {
      const key = item.word.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}
