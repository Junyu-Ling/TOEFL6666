import { lookupWordDefinitions } from "./wordLookup";
import { normalizeMatchText, resolveWordData } from "../utils/readingVocabMatch";

const CACHE_KEY = "toefl666_reading_vocab_definitions";

let memoryCache = null;
const inflightLookups = new Map();

function loadCache() {
  if (memoryCache) return memoryCache;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    memoryCache = raw ? JSON.parse(raw) : {};
    if (typeof memoryCache !== "object" || memoryCache === null) memoryCache = {};
  } catch {
    memoryCache = {};
  }
  return memoryCache;
}

function persistCache(cache) {
  memoryCache = cache;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota errors
  }
}

export function getCachedReadingVocabDefinitions(word) {
  const key = normalizeMatchText(word);
  const cached = loadCache()[key];
  return Array.isArray(cached) ? cached : null;
}

export function saveReadingVocabDefinitions(word, definitions) {
  if (!Array.isArray(definitions)) return;
  const key = normalizeMatchText(word);
  const cache = loadCache();
  cache[key] = definitions;
  persistCache(cache);
}

export async function resolveReadingVocabDefinitions(word, wordBankMap, { signal } = {}) {
  const key = normalizeMatchText(word);
  if (!key) return [];

  const cached = getCachedReadingVocabDefinitions(word);
  if (cached !== null) return cached;

  const fromBank = resolveWordData(word, wordBankMap);
  if (fromBank.definitions?.length) {
    return fromBank.definitions;
  }

  if (inflightLookups.has(key)) {
    return inflightLookups.get(key);
  }

  const lookupPromise = (async () => {
    try {
      const data = await lookupWordDefinitions(word, { signal });
      const definitions = Array.isArray(data.definitions) ? data.definitions : [];
      saveReadingVocabDefinitions(word, definitions);
      return definitions;
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      return [];
    } finally {
      inflightLookups.delete(key);
    }
  })();

  inflightLookups.set(key, lookupPromise);
  return lookupPromise;
}
