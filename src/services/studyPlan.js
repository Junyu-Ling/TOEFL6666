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

export async function streamStudyPlan({ payload, onDelta, signal }) {
  const res = await fetch("/api/ai/study-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, stream: true }),
    signal,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `生成计划失败 (${res.status})`);
  }

  if (!res.body) {
    throw new Error("AI 流式响应不可用");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let plan = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = parseSseEvents(buffer);
    buffer = rest;

    for (const event of events) {
      if (event.error) throw new Error(event.error);
      if (event.delta) {
        plan += event.delta;
        onDelta?.(event.delta, plan);
      }
    }
  }

  if (buffer.trim()) {
    const { events } = parseSseEvents(`${buffer}\n\n`);
    for (const event of events) {
      if (event.error) throw new Error(event.error);
      if (event.delta) {
        plan += event.delta;
        onDelta?.(event.delta, plan);
      }
    }
  }

  return plan.trim();
}
