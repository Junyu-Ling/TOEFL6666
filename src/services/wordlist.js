import { normalizeAppMode } from "../utils/appMode.js";

import toeflManifest from "../generated/wordlists/toefl/manifest.json";
import toeflWordIndex from "../generated/wordlists/toefl/word-index.json";
import satManifest from "../generated/wordlists/sat/manifest.json";
import satWordIndex from "../generated/wordlists/sat/word-index.json";

const TOEFL_LIST_BASE = import.meta.env.VITE_WORDLIST_API || "/wordlists";
const SAT_LIST_BASE = import.meta.env.VITE_SAT_WORDLIST_API || "/wordlists-sat";
const CACHE_NAME = "toefl666-wordlists-v2";

const BUNDLED_MANIFEST = {
  toefl: toeflManifest,
  sat: satManifest,
};

const BUNDLED_INDEX = {
  toefl: toeflWordIndex.index ?? toeflWordIndex,
  sat: satWordIndex.index ?? satWordIndex,
};

const wordBankLoaders = {
  toefl: () =>
    import("../generated/wordlists/toefl/word-bank.json").then((module) => module.default?.words ?? module.words ?? []),
  sat: () =>
    import("../generated/wordlists/sat/word-bank.json").then((module) => module.default?.words ?? module.words ?? []),
};

const wordBankCache = new Map();

function getMode(appMode) {
  return normalizeAppMode(appMode);
}

function getListBase(appMode = "toefl") {
  return getMode(appMode) === "sat" ? SAT_LIST_BASE : TOEFL_LIST_BASE;
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
      // fall through
    }
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function fetchWordListManifest(appMode = "toefl") {
  return BUNDLED_MANIFEST[getMode(appMode)] ?? BUNDLED_MANIFEST.toefl;
}

export function fetchWordListIndex(appMode = "toefl") {
  return BUNDLED_INDEX[getMode(appMode)] ?? BUNDLED_INDEX.toefl;
}

export async function fetchWordBank(appMode = "toefl") {
  const mode = getMode(appMode);
  if (wordBankCache.has(mode)) return wordBankCache.get(mode);

  const loader = wordBankLoaders[mode] ?? wordBankLoaders.toefl;
  const promise = loader();
  wordBankCache.set(mode, promise);
  return promise;
}

export async function fetchWordList(listId, appMode = "toefl", version) {
  const url = versionedUrl(`${getListBase(appMode)}/${listId}.json`, version);
  const data = await fetchJson(url);
  if (!data) throw new Error(`无法加载词库：${listId}`);
  return {
    meta: data.meta,
    words: data.words ?? [],
  };
}

/** 确保恢复的 listId 属于当前模式词库，避免 TOEFL/SAT 进度串用。 */
export function resolveActiveListId(savedListId, manifest) {
  const lists = manifest?.lists ?? [];
  if (!lists.length) return null;
  const ids = new Set(lists.map((list) => list.id));
  if (savedListId && ids.has(savedListId)) return savedListId;
  return manifest.defaultListId ?? lists[0]?.id ?? null;
}

export function clearWordBankCache(appMode) {
  wordBankCache.delete(getMode(appMode));
}
