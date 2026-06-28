import { loadEnv } from "vite";
import { evaluateWithDeepSeek } from "./server/ai-evaluate.js";
import { chatWithDeepSeek } from "./server/ai-chat.js";

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

function createAiHandler(getConfig) {
  return async (req, res, next) => {
    if (req.method !== "POST") {
      return next();
    }

    const isEvaluate = matchApiPath(req.url, "/api/ai/evaluate");
    const isChat = matchApiPath(req.url, "/api/ai/chat");
    if (!isEvaluate && !isChat) {
      return next();
    }

    try {
      const body = JSON.parse(await readBody(req));
      const config = getConfig();

      if (isEvaluate) {
        const result = await evaluateWithDeepSeek(body, config);
        sendJson(res, 200, result);
        return;
      }

      const result = await chatWithDeepSeek(body, config);
      sendJson(res, 200, result);
    } catch (err) {
      sendJson(res, err.status || 500, { error: err.message || "服务器错误" });
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
