import { loadSettings } from "./settings";

export function getRequestApiConfig(settings = loadSettings()) {
  const apiKey = settings.aiApiKey?.trim();
  if (!apiKey) return undefined;
  return { apiKey };
}
