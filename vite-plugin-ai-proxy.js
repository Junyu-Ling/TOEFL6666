import { loadEnv } from "vite";
import { resolveApiConfig, stripApiConfigFromBody } from "./server/ai-config.js";
import { evaluateWithDeepSeek } from "./server/ai-evaluate.js";
import { chatWithDeepSeek, streamChatWithDeepSeek } from "./server/ai-chat.js";
import { generateMemoryTrick } from "./server/ai-memory-trick.js";
import { evaluatePronunciationWithDeepSeek } from "./server/ai-pronounce-evaluate.js";
import { lookupWordWithDeepSeek } from "./server/ai-word-lookup.js";

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

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function sendSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

async function handleStreamChat(res, payload, config) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  try {
    for await (const delta of streamChatWithDeepSeek(payload, config)) {
      sendSse(res, { delta });
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    sendSse(res, { error: err.message || "流式输出失败" });
    res.end();
  }
}

function matchApiPath(url, path) {
  return url === path || url?.startsWith(`${path}?`);
}

export function createAiHandler(getEnvConfig) {
  return async (req, res, next) => {
    if (req.method !== "POST") {
      return next();
    }

    const isEvaluate = matchApiPath(req.url, "/api/ai/evaluate");
    const isChat = matchApiPath(req.url, "/api/ai/chat");
    const isMemoryTrick = matchApiPath(req.url, "/api/ai/memory-trick");
    const isPronounceEvaluate = matchApiPath(req.url, "/api/ai/pronounce-evaluate");
    const isWordLookup = matchApiPath(req.url, "/api/ai/word-lookup");
    if (!isEvaluate && !isChat && !isMemoryTrick && !isPronounceEvaluate && !isWordLookup) {
      return next();
    }

    try {
      const body = JSON.parse(await readBody(req));
      const config = resolveApiConfig(getEnvConfig());
      const payload = stripApiConfigFromBody(body);

      if (isEvaluate) {
        const result = await evaluateWithDeepSeek(payload, config);
        sendJson(res, 200, result);
        return;
      }

      if (isMemoryTrick) {
        const result = await generateMemoryTrick(payload, config);
        sendJson(res, 200, result);
        return;
      }

      if (isPronounceEvaluate) {
        const result = await evaluatePronunciationWithDeepSeek(payload, config);
        sendJson(res, 200, result);
        return;
      }

      if (isWordLookup) {
        const result = await lookupWordWithDeepSeek(payload, config);
        sendJson(res, 200, result);
        return;
      }

      if (body.stream) {
        await handleStreamChat(res, payload, config);
        return;
      }

      const result = await chatWithDeepSeek(payload, config);
      sendJson(res, 200, result);
    } catch (err) {
      sendJson(res, err.status || 500, { error: err.message || "服务器错误" });
    }
  };
}

export function aiProxyPlugin() {
  let envConfig = {
    apiKey: "",
    model: "deepseek-chat",
    baseUrl: "https://api.deepseek.com/v1",
    providerId: "deepseek",
  };

  return {
    name: "ai-proxy",
    configResolved(config) {
      const env = loadEnv(config.mode, config.root, "");
      envConfig = {
        apiKey: env.DEEPSEEK_API_KEY || "",
        model: env.DEEPSEEK_MODEL || "deepseek-chat",
        baseUrl: (env.DEEPSEEK_API_BASE || "https://api.deepseek.com/v1").replace(/\/$/, ""),
        providerId: "deepseek",
      };
    },
    configureServer(server) {
      server.middlewares.use(createAiHandler(() => envConfig));
    },
  };
}
