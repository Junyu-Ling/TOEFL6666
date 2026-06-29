import { loadSettings } from "./settings";
import { getRequestApiConfig } from "./aiConfig";

export async function sendVocabChat({ messages, context }) {
  const apiConfig = getRequestApiConfig(loadSettings());
  const textOnlyMessages = messages.map((m) => ({
    role: m.role,
    content: String(m.content || "").trim(),
  }));

  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: textOnlyMessages,
      context,
      ...(apiConfig ? { apiConfig } : {}),
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `AI 回答失败 (${res.status})`);
  }

  return data;
}
