import { loadSettings } from "./settings";

export function readUserApiConfig(settings = loadSettings()) {
  const apiKey = String(settings?.customApiKey || "").trim();
  const baseUrl = String(settings?.customApiBase || "").trim();
  const model = String(settings?.customApiModel || "").trim();
  if (!apiKey || !baseUrl || !model) return null;
  return { apiKey, baseUrl, model };
}

export function withUserApiConfig(body = {}) {
  const apiConfig = readUserApiConfig();
  if (!apiConfig) return body;
  return { ...body, apiConfig };
}
