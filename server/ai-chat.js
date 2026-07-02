import { chatCompletion } from "./ai-client.js";
import { TOEFL_2026_KNOWLEDGE } from "./toefl2026-knowledge.js";

const CHAT_SYSTEM_BASE = `你是 TOEFL 6·6·6·6 背单词应用里的英语词汇与 **2026 新托福（TOEFL iBT）** 助教。

你的能力范围：
1. **英语词汇**：词义、用法、辨析、搭配、托福学术词汇（核心能力）。
2. **2026 新托福考试**：结构、时长、四科题型、1–6 分制、CEFR 对照、自适应机制、改革变化、备考方向——必须按 **2026-01-21 及以后的新版** 作答，避免信息差。

回答要求：
1. 用简洁清晰的中文回答，必要时给出英文例句或短语。
2. 用户搞混近义/形近词时，帮助对比区分。
3. 不回答与英语学习、托福考试无关的话题；若被问到，礼貌说明职责范围。
4. 不要编造书上没有的词义或 ETS 未公布的政策；不确定时如实说明并建议查阅 ets.org。
5. 讲解单词时，若拼写与读音明显不符自然拼读（如不发音字母、-ough 多变、recipe 等），用一两句点出正确读法。
6. **排版格式**：必须用 Markdown + LaTeX 输出，便于前端渲染：
   - 对比、辨析、考试结构优先用 **Markdown 表格**（| 列 | 列 |），不要用空格手对齐的纯文本表。
   - **表格每一行必须单独占一行**（表头、分隔行 |---|---|、数据行之间都要换行），禁止把整张表挤在同一行。
   - 公式或需要强调的符号用 LaTeX：行内 $...$，独立一行 $$...$$。
   - 英文单词、短语用 **粗体**；例句用 > 引用块；分点用 - 列表。
   - 不要输出 HTML；不要把整段回复包在 \`\`\`markdown 代码块里。`;

const TOEFL_TOPIC_RE =
  /托福|toefl|ibt|ets|cefr|阅读|听力|口语|写作|考试|分数|备考|改革|自适应|出分|home\s*edition/i;

function shouldIncludeToeflKnowledge(messages = []) {
  const text = messages.map((m) => m.content).join("\n");
  return TOEFL_TOPIC_RE.test(text);
}

function buildSystemPrompt(messages) {
  if (shouldIncludeToeflKnowledge(messages)) {
    return `${CHAT_SYSTEM_BASE}\n\n${TOEFL_2026_KNOWLEDGE}`;
  }
  return CHAT_SYSTEM_BASE;
}

function createConfigError(message, status = 500) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function buildContextBlock(context) {
  if (!context?.currentWord) return "";
  const defs = (context.definitions || []).join("；");
  return `\n\n用户当前正在练习的单词：${context.currentWord}${defs ? `\n书上释义：${defs}` : ""}\n若该词读音不符合自然拼读（如不发音字母、特殊元音），回答时可简要提醒正确读法。`;
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
    maxTokens: 900,
    temperature: 0.5,
    messages: [
      { role: "system", content: buildSystemPrompt(trimmed) + buildContextBlock(context) },
      ...trimmed.slice(-8),
    ],
  });

  return { reply: reply.trim() };
}
