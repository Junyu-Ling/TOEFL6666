import phoneticsData from "../data/phonetics.json";

const phoneticMap = phoneticsData.phonetics || {};

function asPair(value) {
  if (!value) return { us: "", uk: "" };
  if (typeof value === "string") return { us: value, uk: value };
  return {
    us: String(value.us || ""),
    uk: String(value.uk || ""),
  };
}

export function getPhoneticPair(word) {
  if (!word) return { us: "", uk: "" };
  return asPair(phoneticMap[String(word).toLowerCase().trim()]);
}

/**
 * 获取单词的音标（优先美式）
 * @param {string} word - 单词
 * @returns {string} 音标（IPA格式），如果没有则返回空字符串
 */
export function getPhonetic(word) {
  const { us, uk } = getPhoneticPair(word);
  return us || uk || "";
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
  const { us, uk } = getPhoneticPair(word);
  return Boolean(us || uk);
}

export default {
  getPhonetic,
  getPhoneticPair,
  getPhonetics,
  hasPhonetic,
};
