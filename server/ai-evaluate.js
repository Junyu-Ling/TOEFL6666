import { chatCompletion } from "./ai-client.js";

const SYSTEM_PROMPT = `你是托福词汇批改助手。只批改对错，不生成记忆法。

必须只返回 json：
{
  "is_correct": true或false,
  "ai_feedback": "中文反馈：一般最多2句、不超过60字；若用户答成了易混词，可增至3句、不超过100字"
}

批改规则：
1. 用户可用中文释义，也可用英文同义词/近义词解释（如 severe 答 serious、happy 答 glad）；不要求写词性（n./v./adj. 等），缺少词性不算错。
2. 用户释义与标准释义含义一致即可判 true，允许合理同义表述；标准释义里括号内为可选补充，用户不写括号内容不算错。
3. 仅沾个别汉字、含义明显错误、空泛或与词义无关，判 false。
4. 回答中胡乱拼接英文、无意义字母串或乱码判 false；但单个/少量英文同义词释义是允许的。
5. 不要仅因表述比标准释义简短就判错；不确定时看核心义是否命中。
6. 若用户释义明显是另一个英文词的义（形近、音近、拼写相近，或中文同音/近音易混），判 false。例如本题 leap（跳跃），用户答「泄露」或 leak 则是搞混了。但若用户用正确近义词的英文（如 severe 答 serious）应判 true。
7. 遇易混词时，ai_feedback 必须点出用户可能混淆的是哪个词，并各用一句简短中文对比本题词与混淆词的核心义，帮助用户区分（如「leap 是跳跃；leak 是泄露」）。不要只说不相关。`;

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

function normalizeResult(raw) {
  let feedback = String(raw.ai_feedback || "批改完成。");
  if (feedback.length > 120) {
    feedback = `${feedback.slice(0, 117)}…`;
  }

  return {
    is_correct: Boolean(raw.is_correct),
    ai_feedback: feedback,
  };
}

function createConfigError(message, status = 500) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export async function evaluateWithDeepSeek(payload, config = {}) {
  const { word, definitions, userAnswer } = payload || {};

  if (!word || !userAnswer?.trim()) {
    throw createConfigError("缺少单词或用户回答", 400);
  }

  const text = await chatCompletion({
    config,
    maxTokens: 384,
    temperature: 0.3,
    responseFormat: "json",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `单词：${word}
标准释义：${(definitions || []).join("；")}
用户的解释（可用中文释义，或用英文同义词/近义词，不要求词性）：${userAnswer.trim()}

请批改并返回 json。`,
      },
    ],
  });

  return normalizeResult(parseAiJson(text));
}
