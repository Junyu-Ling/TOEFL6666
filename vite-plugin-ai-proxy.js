import { loadEnv } from "vite";

const SYSTEM_PROMPT = `你是托福词汇批改助手。只批改对错，不生成记忆法。

必须只返回 JSON：
{
  "is_correct": true或false,
  "ai_feedback": "最多2句、合计不超过60字的中文反馈，简洁指出对错，不要复述完整书上释义"
}

规则：抓住核心含义即判 true；明显错误或空泛判 false。不要啰嗦。`;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("error", reject);
    req.on("end", () => resolve(body));
  });
}

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

function createAiHandler(getConfig) {
  return async (req, res, next) => {
    if (req.url !== "/api/ai/evaluate" && !req.url?.startsWith("/api/ai/evaluate?")) {
      return next();
    }

    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: "Method Not Allowed" }));
      return;
    }

    try {
      const { apiKey, model, baseUrl } = getConfig();
      if (!apiKey) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "未配置 DEEPSEEK_API_KEY，请检查 .env.local" }));
        return;
      }

      const body = await readBody(req);
      const { word, definitions, userAnswer } = JSON.parse(body);

      if (!word || !userAnswer?.trim()) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "缺少单词或用户回答" }));
        return;
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

请批改并返回 JSON。`,
            },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        res.statusCode = response.status;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: data.error?.message || data.error?.msg || "DeepSeek API 请求失败",
          })
        );
        return;
      }

      const text = data.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error("AI 未返回有效内容");
      }

      const result = normalizeResult(parseAiJson(text));

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(result));
    } catch (err) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err.message || "服务器错误" }));
    }
  };
}

export function aiProxyPlugin() {
  let apiKey = "";
  let model = "deepseek-chat";
  let baseUrl = "https://api.deepseek.com";

  return {
    name: "ai-proxy",
    configResolved(config) {
      const env = loadEnv(config.mode, config.root, "");
      apiKey = env.DEEPSEEK_API_KEY || "";
      model = env.DEEPSEEK_MODEL || model;
      baseUrl = (env.DEEPSEEK_API_BASE || baseUrl).replace(/\/$/, "");
    },
    configureServer(server) {
      server.middlewares.use(createAiHandler(() => ({ apiKey, model, baseUrl })));
    },
    configurePreviewServer(server) {
      server.middlewares.use(createAiHandler(() => ({ apiKey, model, baseUrl })));
    },
  };
}
