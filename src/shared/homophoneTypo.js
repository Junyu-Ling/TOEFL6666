import { pinyin } from "pinyin-pro";

function extractChinese(text) {
  return (text.match(/[\u4e00-\u9fff]/g) || []).join("");
}

function stripPos(text) {
  return text.replace(/^[a-z./]+\.\s*/i, "").trim();
}

function normalizeChars(text) {
  return extractChinese(text).replace(/\s/g, "");
}

function pinyinKey(text) {
  const chars = normalizeChars(text);
  if (!chars) return "";
  return pinyin(chars, { toneType: "none", type: "array" }).join("").toLowerCase();
}

function expandChineseCandidates(definition) {
  const chinese = definition.replace(/^[^.]+\.\s*/, "").trim();
  const candidates = new Set();

  const add = (text) => {
    const chars = normalizeChars(text);
    if (chars.length >= 2) candidates.add(chars);
  };

  add(chinese.replace(/[（(][^）)]*[）)]/g, ""));
  const parenInner = chinese.match(/[（(]([^）)]*)[）)]/g) || [];
  for (const part of parenInner) {
    add(part.replace(/^[（(]|[）)]$/g, ""));
  }

  const commaParts = chinese
    .replace(/[（(][^）)]*[）)]/g, "")
    .split(/[,，、；]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (commaParts.length > 1) {
    for (const part of commaParts) add(part);
  }

  return [...candidates];
}

/**
 * 用户中文与标准释义同音不同字时，可能是输入法打错字。
 * @returns {{ expected: string, got: string } | null}
 */
export function detectHomophoneTypo(userAnswer, definitions = []) {
  const got = normalizeChars(stripPos(userAnswer));
  if (got.length < 2) return null;

  const gotPy = pinyinKey(got);
  if (!gotPy) return null;

  for (const definition of definitions) {
    for (const expected of expandChineseCandidates(definition)) {
      if (got === expected) continue;
      const expectedPy = pinyinKey(expected);
      if (expectedPy && gotPy === expectedPy) {
        return { expected, got };
      }
    }
  }

  return null;
}

export function buildTypoClarificationQuestion(word, typoInfo) {
  if (typoInfo?.expected && typoInfo?.got) {
    return `「${typoInfo.got}」和「${typoInfo.expected}」读音一样，你是打错字了，还是其实不认识 ${word}？`;
  }
  return `你的答案和标准释义读音很接近但字不一样，是打错字了，还是真的不认识 ${word}？`;
}
