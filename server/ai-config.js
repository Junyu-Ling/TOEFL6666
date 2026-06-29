export function resolveApiConfig(envConfig = {}) {
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
