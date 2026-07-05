import { chatCompletion } from "./ai-client.js";

const SYSTEM_PROMPT = `你是英语词典助手。用户查询的单词不在本地词库中，请给出该词的常见中文释义。

必须只返回 JSON，不要 markdown 代码块：
{
  "word": "原样返回用户查询的英文单词（修正大小写与拼写）",
  "definitions": ["n. 释义1", "v. 释义2", "adj. 释义3"]
}

规则：
1. definitions 数组列出该词常见词性与中文释义，每条格式为「词性. 释义」，如「n. 获得」「v. 获得，学到」。
2. 覆盖常见词性，按使用频率排序；专有名词、缩写也需给出简明中文。释义条目控制在 8 条以内，只写核心义项，不要例句或记忆法。
3. 若输入不是有效英文单词，word 仍返回清理后的输入，definitions 为空数组，并加一条「无法识别该词，请检查拼写」。
4. 必须一次输出完整、合法的 JSON，不要 markdown 代码块，不要输出到一半中断。`;

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

function normalizeDefinitions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

export async function lookupWordWithDeepSeek(payload, config = {}) {
  const { word } = payload || {};
  const query = String(word || "").trim();

  if (!query) {
    throw createConfigError("缺少单词", 400);
  }

  const text = await chatCompletion({
    config,
    maxTokens: 640,
    temperature: 0.2,
    responseFormat: "json",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `请查询单词：${query}` },
    ],
  });

  const parsed = parseAiJson(text);
  const definitions = normalizeDefinitions(parsed.definitions);

  if (!definitions.length) {
    throw createConfigError("未能获取该词的释义，请检查拼写后重试", 422);
  }

  return {
    word: String(parsed.word || query).trim() || query,
    definitions,
    source: "ai",
  };
}
