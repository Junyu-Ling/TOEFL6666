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

export function resolveApiConfig(envConfig = {}) {
  return {
    apiKey: envConfig.apiKey || "",
    baseUrl: (envConfig.baseUrl || "https://api.deepseek.com/v1").replace(/\/$/, ""),
    model: normalizeDeepSeekModel(envConfig.model),
    providerId: envConfig.providerId || "deepseek",
    apiStyle: "openai",
    source: "env",
  };
}

export function stripApiConfigFromBody(body) {
  if (!body || typeof body !== "object") return body;
  const { apiConfig, ...rest } = body;
  return rest;
}
