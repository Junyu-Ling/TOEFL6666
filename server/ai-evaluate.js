const SYSTEM_PROMPT = `你是托福词汇批改助手。只批改对错，不生成记忆法。

必须只返回 json：
{
  "is_correct": true或false,
  "ai_feedback": "中文反馈：一般最多2句、不超过60字；若用户答成了易混词，可增至3句、不超过100字"
}

批改规则：
1. 用户只需输入中文释义，不要求写词性（n./v./adj. 等）；缺少词性不算错。
2. 用户中文释义与标准释义含义一致即可判 true，允许合理同义表述。
3. 仅沾个别汉字、含义明显错误、空泛或与词义无关，判 false。
4. 回答中胡乱拼接英文或乱码判 false。
5. 不要仅因表述比标准释义简短就判错；不确定时看核心义是否命中。
6. 若用户释义明显是另一个英文词的义（形近、音近、拼写相近，或中文同音/近音易混），判 false。例如本题 leap（跳跃），用户答「泄露」则是把 leak 搞混了。
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
      max_tokens: 384,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `单词：${word}
标准释义：${(definitions || []).join("；")}
用户的解释（只需中文释义即可，不要求词性）：${userAnswer.trim()}

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
