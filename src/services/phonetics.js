import phoneticsData from "../data/phonetics.json";

const phoneticMap = phoneticsData.phonetics || {};

/**
 * 获取单词的音标
 * @param {string} word - 单词
 * @returns {string} 音标（IPA格式），如果没有则返回空字符串
 */
export function getPhonetic(word) {
  if (!word) return "";
  const normalized = word.toLowerCase().trim();
  return phoneticMap[normalized] || "";
}

/**
 * 批量获取音标
 * @param {string[]} words - 单词数组
 * @returns {Object} 单词到音标的映射
 */
export function getPhonetics(words) {
  const result = {};
  words.forEach((word) => {
    const phonetic = getPhonetic(word);
    if (phonetic) {
      result[word] = phonetic;
    }
  });
  return result;
}

/**
 * 检查是否有音标数据
 * @param {string} word - 单词
 * @returns {boolean}
 */
export function hasPhonetic(word) {
  return Boolean(getPhonetic(word));
}

export default {
  getPhonetic,
  getPhonetics,
  hasPhonetic,
};
