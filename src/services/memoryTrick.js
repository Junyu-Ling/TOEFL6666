import { enqueueMemoryTrickRequest, memoryTrickKey } from "./memoryTrickQueue";
import { normalizeMemoryTrickPayload } from "../shared/memoryTrick";

export async function fetchMemoryTrick(wordData) {
  if (wordData?.transitionWord) return null;

  const key = memoryTrickKey(wordData);

  return enqueueMemoryTrickRequest(key, async () => {
    const res = await fetch("/api/ai/memory-trick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        word: wordData.word,
        definitions: wordData.definitions,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || `记忆法生成失败 (${res.status})`);
    }

    const payload = normalizeMemoryTrickPayload(data);
    if (!payload) {
      throw new Error("记忆法返回格式无效");
    }

    return payload;
  });
}
