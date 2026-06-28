const API_BASE = import.meta.env.VITE_WORDLIST_API || "/api/wordlists";

export async function fetchWordListManifest() {
  const res = await fetch(`${API_BASE}/manifest.json`);
  if (!res.ok) throw new Error("无法加载词库目录");
  return res.json();
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
