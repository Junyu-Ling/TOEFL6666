import { chatCompletion } from "./ai-client.js";

const SYSTEM_PROMPT = `你是英语词典助手。判断用户输入是否为真实存在的英语单词。

必须只返回 JSON，不要 markdown 代码块：
{
  "valid": true,
  "word": "修正大小写后的单词"
}

规则：
1. valid 为 true 仅当该字符串是英语中实际使用的词汇（普通单词、常见缩写、专有名词、复数/过去式等可查形式均可）。
2. 随机字母组合、明显拼写错误、无意义字符串为 valid: false；此时 word 仍返回清理后的输入。
3. 只返回 JSON，不要解释。`;

function parseAiJson(text) {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI 返回格式无效");

    const candidate = match[0]
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2018\u2019]/g, "'");

    return JSON.parse(candidate);
  }
}

function createConfigError(message, status = 500) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export async function validateWordWithDeepSeek(payload, config = {}) {
  const query = String(payload?.word || "").trim();

  if (!query) {
    throw createConfigError("缺少单词", 400);
  }

  const text = await chatCompletion({
    config,
    maxTokens: 128,
    temperature: 0,
    responseFormat: "json",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `请判断是否为有效英文单词：${query}` },
    ],
  });

  const parsed = parseAiJson(text);
  const word = String(parsed.word || query).trim() || query;

  return {
    word,
    valid: Boolean(parsed.valid),
    source: "ai",
  };
}
