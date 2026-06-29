import { loadSettings } from "./settings";

export function getRequestApiConfig(settings = loadSettings()) {
  if (!settings.useCustomAiApi) return undefined;

  const apiKey = settings.aiApiKey?.trim();
  if (!apiKey) return undefined;

  return {
    apiKey,
    baseUrl: settings.aiBaseUrl?.trim() || undefined,
    model: settings.aiModel?.trim() || undefined,
    providerId: settings.aiProviderId?.trim() || undefined,
  };
}
