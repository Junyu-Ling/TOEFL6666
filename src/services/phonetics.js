const API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en";
const CACHE_KEY = "toefl666_phonetics_v1";
const MAX_CACHE_ENTRIES = 800;

const memoryCache = new Map();

function normalizeIpa(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  if (value.startsWith("/") || value.startsWith("[")) return value;
  return `/${value}/`;
}

function readStorageCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") memoryCache.set(key, value);
    }
  } catch {
    // ignore cache read errors
  }
}

function writeStorageCache() {
  try {
    const entries = [...memoryCache.entries()].slice(-MAX_CACHE_ENTRIES);
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // ignore quota errors
  }
}

readStorageCache();

function pickPhonetic(entry) {
  if (!entry) return "";

  const phonetics = Array.isArray(entry.phonetics) ? entry.phonetics : [];
  const us = phonetics.find((item) => item.text && /-us\b|\/us\//i.test(item.audio || ""));
  if (us?.text) return normalizeIpa(us.text);

  const uk = phonetics.find((item) => item.text && /-gb\b|\/uk\//i.test(item.audio || ""));
  if (uk?.text) return normalizeIpa(uk.text);

  const first = phonetics.find((item) => item.text)?.text;
  if (first) return normalizeIpa(first);

  return normalizeIpa(entry.phonetic);
}

export async function fetchWordPhonetic(word, { signal } = {}) {
  const key = String(word || "").trim().toLowerCase();
  if (!key) return "";

  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }

  const res = await fetch(`${API_BASE}/${encodeURIComponent(key)}`, { signal });
  if (!res.ok) {
    memoryCache.set(key, "");
    writeStorageCache();
    return "";
  }

  const data = await res.json().catch(() => []);
  const ipa = pickPhonetic(Array.isArray(data) ? data[0] : null);

  memoryCache.set(key, ipa);
  writeStorageCache();
  return ipa;
}

export async function getWordPhonetic(word, options = {}) {
  const key = String(word || "").trim().toLowerCase();
  if (!key) return "";
  if (memoryCache.has(key)) return memoryCache.get(key);
  return fetchWordPhonetic(word, options);
}

export function getCachedPhonetic(word) {
  const key = String(word || "").trim().toLowerCase();
  if (!key || !memoryCache.has(key)) return "";
  return memoryCache.get(key) || "";
}
