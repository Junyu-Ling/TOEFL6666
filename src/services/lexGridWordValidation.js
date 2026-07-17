const CACHE_KEY = "toefl666_lexgrid_word_validation";

let memoryCache = null;

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

function normalizeKey(word) {
  return String(word || "").trim().toLowerCase();
}

export function getCachedWordValidation(word) {
  const key = normalizeKey(word);
  if (!key) return null;
  const cached = loadCache()[key];
  return cached && typeof cached === "object" ? cached : null;
}

export function saveWordValidation(word, result) {
  const key = normalizeKey(word);
  if (!key || !result) return;
  const cache = loadCache();
  cache[key] = result;
  persistCache(cache);
}

/**
 * 提供一个兼容 Map 接口（has/get/set）的持久化缓存，可直接传给
 * validateGuessWord 使用。AI 判定过的单词（无论真词还是非词）会写入
 * localStorage，刷新页面 / 下次再猜到同一个词时不再重复调用 AI，节省 token。
 */
export function createPersistentValidationCache() {
  return {
    has(word) {
      return getCachedWordValidation(word) !== null;
    },
    get(word) {
      return getCachedWordValidation(word);
    },
    set(word, result) {
      saveWordValidation(word, result);
    },
  };
}
