export const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash";

/** 本站统一用 Flash；Pro / Reasoner / 已退役 chat 均回落到 Flash。 */
const BLOCKED_DEEPSEEK_MODEL_RE = /(?:^|[\-.])pro(?:$|[\-.])|reasoner|deepseek-chat/i;

export function normalizeDeepSeekModel(model) {
  const value = String(model || DEFAULT_DEEPSEEK_MODEL).trim();
  if (!value || BLOCKED_DEEPSEEK_MODEL_RE.test(value)) {
    return DEFAULT_DEEPSEEK_MODEL;
  }
  return value;
}

function readEnv(env) {
  if (env && typeof env === "object") return env;
  if (typeof process !== "undefined" && process.env) return process.env;
  return {};
}

/**
 * 从运行时环境读取后端模型配置。密钥只来自 process.env / Worker env，不进前端。
 * 优先 DeepSeek（与现网一致）；未配置时回落 Gemini / OpenAI。
 */
export function getEnvConfig(env) {
  const e = readEnv(env);

  if (e.DEEPSEEK_API_KEY) {
    return {
      apiKey: e.DEEPSEEK_API_KEY,
      model: e.DEEPSEEK_MODEL,
      baseUrl: e.DEEPSEEK_API_BASE || "https://api.deepseek.com/v1",
      providerId: "deepseek",
      apiStyle: "openai",
    };
  }

  if (e.GEMINI_API_KEY) {
    return {
      apiKey: e.GEMINI_API_KEY,
      model: e.GEMINI_MODEL || "gemini-2.0-flash",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      providerId: "google",
      apiStyle: "openai",
    };
  }

  if (e.OPENAI_API_KEY) {
    return {
      apiKey: e.OPENAI_API_KEY,
      model: e.OPENAI_MODEL || "gpt-4o-mini",
      baseUrl: e.OPENAI_API_BASE || "https://api.openai.com/v1",
      providerId: "openai",
      apiStyle: "openai",
    };
  }

  return {
    apiKey: "",
    model: DEFAULT_DEEPSEEK_MODEL,
    baseUrl: "https://api.deepseek.com/v1",
    providerId: "deepseek",
    apiStyle: "openai",
  };
}

export function resolveApiConfig(envConfig = {}) {
  const providerId = envConfig.providerId || "deepseek";
  const model =
    providerId === "deepseek"
      ? normalizeDeepSeekModel(envConfig.model)
      : String(envConfig.model || "").trim();

  return {
    apiKey: envConfig.apiKey || "",
    baseUrl: (envConfig.baseUrl || "https://api.deepseek.com/v1").replace(/\/$/, ""),
    model,
    providerId,
    apiStyle: envConfig.apiStyle || "openai",
    source: "env",
  };
}

export function stripApiConfigFromBody(body) {
  if (!body || typeof body !== "object") return body;
  const { apiConfig, ...rest } = body;
  return rest;
}
