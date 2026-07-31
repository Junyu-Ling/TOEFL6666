import { JSON_MODE_PROVIDER_IDS } from "../src/shared/ai-providers.js";

function createConfigError(message, status = 500) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function splitMessages(messages) {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const conversation = messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({ role: message.role, content: message.content }));
  return { system, conversation };
}

function resolveChatCompletionsUrl(baseUrl, providerId = "") {
  let clean = baseUrl.replace(/\/$/, "");
  if (clean.endsWith("/chat/completions")) return clean;

  const isDeepseek = providerId === "deepseek" || /deepseek\.com/i.test(clean);
  if (isDeepseek && !/\/v\d+$/i.test(clean)) {
    clean = `${clean}/v1`;
  }

  return `${clean}/chat/completions`;
}

function isDeepSeekEndpoint(providerId, baseUrl) {
  return providerId === "deepseek" || /deepseek\.com/i.test(baseUrl || "");
}

function extractAssistantText(message) {
  if (!message) return "";
  const content = String(message.content ?? "").trim();
  if (content) return content;
  return String(message.reasoning_content ?? "").trim();
}

async function openaiCompatibleChat({
  apiKey,
  baseUrl,
  model,
  messages,
  maxTokens,
  temperature,
  responseFormat,
  providerId,
}) {
  const body = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages,
  };

  if (responseFormat === "json" && JSON_MODE_PROVIDER_IDS.has(providerId)) {
    body.response_format = { type: "json_object" };
  }

  // V4 默认开启 thinking，JSON 批改等场景会在 content 留空；关闭后走普通输出。
  if (isDeepSeekEndpoint(providerId, baseUrl)) {
    body.thinking = { type: "disabled" };
  }

  const response = await fetch(resolveChatCompletionsUrl(baseUrl, providerId), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw createConfigError(data.error?.message || data.error?.msg || data.message || "AI API 请求失败", response.status);
  }

  const message = data.choices?.[0]?.message;
  const text = extractAssistantText(message);
  if (!text) {
    const finishReason = data.choices?.[0]?.finish_reason;
    throw createConfigError(
      finishReason === "length"
        ? "AI 输出被截断，请稍后重试"
        : "AI 未返回有效内容，请确认 DEEPSEEK_API_KEY 与 DEEPSEEK_MODEL 配置正确",
      502
    );
  }
  return text;
}

async function* openaiCompatibleChatStream({
  apiKey,
  baseUrl,
  model,
  messages,
  maxTokens,
  temperature,
  providerId,
}) {
  const response = await fetch(resolveChatCompletionsUrl(baseUrl, providerId), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages,
      stream: true,
      ...(isDeepSeekEndpoint(providerId, baseUrl) ? { thinking: { type: "disabled" } } : {}),
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw createConfigError(
      data.error?.message || data.error?.msg || data.message || "AI API 请求失败",
      response.status
    );
  }

  if (!response.body) {
    throw createConfigError("AI 流式响应不可用", 502);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      try {
        const parsed = JSON.parse(payload);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // ignore malformed chunks
      }
    }
  }
}

async function anthropicChat({ apiKey, baseUrl, model, messages, maxTokens, temperature }) {
  const { system, conversation } = splitMessages(messages);
  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: system || undefined,
      messages: conversation,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw createConfigError(data.error?.message || data.error?.type || "Anthropic API 请求失败", response.status);
  }

  const text = extractAssistantText({ content: data.content?.map((block) => block.text).join("") });
  if (!text) throw createConfigError("AI 未返回有效内容，请确认 API 配置正确", 502);
  return text;
}

export async function chatCompletion({
  config,
  messages,
  maxTokens = 512,
  temperature = 0.3,
  responseFormat,
}) {
  const { apiKey, baseUrl, model, providerId, apiStyle } = config;

  if (!apiKey) {
    throw createConfigError("未配置 API Key，请设置 DEEPSEEK_API_KEY 环境变量", 500);
  }
  if (!baseUrl) {
    throw createConfigError("未配置 API 地址，请设置 DEEPSEEK_API_BASE 环境变量", 500);
  }
  if (!model) {
    throw createConfigError("未配置模型名称，请设置 DEEPSEEK_MODEL 环境变量", 500);
  }

  const enrichedMessages =
    responseFormat === "json" && !JSON_MODE_PROVIDER_IDS.has(providerId)
      ? messages.map((message, index) =>
          message.role === "system" && index === messages.findIndex((item) => item.role === "system")
            ? {
                ...message,
                content: `${message.content}\n\n你必须只返回一个 JSON 对象，不要输出其它文字或 Markdown。`,
              }
            : message
        )
      : messages;

  if (apiStyle === "anthropic") {
    return anthropicChat({
      apiKey,
      baseUrl,
      model,
      messages: enrichedMessages,
      maxTokens,
      temperature,
    });
  }

  return openaiCompatibleChat({
    apiKey,
    baseUrl,
    model,
    messages: enrichedMessages,
    maxTokens,
    temperature,
    responseFormat,
    providerId,
  });
}

export async function* streamChatCompletion({
  config,
  messages,
  maxTokens = 512,
  temperature = 0.3,
}) {
  const { apiKey, baseUrl, model, providerId, apiStyle } = config;

  if (!apiKey) {
    throw createConfigError("未配置 API Key，请设置 DEEPSEEK_API_KEY 环境变量", 500);
  }
  if (!baseUrl) {
    throw createConfigError("未配置 API 地址，请设置 DEEPSEEK_API_BASE 环境变量", 500);
  }
  if (!model) {
    throw createConfigError("未配置模型名称，请设置 DEEPSEEK_MODEL 环境变量", 500);
  }

  if (apiStyle === "anthropic") {
    throw createConfigError("当前 API 暂不支持流式输出", 501);
  }

  yield* openaiCompatibleChatStream({
    apiKey,
    baseUrl,
    model,
    messages,
    maxTokens,
    temperature,
    providerId,
  });
}
