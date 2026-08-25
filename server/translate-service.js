/**
 * 翻译服务 - 带缓存和批处理优化
 * 
 * 功能：
 * 1. 单词释义翻译
 * 2. 批量翻译
 * 3. 本地缓存（减少API调用）
 * 4. 请求合并（减少网络请求）
 */

import { translateText, translateBatch } from "./translate-client.js";

// 内存缓存 - 翻译结果
const translationCache = new Map();

// 最大缓存条目数
const MAX_CACHE_SIZE = 10000;

// 缓存键生成
function getCacheKey(text, sourceLang, targetLang) {
  return `${sourceLang}:${targetLang}:${text}`;
}

// 清理缓存（LRU策略）
function evictCache() {
  if (translationCache.size >= MAX_CACHE_SIZE) {
    const firstKey = translationCache.keys().next().value;
    translationCache.delete(firstKey);
  }
}

/**
 * 翻译单个文本（带缓存）
 * @param {string} text - 要翻译的文本
 * @param {Object} options - 翻译选项
 * @returns {Promise<Object>} { original: string, translated: string, cached: boolean }
 */
export async function translate(text, options = {}) {
  const sourceLang = options.sourceLang || "en";
  const targetLang = options.targetLang || "zh-CN";
  const format = options.format || "text";

  // 检查缓存
  const cacheKey = getCacheKey(text, sourceLang, targetLang);
  if (translationCache.has(cacheKey)) {
    return {
      original: text,
      translated: translationCache.get(cacheKey),
      cached: true,
    };
  }

  // 调用翻译API
  const translated = await translateText(text, { sourceLang, targetLang, format });

  // 存入缓存
  evictCache();
  translationCache.set(cacheKey, translated);

  return {
    original: text,
    translated,
    cached: false,
  };
}

/**
 * 批量翻译（带缓存和自动分批）
 * @param {string[]} texts - 要翻译的文本数组
 * @param {Object} options - 翻译选项
 * @returns {Promise<Array>} 翻译结果数组
 */
export async function translateMultiple(texts, options = {}) {
  const sourceLang = options.sourceLang || "en";
  const targetLang = options.targetLang || "zh-CN";
  const format = options.format || "text";

  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  // 分离缓存命中和未命中的文本
  const results = new Array(texts.length);
  const toTranslate = [];
  const toTranslateIndices = [];

  texts.forEach((text, index) => {
    const cacheKey = getCacheKey(text, sourceLang, targetLang);
    if (translationCache.has(cacheKey)) {
      results[index] = {
        original: text,
        translated: translationCache.get(cacheKey),
        cached: true,
      };
    } else {
      toTranslate.push(text);
      toTranslateIndices.push(index);
    }
  });

  // 如果全部命中缓存，直接返回
  if (toTranslate.length === 0) {
    return results;
  }

  // 批量翻译未缓存的文本（Google Translate API 支持一次最多128个文本）
  const BATCH_SIZE = 100;
  const batches = [];
  for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
    batches.push(toTranslate.slice(i, i + BATCH_SIZE));
  }

  const translations = [];
  for (const batch of batches) {
    const batchTranslations = await translateBatch(batch, { sourceLang, targetLang, format });
    translations.push(...batchTranslations);
  }

  // 填充结果并更新缓存
  toTranslateIndices.forEach((originalIndex, i) => {
    const text = toTranslate[i];
    const translated = translations[i];
    
    // 存入缓存
    const cacheKey = getCacheKey(text, sourceLang, targetLang);
    evictCache();
    translationCache.set(cacheKey, translated);

    results[originalIndex] = {
      original: text,
      translated,
      cached: false,
    };
  });

  return results;
}

/**
 * 翻译单词定义（专用于单词卡片）
 * @param {string} word - 单词
 * @param {string} definition - 英文定义
 * @returns {Promise<Object>} { word, definition, translatedDefinition, cached }
 */
export async function translateDefinition(word, definition) {
  const result = await translate(definition, { sourceLang: "en", targetLang: "zh-CN" });
  
  return {
    word,
    definition,
    translatedDefinition: result.translated,
    cached: result.cached,
  };
}

/**
 * 清空翻译缓存
 */
export function clearTranslationCache() {
  translationCache.clear();
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats() {
  return {
    size: translationCache.size,
    maxSize: MAX_CACHE_SIZE,
  };
}
