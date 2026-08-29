import { getEnvConfig, resolveApiConfig, stripApiConfigFromBody } from "../server/ai-config.js";
import { evaluateWithDeepSeek } from "../server/ai-evaluate.js";
import { chatWithDeepSeek, streamChatWithDeepSeek } from "../server/ai-chat.js";
import { generateMemoryTrick } from "../server/ai-memory-trick.js";
import { evaluatePronunciationWithDeepSeek } from "../server/ai-pronounce-evaluate.js";
import { lookupWordWithDeepSeek } from "../server/ai-word-lookup.js";
import { validateWordWithDeepSeek } from "../server/ai-word-validate.js";
import { generateStudyPlan, streamStudyPlan } from "../server/ai-study-plan.js";
import { handleSyncPull, handleSyncPush } from "../server/sync-api.js";
import { jsonResponse, methodNotAllowed, readJsonBody, redirectWordlists, sseResponse } from "./http.js";

function matchPath(pathname, path) {
  return pathname === path;
}

function apiConfigFromEnv() {
  return resolveApiConfig(getEnvConfig());
}

export async function handleApiRequest(request) {
  const redirect = redirectWordlists(request);
  if (redirect) return redirect;

  const url = new URL(request.url);
  const { pathname } = url;

  if (!pathname.startsWith("/api/")) {
    return null;
  }

  if (request.method !== "POST") {
    return methodNotAllowed();
  }

  try {
    const body = await readJsonBody(request);
    const config = apiConfigFromEnv();
    const payload = stripApiConfigFromBody(body);

    if (matchPath(pathname, "/api/ai/evaluate")) {
      const result = await evaluateWithDeepSeek(payload, config);
      return jsonResponse(200, result);
    }

    if (matchPath(pathname, "/api/ai/memory-trick")) {
      const result = await generateMemoryTrick(payload, config);
      return jsonResponse(200, result);
    }

    if (matchPath(pathname, "/api/ai/pronounce-evaluate")) {
      const result = await evaluatePronunciationWithDeepSeek(payload, config);
      return jsonResponse(200, result);
    }

    if (matchPath(pathname, "/api/ai/word-lookup")) {
      const result = await lookupWordWithDeepSeek(payload, config);
      return jsonResponse(200, result);
    }

    if (matchPath(pathname, "/api/ai/word-validate")) {
      const result = await validateWordWithDeepSeek(payload, config);
      return jsonResponse(200, result);
    }

    if (matchPath(pathname, "/api/ai/study-plan")) {
      if (body.stream) {
        return sseResponse(streamStudyPlan(payload, config));
      }
      const result = await generateStudyPlan(payload, config);
      return jsonResponse(200, result);
    }

    if (matchPath(pathname, "/api/ai/chat")) {
      if (body.stream) {
        return sseResponse(streamChatWithDeepSeek(payload, config));
      }
      const result = await chatWithDeepSeek(payload, config);
      return jsonResponse(200, result);
    }

    if (matchPath(pathname, "/api/sync/push")) {
      const result = await handleSyncPush(body);
      return jsonResponse(200, result);
    }

    if (matchPath(pathname, "/api/sync/pull")) {
      const result = await handleSyncPull(body);
      return jsonResponse(200, result);
    }

    return jsonResponse(404, { error: "Not Found" });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return jsonResponse(400, { error: "请求体不是有效 JSON" });
    }
    return jsonResponse(err.status || 500, { error: err.message || "服务器错误" });
  }
}
