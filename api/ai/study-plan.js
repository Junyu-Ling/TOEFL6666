import { resolveApiConfig, stripApiConfigFromBody } from "../../server/ai-config.js";
import { generateStudyPlan, streamStudyPlan } from "../../server/ai-study-plan.js";

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function sendSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.trim()) return JSON.parse(req.body);
  return {};
}

function getEnvConfig() {
  return {
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: process.env.DEEPSEEK_MODEL,
    baseUrl: process.env.DEEPSEEK_API_BASE,
    providerId: "deepseek",
  };
}

async function handleStream(res, payload, config) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  try {
    for await (const delta of streamStudyPlan(payload, config)) {
      sendSse(res, { delta });
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    sendSse(res, { error: err.message || "流式输出失败" });
    res.end();
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }

  try {
    const body = parseBody(req);
    const config = resolveApiConfig(getEnvConfig());
    const payload = stripApiConfigFromBody(body);

    if (body.stream) {
      await handleStream(res, payload, config);
      return;
    }

    const result = await generateStudyPlan(payload, config);
    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, err.status || 500, { error: err.message || "服务器错误" });
  }
}
