import { chatCompletion } from "./ai-client.js";

const CHAT_SYSTEM_PROMPT = `你是 TOEFL 6·6·6·6 背单词应用里的英语词汇助教。只回答与英语单词、词义、用法、辨析、托福词汇相关的问题。

要求：
1. 用简洁清晰的中文回答，必要时给出英文例句或短语。
2. 用户搞混近义/形近词时，帮助对比区分。
3. 不回答与英语学习无关的话题；若被问到，礼貌说明只能解答词汇问题。
4. 不要编造书上没有的词义；不确定时如实说明。`;

function createConfigError(message, status = 500) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function buildContextBlock(context) {
  if (!context?.currentWord) return "";
  const defs = (context.definitions || []).join("；");
  return `\n\n用户当前正在练习的单词：${context.currentWord}${defs ? `\n书上释义：${defs}` : ""}`;
}

export async function chatWithDeepSeek(payload, config = {}) {
  const { messages, context } = payload || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    throw createConfigError("缺少对话内容", 400);
  }

  const trimmed = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && String(m.content || "").trim())
    .map((m) => ({ role: m.role, content: String(m.content).trim() }));

  if (!trimmed.length || trimmed[trimmed.length - 1].role !== "user") {
    throw createConfigError("最后一条消息须为用户提问", 400);
  }

  const reply = await chatCompletion({
    config,
    maxTokens: 600,
    temperature: 0.5,
    messages: [
      { role: "system", content: CHAT_SYSTEM_PROMPT + buildContextBlock(context) },
      ...trimmed.slice(-12),
    ],
  });

  return { reply: reply.trim() };
}
