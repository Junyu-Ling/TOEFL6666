import { getProviderById, KEY_PROBE_PROVIDER_IDS, providerFromApiKey } from "../src/shared/ai-providers.js";

function timeoutSignal(ms) {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function toResult(provider) {
  return {
    providerId: provider.id,
    providerName: provider.name,
    baseUrl: provider.baseUrl,
    model: provider.defaultModel,
    apiStyle: provider.apiStyle || "openai",
  };
}

async function probeModels(provider, apiKey) {
  if (!provider?.baseUrl || !provider.defaultModel) return false;
  const base = provider.baseUrl.replace(/\/$/, "");
  const url = provider.apiStyle === "anthropic" ? `${base}/v1/models` : `${base}/models`;
  const headers =
    provider.apiStyle === "anthropic"
      ? { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }
      : { Authorization: `Bearer ${apiKey}` };

  try {
    const res = await fetch(url, { headers, signal: timeoutSignal(4500) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function identifyProviderFromKey(apiKey) {
  const key = String(apiKey || "").trim();
  if (!key || key.length > 2048) return null;

  const detected = providerFromApiKey(key);
  if (detected) return toResult(detected);

  for (const id of KEY_PROBE_PROVIDER_IDS) {
    const provider = getProviderById(id);
    if (!provider || provider.id === "custom") continue;
    if (await probeModels(provider, key)) return toResult(provider);
  }

  return null;
}
