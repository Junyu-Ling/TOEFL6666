import { enqueueMemoryTrickRequest, memoryTrickKey } from "./memoryTrickQueue";
import { hasCompleteMemoryTricks, normalizeMemoryTrickPayload } from "../shared/memoryTrick";
import { withUserApiConfig } from "./userApiConfig";

export async function fetchMemoryTrick(wordData) {
  if (wordData?.transitionWord) return null;

  const key = memoryTrickKey(wordData);

  return enqueueMemoryTrickRequest(key, async () => {
    const res = await fetch("/api/ai/memory-trick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withUserApiConfig({
        word: wordData.word,
        definitions: wordData.definitions,
      })),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || `记忆法生成失败 (${res.status})`);
    }

    const payload = normalizeMemoryTrickPayload(data);
    if (!hasCompleteMemoryTricks(payload)) {
      throw new Error("记忆法生成不完整，请重试");
    }

    return payload;
  });
}
