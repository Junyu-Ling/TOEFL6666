/**
 * 前端翻译服务
 * 
 * 调用后端 Google Translate API
 */

// 本地缓存翻译结果（localStorage）
const CACHE_KEY_PREFIX = "toefl666_translation_";
const CACHE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30天

function getCacheKey(text, sourceLang, targetLang) {
  return `${CACHE_KEY_PREFIX}${sourceLang}_${targetLang}_${text}`;
}

function getCachedTranslation(text, sourceLang = "en", targetLang = "zh-CN") {
  try {
    const key = getCacheKey(text, sourceLang, targetLang);
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const { translation, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;

    if (age > CACHE_EXPIRY_MS) {
      localStorage.removeItem(key);
      return null;
    }

    return translation;
  } catch {
    return null;
  }
}

function setCachedTranslation(text, translation, sourceLang = "en", targetLang = "zh-CN") {
  try {
    const key = getCacheKey(text, sourceLang, targetLang);
    localStorage.setItem(
      key,
      JSON.stringify({
        translation,
        timestamp: Date.now(),
      })
    );
  } catch {
    // 忽略localStorage错误
  }
}

/**
 * 翻译文本
 * @param {string} text - 要翻译的文本
 * @param {Object} options - 选项
 * @param {string} options.sourceLang - 源语言 (默认: 'en')
 * @param {string} options.targetLang - 目标语言 (默认: 'zh-CN')
 * @param {boolean} options.useCache - 是否使用缓存 (默认: true)
 * @returns {Promise<string>} 翻译后的文本
 */
export async function translateText(text, options = {}) {
  const sourceLang = options.sourceLang || "en";
  const targetLang = options.targetLang || "zh-CN";
  const useCache = options.useCache !== false;

  if (!text || typeof text !== "string") {
    throw new Error("翻译文本不能为空");
  }

  // 检查本地缓存
  if (useCache) {
    const cached = getCachedTranslation(text, sourceLang, targetLang);
    if (cached) return cached;
  }

  // 调用后端API
  const apiUrl = import.meta.env.VITE_API_BASE_URL || "";
  const response = await fetch(`${apiUrl}/api/translate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      sourceLang,
      targetLang,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `翻译失败: ${response.status}`);
  }

  const data = await response.json();
  const translation = data.translated || data.translation;

  // 缓存结果
  if (useCache && translation) {
    setCachedTranslation(text, translation, sourceLang, targetLang);
  }

  return translation;
}

/**
 * 批量翻译
 * @param {string[]} texts - 要翻译的文本数组
 * @param {Object} options - 选项（同translateText）
 * @returns {Promise<string[]>} 翻译后的文本数组
 */
export async function translateBatch(texts, options = {}) {
  const sourceLang = options.sourceLang || "en";
  const targetLang = options.targetLang || "zh-CN";
  const useCache = options.useCache !== false;

  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  // 分离缓存命中和未命中
  const results = new Array(texts.length);
  const toTranslate = [];
  const toTranslateIndices = [];

  if (useCache) {
    texts.forEach((text, index) => {
      const cached = getCachedTranslation(text, sourceLang, targetLang);
      if (cached) {
        results[index] = cached;
      } else {
        toTranslate.push(text);
        toTranslateIndices.push(index);
      }
    });
  } else {
    toTranslate.push(...texts);
    toTranslateIndices.push(...texts.map((_, i) => i));
  }

  // 如果全部命中缓存
  if (toTranslate.length === 0) {
    return results;
  }

  // 调用后端批量翻译API
  const apiUrl = import.meta.env.VITE_API_BASE_URL || "";
  const response = await fetch(`${apiUrl}/api/translate/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      texts: toTranslate,
      sourceLang,
      targetLang,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `批量翻译失败: ${response.status}`);
  }

  const data = await response.json();
  const translations = data.translations || [];

  // 填充结果并缓存
  toTranslateIndices.forEach((originalIndex, i) => {
    const translation = translations[i];
    results[originalIndex] = translation;

    if (useCache && translation) {
      setCachedTranslation(toTranslate[i], translation, sourceLang, targetLang);
    }
  });

  return results;
}

/**
 * 清空本地翻译缓存
 */
export function clearTranslationCache() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_KEY_PREFIX)) {
        keys.push(key);
      }
    }
    keys.forEach(key => localStorage.removeItem(key));
  } catch {
    // 忽略错误
  }
}

/**
 * 检查翻译服务是否可用
 * @returns {Promise<boolean>}
 */
export async function isTranslateAvailable() {
  try {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || "";
    const response = await fetch(`${apiUrl}/api/translate/status`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.available === true;
  } catch {
    return false;
  }
}
