/** @typedef {{ id: string, name: string, baseUrl: string, defaultModel: string, apiStyle?: 'openai'|'anthropic', detect: (key: string, url?: string) => boolean }} AiProvider */

/** @type {AiProvider[]} */
export const AI_PROVIDERS = [
  {
    id: "anthropic",
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com",
    defaultModel: "claude-3-5-haiku-latest",
    apiStyle: "anthropic",
    detect: (key) => /^sk-ant-/.test(key),
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    detect: (key, url) => /^sk-or-/.test(key) || /openrouter\.ai/i.test(url || ""),
  },
  {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    detect: (key, url) => /^gsk_/.test(key) || /groq\.com/i.test(url || ""),
  },
  {
    id: "google",
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.0-flash",
    detect: (key, url) => /^AIza[\w-]{20,}/.test(key) || /generativelanguage\.googleapis\.com/i.test(url || ""),
  },
  {
    id: "zhipu",
    name: "智谱 AI",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    defaultModel: "glm-4-flash",
    detect: (key, url) =>
      /^[a-zA-Z0-9]{16,}\.[a-zA-Z0-9]{16,}$/.test(key) || /bigmodel\.cn/i.test(url || ""),
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    detect: (key, url) => /deepseek\.com/i.test(url || ""),
  },
  {
    id: "moonshot",
    name: "Moonshot / Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    defaultModel: "moonshot-v1-8k",
    detect: (key, url) => /moonshot\.cn/i.test(url || ""),
  },
  {
    id: "qwen",
    name: "通义千问",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-turbo",
    detect: (key, url) =>
      /dashscope\.aliyuncs\.com/i.test(url || "") || /aliyun/i.test(url || ""),
  },
  {
    id: "siliconflow",
    name: "硅基流动",
    baseUrl: "https://api.siliconflow.cn/v1",
    defaultModel: "deepseek-ai/DeepSeek-V3",
    detect: (key, url) => /siliconflow\.cn/i.test(url || ""),
  },
  {
    id: "doubao",
    name: "豆包 / 火山引擎",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    defaultModel: "",
    detect: (key, url) => /volces\.com/i.test(url || "") || /doubao/i.test(url || ""),
  },
  {
    id: "baichuan",
    name: "百川智能",
    baseUrl: "https://api.baichuan-ai.com/v1",
    defaultModel: "Baichuan4-Turbo",
    detect: (key, url) => /baichuan/i.test(url || ""),
  },
  {
    id: "minimax",
    name: "MiniMax",
    baseUrl: "https://api.minimax.chat/v1",
    defaultModel: "abab6.5-chat",
    detect: (key, url) => /minimax/i.test(url || ""),
  },
  {
    id: "tencent",
    name: "腾讯混元",
    baseUrl: "https://api.hunyuan.cloud.tencent.com/v1",
    defaultModel: "hunyuan-lite",
    detect: (key, url) => /hunyuan|tencent/i.test(url || ""),
  },
  {
    id: "baidu",
    name: "百度千帆",
    baseUrl: "https://qianfan.baidubce.com/v2",
    defaultModel: "ernie-4.0-turbo-8k",
    detect: (key, url) => /qianfan|baidubce/i.test(url || "") || /^bce-v3\//.test(key),
  },
  {
    id: "mistral",
    name: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-small-latest",
    detect: (key, url) => /mistral\.ai/i.test(url || ""),
  },
  {
    id: "xai",
    name: "xAI",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-2-latest",
    detect: (key, url) => /api\.x\.ai/i.test(url || ""),
  },
  {
    id: "azure-openai",
    name: "Azure OpenAI",
    baseUrl: "",
    defaultModel: "gpt-4o-mini",
    detect: (key, url) => /openai\.azure\.com/i.test(url || ""),
  },
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    detect: (key, url) =>
      /^sk-proj-/.test(key) || (/^sk-[a-zA-Z0-9]{10,}/.test(key) && !/^sk-ant-/.test(key) && !/^sk-or-/.test(key)) || /api\.openai\.com/i.test(url || ""),
  },
  {
    id: "custom",
    name: "自定义（OpenAI 兼容）",
    baseUrl: "",
    defaultModel: "",
    detect: () => false,
  },
];

export function getProviderById(id) {
  return AI_PROVIDERS.find((provider) => provider.id === id) ?? AI_PROVIDERS.find((p) => p.id === "custom");
}

export function hostFromUrl(url) {
  if (!url?.trim()) return "";
  try {
    return new URL(url.trim()).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

export function detectProvider(apiKey, baseUrl = "") {
  const key = (apiKey || "").trim();
  const url = (baseUrl || "").trim();
  if (!key && !url) return null;

  for (const provider of AI_PROVIDERS) {
    if (provider.id === "custom") continue;
    if (provider.detect(key, url)) return provider;
  }

  if (url) {
    const host = hostFromUrl(url);
    const byHost = AI_PROVIDERS.find((provider) => {
      if (!provider.baseUrl || provider.id === "custom") return false;
      const providerHost = hostFromUrl(provider.baseUrl);
      return providerHost && (host === providerHost || host.endsWith(`.${providerHost}`) || providerHost.includes(host));
    });
    if (byHost) return byHost;
  }

  if (key) return getProviderById("custom");
  return null;
}

export function buildProviderDefaults(apiKey, baseUrl = "", providerId = "") {
  const provider = (providerId && getProviderById(providerId)) || detectProvider(apiKey, baseUrl) || getProviderById("custom");
  return {
    providerId: provider.id,
    providerName: provider.name,
    baseUrl: baseUrl.trim() || provider.baseUrl,
    model: provider.defaultModel,
    apiStyle: provider.apiStyle || "openai",
  };
}

export const JSON_MODE_PROVIDER_IDS = new Set([
  "openai",
  "deepseek",
  "moonshot",
  "qwen",
  "siliconflow",
  "groq",
  "openrouter",
  "mistral",
  "xai",
  "doubao",
  "tencent",
  "baidu",
  "zhipu",
  "google",
  "azure-openai",
  "custom",
]);
