import { chatCompletion } from "./ai-client.js";
import { parseAiJson } from "./parse-ai-json.js";

const SYSTEM_PROMPT = `你是托福词汇记忆法专家。根据单词和释义，生成两种不同类型的记忆法，方便学生根据自己习惯选择。

必须只返回 json：
{
  "memory_tricks": [
    {
      "type": "root",
      "formula": "简短拆解公式，如 un(不)+willing(愿意) → unwilling",
      "content": "1-3句中文记忆说明，实用、具体"
    },
    {
      "type": "homophone",
      "formula": "谐音联想公式，如 abandon 谐音「阿笨蛋」",
      "content": "1-3句中文谐音记忆说明，生动有趣"
    }
  ],
  "pronunciation_alert": "若拼写与读音明显不符自然拼读则写一句中文读音提示，否则空字符串"
}

规则：
1. 必须生成两种记忆法：第一种用词根词缀（type: "root"），第二种用谐音联想（type: "homophone"）。
2. 词根词缀法：优先拆解前缀、词根、后缀；若无明显词根，可用词源、同根词或构词规律。
3. 谐音记忆法：找中文谐音+场景联想，生动有趣，便于快速记忆。避免生硬，要自然贴近词义。
4. 每个 content 不超过100字，formula 不超过60字。
5. pronunciation_alert：仅当存在不发音字母、特殊元音、-ough 多变、recipe 类「看着不像那么读」时填写，如「b 不发音，读 /daʊt/」；自然拼读词留空字符串。
6. 两种记忆法都要实用有效，让学生能真正记住单词。`;

const VALID_TYPES = new Set(["root", "homophone", "story", "association"]);

function normalizeMemoryTrick(raw) {
  const tricks = raw?.memory_tricks;
  const pronunciation_alert = String(raw?.pronunciation_alert || "").trim().slice(0, 120);
  
  if (!Array.isArray(tricks) || tricks.length === 0) {
    throw new Error("AI 未返回记忆法");
  }

  // 标准化每个记忆法
  const normalized = tricks.slice(0, 2).map((trick) => {
    if (!trick || typeof trick !== "object") {
      return null;
    }

    const type = VALID_TYPES.has(trick.type) ? trick.type : "association";
    const formula = String(trick.formula || "").trim().slice(0, 100);
    let content = String(trick.content || "").trim();
    if (content.length > 160) content = `${content.slice(0, 157)}…`;

    if (!formula && !content) {
      return null;
    }

    return {
      type,
      formula: formula || "联想记忆",
      content: content || "结合释义多念几遍，并尝试自己造句巩固。",
    };
  }).filter(Boolean);

  if (normalized.length === 0) {
    throw new Error("AI 记忆法内容为空");
  }

  return {
    memory_tricks: normalized,
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

  const result = normalizeMemoryTrick(parseAiJson(text));
  
  // 兼容旧格式：返回第一个记忆法作为 memory_trick，同时返回所有记忆法
  return {
    memory_trick: result.memory_tricks[0],
    memory_tricks: result.memory_tricks,
    ...(result.pronunciation_alert ? { pronunciation_alert: result.pronunciation_alert } : {}),
  };
}
