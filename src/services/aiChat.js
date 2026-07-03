function parseSseEvents(buffer) {
  const events = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() || "";

  for (const part of parts) {
    for (const line of part.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      try {
        events.push(JSON.parse(payload));
      } catch {
        // ignore malformed chunks
      }
    }
  }

  return { events, rest };
}

export async function streamVocabChat({ messages, context, onDelta, signal }) {
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
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `AI 回答失败 (${res.status})`);
  }

  if (!res.body) {
    throw new Error("AI 流式响应不可用");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let reply = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = parseSseEvents(buffer);
    buffer = rest;

    for (const event of events) {
      if (event.error) {
        throw new Error(event.error);
      }
      if (event.delta) {
        reply += event.delta;
        onDelta?.(event.delta, reply);
      }
    }
  }

  if (buffer.trim()) {
    const { events } = parseSseEvents(`${buffer}\n\n`);
    for (const event of events) {
      if (event.error) throw new Error(event.error);
      if (event.delta) {
        reply += event.delta;
        onDelta?.(event.delta, reply);
      }
    }
  }

  return { reply: reply.trim() };
}

export async function sendVocabChat({ messages, context }) {
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
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `AI 回答失败 (${res.status})`);
  }

  return data;
}
