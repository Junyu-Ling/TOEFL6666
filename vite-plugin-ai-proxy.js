import { loadEnv } from "vite";
import { resolveApiConfig, stripApiConfigFromBody } from "./server/ai-config.js";
import { evaluateWithDeepSeek } from "./server/ai-evaluate.js";
import { chatWithDeepSeek } from "./server/ai-chat.js";
import { generateMemoryTrick } from "./server/ai-memory-trick.js";

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
    if (!isEvaluate && !isChat && !isMemoryTrick) {
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
