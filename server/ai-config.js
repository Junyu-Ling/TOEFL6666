import { buildProviderDefaults, getProviderById } from "../src/shared/ai-providers.js";

export function resolveApiConfig(requestConfig = {}, envConfig = {}) {
  const userKey = requestConfig?.apiKey?.trim();
  if (userKey) {
    const defaults = buildProviderDefaults(userKey, requestConfig.baseUrl, requestConfig.providerId);
    const provider = getProviderById(defaults.providerId);
    return {
      apiKey: userKey,
      baseUrl: (requestConfig.baseUrl?.trim() || defaults.baseUrl || "").replace(/\/$/, ""),
      model: requestConfig.model?.trim() || defaults.model,
      providerId: defaults.providerId,
      apiStyle: provider?.apiStyle || "openai",
      source: "user",
    };
  }

  return {
    apiKey: envConfig.apiKey || "",
    baseUrl: (envConfig.baseUrl || "https://api.deepseek.com/v1").replace(/\/$/, ""),
    model: envConfig.model || "deepseek-chat",
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
