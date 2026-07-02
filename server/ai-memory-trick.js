import { chatCompletion } from "./ai-client.js";

const SYSTEM_PROMPT = `你是托福词汇记忆法专家。根据单词和释义，生成帮助记忆的内容。

必须只返回 json：
{
  "memory_trick": {
    "type": "root或homophone或story或association",
    "formula": "简短拆解公式，如 un(不)+willing(愿意) → unwilling",
    "content": "1-3句中文记忆说明，实用、具体",
    "pronunciation_alert": "若拼写与读音明显不符自然拼读则写一句中文读音提示，否则空字符串"
  }
}

规则：
1. 优先词根词缀拆解；若无明显词根，可用谐音、场景故事或语义联想。
2. type 取值：root（词根词缀）、homophone（谐音联想）、story（场景故事）、association（语义联想）。
3. content 不超过120字，不要复述完整书上释义。
4. formula 简短有力，便于一眼记住结构。
5. pronunciation_alert：仅当存在不发音字母、特殊元音、-ough 多变、recipe 类「看着不像那么读」时填写，如「b 不发音，读 /daʊt/」；自然拼读词留空字符串。`;

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

const VALID_TYPES = new Set(["root", "homophone", "story", "association"]);

function normalizeMemoryTrick(raw) {
  const trick = raw?.memory_trick;
  if (!trick || typeof trick !== "object") {
    throw new Error("AI 未返回记忆法");
  }

  const type = VALID_TYPES.has(trick.type) ? trick.type : "association";
  const formula = String(trick.formula || "").trim().slice(0, 120);
  let content = String(trick.content || "").trim();
  const pronunciation_alert = String(trick.pronunciation_alert || "").trim().slice(0, 120);
  if (content.length > 160) content = `${content.slice(0, 157)}…`;

  if (!formula && !content) {
    throw new Error("AI 记忆法内容为空");
  }

  return {
    type,
    formula: formula || "联想记忆",
    content: content || "结合释义多念几遍，并尝试自己造句巩固。",
    ...(pronunciation_alert ? { pronunciation_alert } : {}),
  };
}

function createConfigError(message, status = 500) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export async function generateMemoryTrick(payload, config = {}) {
  const { word, definitions } = payload || {};

  if (!word?.trim()) {
    throw createConfigError("缺少单词", 400);
  }

  const text = await chatCompletion({
    config,
    maxTokens: 384,
    temperature: 0.5,
    responseFormat: "json",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `单词：${word}
标准释义：${(definitions || []).join("；")}

请生成记忆法并返回 json。`,
      },
    ],
  });

  return { memory_trick: normalizeMemoryTrick(parseAiJson(text)) };
}
