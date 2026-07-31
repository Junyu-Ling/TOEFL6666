import { chatCompletion } from "./ai-client.js";
import { parseAiJson } from "./parse-ai-json.js";

const SYSTEM_PROMPT = `你是英语词典助手。用户查询的单词不在本地词库中，请给出该词的常见中文释义，并判断用户是否可能拼写错误。

必须只返回 JSON，不要 markdown 代码块：
{
  "word": "最终确定的英文单词（修正大小写与拼写）",
  "definitions": ["n. 释义1", "v. 释义2"],
  "typo_corrected": false,
  "original_input": "用户原始输入",
  "typo_note": ""
}

规则：
1. definitions 数组列出该词常见词性与中文释义，每条格式为「词性. 释义」；控制在 8 条以内，只写核心义项。
2. 若用户提供了「词库相近词」列表，优先判断用户是否把词库里的某个词打错了；若是，word 填词库中的正确拼写，typo_corrected=true，typo_note 用一句中文说明（如「你是不是想查 appeal？」）。
3. 若输入是常见拼写错误（如 recieve→receive），修正后给出释义，typo_corrected=true，typo_note 说明疑似错字。
4. 若输入是有效英文单词且不在词库，typo_corrected=false，直接给释义。
5. 若输入不是有效英文单词，definitions 为空数组，typo_note 说明无法识别并请检查拼写。
6. 必须一次输出完整、合法的 JSON。`;

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

function formatBankHints(bankHints = []) {
  const hints = [...new Set(bankHints.map((word) => String(word || "").trim()).filter(Boolean))].slice(0, 12);
  if (!hints.length) return "（无）";
  return hints.join("、");
}

export async function lookupWordWithDeepSeek(payload, config = {}) {
  const { word, bankHints } = payload || {};
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
      {
        role: "user",
        content: `请查询单词：${query}

词库相近词（用户可能打错成这些）：${formatBankHints(bankHints)}`,
      },
    ],
  });

  const parsed = parseAiJson(text);
  const definitions = normalizeDefinitions(parsed.definitions);
  const typoNote = String(parsed.typo_note || "").trim();
  const originalInput = String(parsed.original_input || query).trim() || query;
  const resolvedWord = String(parsed.word || query).trim() || query;
  const typoCorrected = Boolean(parsed.typo_corrected);

  if (!definitions.length) {
    throw createConfigError(typoNote || "未能获取该词的释义，请检查拼写后重试", 422);
  }

  return {
    word: resolvedWord,
    definitions,
    source: "ai",
    typoCorrected,
    originalInput,
    typoNote:
      typoNote ||
      (typoCorrected && resolvedWord.toLowerCase() !== originalInput.toLowerCase()
        ? `已按「${resolvedWord}」理解（你输入的是 ${originalInput}）`
        : ""),
  };
}
