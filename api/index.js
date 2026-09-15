import { getEnvConfig, resolveRequestConfig, stripApiConfigFromBody } from "../server/ai-config.js";
import { evaluateWithDeepSeek } from "../server/ai-evaluate.js";
import { chatWithDeepSeek, streamChatWithDeepSeek } from "../server/ai-chat.js";
import { generateMemoryTrick } from "../server/ai-memory-trick.js";
import { evaluatePronunciationWithDeepSeek } from "../server/ai-pronounce-evaluate.js";
import { lookupWordWithDeepSeek } from "../server/ai-word-lookup.js";
import { validateWordWithDeepSeek } from "../server/ai-word-validate.js";
import { generateStudyPlan, streamStudyPlan } from "../server/ai-study-plan.js";
import { identifyProviderFromKey } from "../server/ai-detect-provider.js";
import { handleSyncPush, handleSyncPull } from "../server/sync-api.js";
import { cloneOwnVoice, isClonedVoiceConfigured, synthesizeVocabWord } from "../server/tts-minimax.js";
import { handleAccessGrant, handleAccessMe, handleAccessUsers } from "../server/access-api.js";
import { handleAuthLogout, handleAuthMe, handleGithubCallback, handleGithubStart } from "../server/auth-github.js";
import { handleReadingFillArticles } from "../server/reading-fill-articles.js";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "8mb",
    },
  },
};

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.trim()) return JSON.parse(req.body);
  return {};
}

function sendSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function firstHeader(req, name) {
  const value = req.headers?.[name];
  if (Array.isArray(value)) return String(value[0] || "");
  return String(value || "");
}

function pathnameOf(req) {
  const rawRoute = req.query?.__route;
  const route = Array.isArray(rawRoute) ? rawRoute.join("/") : String(rawRoute || "");
  if (route) {
    try {
      return `/api/${decodeURIComponent(route)}`.replace(/\/+$/, "");
    } catch {
      return `/api/${route}`.replace(/\/+$/, "");
    }
  }

  const forwarded = firstHeader(req, "x-forwarded-uri").split("?")[0];
  if (forwarded.startsWith("/api/") && forwarded !== "/api") {
    return forwarded.replace(/\/+$/, "");
  }

  try {
    const path = new URL(req.url || "/", "http://n").pathname.replace(/\/+$/, "") || "/";
    if (path.startsWith("/api")) return path;
  } catch {
    const path = String(req.url || "/").split("?")[0].replace(/\/+$/, "") || "/";
    if (path.startsWith("/api")) return path;
  }
  return "/api";
}

async function handleStream(res, iterator) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  try {
    for await (const delta of iterator) {
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
  const pathname = pathnameOf(req);
  const method = req.method || "GET";

  try {
    if (pathname === "/api/tts/status") {
      if (method !== "GET") {
        sendJson(res, 405, { error: "Method Not Allowed" });
        return;
      }
      sendJson(res, 200, { available: isClonedVoiceConfigured() });
      return;
    }

    if (pathname === "/api/auth/github/start") {
      if (method !== "GET") {
        sendJson(res, 405, { error: "Method Not Allowed" });
        return;
      }
      handleGithubStart(req, res);
      return;
    }

    if (pathname === "/api/auth/github/callback") {
      if (method !== "GET") {
        sendJson(res, 405, { error: "Method Not Allowed" });
        return;
      }
      await handleGithubCallback(req, res);
      return;
    }

    if (pathname === "/api/auth/me") {
      if (method !== "GET") {
        sendJson(res, 405, { error: "Method Not Allowed" });
        return;
      }
      handleAuthMe(req, res);
      return;
    }

    if (pathname === "/api/auth/logout") {
      if (method !== "POST") {
        sendJson(res, 405, { error: "Method Not Allowed" });
        return;
      }
      handleAuthLogout(req, res);
      return;
    }

    if (pathname === "/api/access/me") {
      if (method !== "GET" && method !== "POST") {
        sendJson(res, 405, { error: "Method Not Allowed" });
        return;
      }
      sendJson(res, 200, await handleAccessMe(req));
      return;
    }

    if (pathname === "/api/access/users") {
      if (method !== "GET") {
        sendJson(res, 405, { error: "Method Not Allowed" });
        return;
      }
      sendJson(res, 200, await handleAccessUsers(req));
      return;
    }

    if (pathname === "/api/access/grant") {
      if (method !== "POST") {
        sendJson(res, 405, { error: "Method Not Allowed" });
        return;
      }
      sendJson(res, 200, await handleAccessGrant(req, parseBody(req)));
      return;
    }

    if (pathname === "/api/reading-fill/articles") {
      if (method !== "GET") {
        sendJson(res, 405, { error: "Method Not Allowed" });
        return;
      }
      res.setHeader("Cache-Control", "private, no-store");
      sendJson(res, 200, await handleReadingFillArticles(req));
      return;
    }

    if (method !== "POST") {
      sendJson(res, 405, { error: "Method Not Allowed" });
      return;
    }

    const body = parseBody(req);

    if (pathname === "/api/ai/detect-provider") {
      const result = await identifyProviderFromKey(body.apiKey);
      if (!result) {
        sendJson(res, 400, { error: "无法识别该 API Key" });
        return;
      }
      sendJson(res, 200, result);
      return;
    }

    if (pathname === "/api/sync/push") {
      sendJson(res, 200, await handleSyncPush(body));
      return;
    }

    if (pathname === "/api/sync/pull") {
      sendJson(res, 200, await handleSyncPull(body));
      return;
    }

    if (pathname === "/api/tts/clone") {
      sendJson(res, 200, await cloneOwnVoice(body));
      return;
    }

    if (pathname === "/api/tts/speak") {
      const audio = await synthesizeVocabWord({ word: body.word, voiceId: body.voiceId });
      res.statusCode = 200;
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.end(audio);
      return;
    }

    const config = resolveRequestConfig(body, getEnvConfig());
    const payload = stripApiConfigFromBody(body);

    if (pathname === "/api/ai/evaluate") {
      sendJson(res, 200, await evaluateWithDeepSeek(payload, config));
      return;
    }

    if (pathname === "/api/ai/memory-trick") {
      sendJson(res, 200, await generateMemoryTrick(payload, config));
      return;
    }

    if (pathname === "/api/ai/pronounce-evaluate") {
      sendJson(res, 200, await evaluatePronunciationWithDeepSeek(payload, config));
      return;
    }

    if (pathname === "/api/ai/word-lookup") {
      sendJson(res, 200, await lookupWordWithDeepSeek(payload, config));
      return;
    }

    if (pathname === "/api/ai/word-validate") {
      sendJson(res, 200, await validateWordWithDeepSeek(payload, config));
      return;
    }

    if (pathname === "/api/ai/study-plan") {
      if (body.stream) {
        await handleStream(res, streamStudyPlan(payload, config));
        return;
      }
      sendJson(res, 200, await generateStudyPlan(payload, config));
      return;
    }

    if (pathname === "/api/ai/chat") {
      if (body.stream) {
        await handleStream(res, streamChatWithDeepSeek(payload, config));
        return;
      }
      sendJson(res, 200, await chatWithDeepSeek(payload, config));
      return;
    }

    sendJson(res, 404, { error: "Not Found" });
  } catch (err) {
    const fallback =
      pathname === "/api/tts/clone"
        ? "克隆失败"
        : pathname.startsWith("/api/tts/")
          ? "朗读失败"
          : "服务器错误";
    sendJson(res, err.status || 500, { error: err.message || fallback });
  }
}
