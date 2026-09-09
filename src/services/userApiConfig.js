import { loadSettings } from "./settings";
import { providerFromApiKey } from "../shared/ai-providers";

export function readUserApiConfig(settings = loadSettings()) {
  const apiKey = String(settings?.customApiKey || "").trim();
  if (!apiKey) return null;
  const provider = providerFromApiKey(apiKey);
  const baseUrl = String(settings?.customApiBase || provider?.baseUrl || "").trim();
  const model = String(settings?.customApiModel || provider?.defaultModel || "").trim();
  if (!baseUrl || !model) return null;
  return { apiKey, baseUrl, model };
}

export function withUserApiConfig(body = {}) {
  const apiConfig = readUserApiConfig();
  if (!apiConfig) return body;
  return { ...body, apiConfig };
}
