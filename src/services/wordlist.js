import { normalizeAppMode } from "../utils/appMode.js";

const TOEFL_API_BASE = import.meta.env.VITE_WORDLIST_API || "/api/wordlists";
const SAT_API_BASE = import.meta.env.VITE_SAT_WORDLIST_API || "/api/wordlists-sat";

function getApiBase(appMode = "toefl") {
  return normalizeAppMode(appMode) === "sat" ? SAT_API_BASE : TOEFL_API_BASE;
}

export async function fetchWordListManifest(appMode = "toefl") {
  const res = await fetch(`${getApiBase(appMode)}/manifest.json`);
  if (!res.ok) throw new Error("无法加载词库目录");
  return res.json();
}

export async function fetchWordListIndex(appMode = "toefl") {
  const res = await fetch(`${getApiBase(appMode)}/word-index.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error("无法加载词库索引");
  const data = await res.json();
  return data.index ?? data;
}

export async function fetchWordList(listId, appMode = "toefl") {
  const res = await fetch(`${getApiBase(appMode)}/${listId}.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`无法加载词库：${listId}`);
  const data = await res.json();
  return {
    meta: data.meta,
    words: data.words ?? [],
  };
}

export async function fetchAllWordBank(lists, appMode = "toefl") {
  const batches = await Promise.all(
    lists.map(async (list) => {
      const { words } = await fetchWordList(list.id, appMode);
      return words.map((word, index) => ({ ...word, sourceListId: list.id, listIndex: index }));
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

/** 确保恢复的 listId 属于当前模式词库，避免 TOEFL/SAT 进度串用。 */
export function resolveActiveListId(savedListId, manifest) {
  const lists = manifest?.lists ?? [];
  if (!lists.length) return null;
  const ids = new Set(lists.map((list) => list.id));
  if (savedListId && ids.has(savedListId)) return savedListId;
  return manifest.defaultListId ?? lists[0]?.id ?? null;
}
