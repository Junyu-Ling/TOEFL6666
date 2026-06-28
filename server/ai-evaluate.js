const SYSTEM_PROMPT = `你是托福词汇批改助手。只批改对错，不生成记忆法。

必须只返回 json：
{
  "is_correct": true或false,
  "ai_feedback": "最多2句、合计不超过60字的中文反馈，简洁指出对错，不要复述完整书上释义"
}

批改规则：
1. 用户必须真正理解词义；仅包含标准释义里的个别汉字、词性缺失、胡乱拼接英文/乱码，一律判 false。
2. 标准释义带词性（如 n./v./adj.）时，用户只写中文释义、不写词性，通常判 false；除非用户用中文明确说对了词性（如「名词：密码」）。
3. 用户回答比标准释义多出无关内容（如「密码asdfgh」）判 false。
4. 抓住核心含义且表述清楚、词性无明显错误，可判 true。
5. 不确定时偏严格，判 false。不要啰嗦。`;

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
  if (feedback.length > 80) {
    feedback = `${feedback.slice(0, 77)}…`;
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
  const apiKey = config.apiKey || process.env.DEEPSEEK_API_KEY || "";
  const model = config.model || process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const baseUrl = (config.baseUrl || process.env.DEEPSEEK_API_BASE || "https://api.deepseek.com").replace(
    /\/$/,
    ""
  );

  const { word, definitions, userAnswer } = payload || {};

  if (!apiKey) {
    throw createConfigError("未配置 DEEPSEEK_API_KEY，请在环境变量中设置");
  }

  if (!word || !userAnswer?.trim()) {
    throw createConfigError("缺少单词或用户回答", 400);
  }

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 256,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `单词：${word}
标准释义：${(definitions || []).join("；")}
用户的解释：${userAnswer.trim()}

请批改并返回 json。`,
        },
      ],
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw createConfigError(
      data.error?.message || data.error?.msg || "DeepSeek API 请求失败",
      response.status
    );
  }

  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw createConfigError("AI 未返回有效内容", 502);
  }

  return normalizeResult(parseAiJson(text));
}
