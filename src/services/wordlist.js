import { normalizeAppMode } from "../utils/appMode.js";

const TOEFL_API_BASE = import.meta.env.VITE_WORDLIST_API || "/api/wordlists";
const SAT_API_BASE = import.meta.env.VITE_SAT_WORDLIST_API || "/api/wordlists-sat";
const CACHE_NAME = "toefl666-wordlists-v1";

function getApiBase(appMode = "toefl") {
  return normalizeAppMode(appMode) === "sat" ? SAT_API_BASE : TOEFL_API_BASE;
}

function versionedUrl(path, version) {
  if (!version) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}v=${encodeURIComponent(version)}`;
}

async function fetchJson(url) {
  if (typeof caches !== "undefined") {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(url);
      if (cached) return cached.json();

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await cache.put(url, res.clone());
      return res.json();
    } catch {
      // fall through to plain fetch
    }
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchWordListManifest(appMode = "toefl") {
  const res = await fetch(`${getApiBase(appMode)}/manifest.json`);
  if (!res.ok) throw new Error("无法加载词库目录");
  return res.json();
}

export async function fetchWordListIndex(appMode = "toefl", version) {
  const url = versionedUrl(`${getApiBase(appMode)}/word-index.json`, version);
  const data = await fetchJson(url);
  if (!data) throw new Error("无法加载词库索引");
  return data.index ?? data;
}

export async function fetchWordBank(appMode = "toefl", version) {
  const url = versionedUrl(`${getApiBase(appMode)}/word-bank.json`, version);
  const data = await fetchJson(url);
  if (!data) throw new Error("无法加载词库全集");
  return data.words ?? [];
}

export async function fetchWordList(listId, appMode = "toefl", version) {
  const url = versionedUrl(`${getApiBase(appMode)}/${listId}.json`, version);
  const data = await fetchJson(url);
  if (!data) throw new Error(`无法加载词库：${listId}`);
  return {
    meta: data.meta,
    words: data.words ?? [],
  };
}

/** @deprecated Prefer fetchWordBank — kept for tooling/tests. */
export async function fetchAllWordBank(lists, appMode = "toefl", version) {
  const batches = await Promise.all(
    lists.map(async (list) => {
      const { words } = await fetchWordList(list.id, appMode, version);
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
