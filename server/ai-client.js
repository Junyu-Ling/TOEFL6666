import { JSON_MODE_PROVIDER_IDS } from "../src/shared/ai-providers.js";
import { toAnthropicMessageContent } from "./ai-message.js";

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
  if (
    providerId === "deepseek" ||
    (/deepseek\.com/i.test(clean) && !/\/v\d+$/i.test(clean))
  ) {
    clean = `${clean}/v1`;
  }
  return `${clean}/chat/completions`;
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

  const text = data.choices?.[0]?.message?.content;
  if (!text) throw createConfigError("AI 未返回有效内容", 502);
  return text;
}

async function anthropicChat({ apiKey, baseUrl, model, messages, maxTokens, temperature }) {
  const { system, conversation } = splitMessages(messages);
  const anthropicMessages = conversation.map((message) => ({
    role: message.role,
    content: toAnthropicMessageContent(message.content),
  }));
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
      messages: anthropicMessages,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw createConfigError(data.error?.message || data.error?.type || "Anthropic API 请求失败", response.status);
  }

  const text = data.content?.map((block) => block.text).join("").trim();
  if (!text) throw createConfigError("AI 未返回有效内容", 502);
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
    throw createConfigError("未配置 API Key，请在设置中填写或使用服务端环境变量", 500);
  }
  if (!baseUrl) {
    throw createConfigError("未配置 API 地址，请在设置中填写 Base URL", 500);
  }
  if (!model) {
    throw createConfigError("未配置模型名称，请在设置中填写 Model", 500);
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
