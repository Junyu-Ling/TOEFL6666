import { handleApiRequest } from "./api-router.js";

const STRING_ENV_KEYS = [
  "DEEPSEEK_API_KEY",
  "DEEPSEEK_MODEL",
  "DEEPSEEK_API_BASE",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "OPENAI_API_BASE",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "GOOGLE_TRANSLATE_API_KEY",
];

function applyWorkerEnv(env) {
  if (typeof process === "undefined" || !process.env || !env) return;

  process.env.CF_WORKER = "1";

  for (const key of STRING_ENV_KEYS) {
    const value = env[key];
    if (typeof value === "string" && value) {
      process.env[key] = value;
    }
  }
}

export default {
  async fetch(request, env) {
    applyWorkerEnv(env);

    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApiRequest(request);
    }

    if (!env.ASSETS) {
      return new Response("Static assets binding missing", { status: 500 });
    }

    return env.ASSETS.fetch(request);
  },
};
