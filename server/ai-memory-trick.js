import { chatCompletion } from "./ai-client.js";
import { parseAiJson } from "./parse-ai-json.js";

const SYSTEM_PROMPT = `你是托福词汇记忆法专家。根据单词和释义，生成两种不同类型的记忆法，方便学生根据自己习惯选择。

必须只返回 json，memory_tricks 必须恰好 2 条，缺一不可：
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
1. 必须同时生成两种记忆法：第 1 条词根词缀（type 必须是 root），第 2 条谐音联想（type 必须是 homophone）。只给一种、两条同类型、或省略数组都不合格。
2. 词根词缀法：优先拆解前缀、词根、后缀；若无明显词根，可用词源、同根词或构词规律。
3. 谐音记忆法：找中文谐音+场景联想，生动有趣，便于快速记忆。避免生硬，要自然贴近词义。
4. 每个 content 不超过100字，formula 不超过60字。
5. pronunciation_alert：仅当存在不发音字母、特殊元音、-ough 多变、recipe 类「看着不像那么读」时填写，如「b 不发音，读 /daʊt/」；自然拼读词留空字符串。
6. 两种记忆法都要实用有效，让学生能真正记住单词。`;

const VALID_TYPES = new Set(["root", "homophone", "story", "association"]);

function collectRawTricks(raw) {
  if (Array.isArray(raw?.memory_tricks) && raw.memory_tricks.length > 0) {
    return raw.memory_tricks;
  }
  if (raw?.memory_trick && typeof raw.memory_trick === "object") {
    return [raw.memory_trick];
  }
  return [];
}

function normalizeOneTrick(trick) {
  if (!trick || typeof trick !== "object") return null;

  const type = VALID_TYPES.has(trick.type) ? trick.type : "association";
  const formula = String(trick.formula || "").trim().slice(0, 100);
  let content = String(trick.content || "").trim();
  if (content.length > 160) content = `${content.slice(0, 157)}…`;

  if (!formula && !content) return null;

  return {
    type,
    formula: formula || "联想记忆",
    content: content || "结合释义多念几遍，并尝试自己造句巩固。",
  };
}

function pairRequiredTricks(normalized) {
  const root = normalized.find((trick) => trick.type === "root");
  const homophone = normalized.find((trick) => trick.type === "homophone");
  if (root && homophone) return [root, homophone];
  if (normalized.length < 2) return null;
  return [
    { ...normalized[0], type: "root" },
    { ...normalized[1], type: "homophone" },
  ];
}

function normalizeMemoryTrick(raw) {
  const pronunciation_alert = String(raw?.pronunciation_alert || "").trim().slice(0, 120);
  const normalized = collectRawTricks(raw).map(normalizeOneTrick).filter(Boolean);
  const paired = pairRequiredTricks(normalized);

  if (!paired) {
    throw new Error("AI 未返回两种记忆法");
  }

  return {
    memory_tricks: paired,
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

  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const retryHint =
        attempt === 0
          ? "请同时生成词根词缀和谐音联想两种记忆法，并返回 json。"
          : "上次输出不合格。必须恰好返回 memory_tricks 两条：第 1 条 type=root，第 2 条 type=homophone，一条都不能少。";
      const text = await chatCompletion({
        config,
        maxTokens: 768,
        temperature: attempt === 0 ? 0.5 : 0.35,
        responseFormat: "json",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `单词：${word}
标准释义：${(definitions || []).join("；")}

${retryHint}`,
          },
        ],
      });

      const result = normalizeMemoryTrick(parseAiJson(text));
      return {
        memory_trick: result.memory_tricks[0],
        memory_tricks: result.memory_tricks,
        ...(result.pronunciation_alert ? { pronunciation_alert: result.pronunciation_alert } : {}),
      };
    } catch (err) {
      lastError = err;
    }
  }

  throw createConfigError(lastError?.message || "AI 未返回两种记忆法，请重试", lastError?.status || 502);
}
