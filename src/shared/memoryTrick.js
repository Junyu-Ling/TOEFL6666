export const MEMORY_TRICK_TYPE_LABELS = {
  root: "词根词缀",
  homophone: "谐音联想",
  story: "场景故事",
  association: "语义联想",
};

export function memoryTrickTagClass(type) {
  return type === "root" ? "memory__tag--root" : "memory__tag--homophone";
}

export function normalizeMemoryTrickPayload(data) {
  const list = Array.isArray(data?.memory_tricks) ? data.memory_tricks.filter(Boolean) : [];
  const first = list[0] || data?.memory_trick || null;
  const tricks = list.length > 0 ? list : first ? [first] : [];
  if (!first) return null;
  return {
    memory_trick: first,
    memory_tricks: tricks,
    ...(data?.pronunciation_alert || first.pronunciation_alert
      ? { pronunciation_alert: data?.pronunciation_alert || first.pronunciation_alert }
      : {}),
  };
}

export function hasCompleteMemoryTricks(entry) {
  return Array.isArray(entry?.memory_tricks) && entry.memory_tricks.length >= 2;
}

export function attachMemoryTricks(record, payload) {
  const normalized = normalizeMemoryTrickPayload(payload);
  if (!record || !normalized) return record;
  return {
    ...record,
    memory_trick: normalized.memory_trick,
    memory_tricks: normalized.memory_tricks,
  };
}

/** 非一遍过：任意一次答错，或历史上曾答错过（wrongCount >= 1） */
export function shouldFetchMemoryTrick({
  isCorrect,
  priorWrongCount,
  existingTrick,
  existingTricks,
  wordData,
}) {
  if (wordData?.transitionWord) return false;
  if (hasCompleteMemoryTricks({ memory_tricks: existingTricks })) return false;
  if (isCorrect === true) return false;
  if (isCorrect === false) return true;
  return (priorWrongCount ?? 0) >= 1;
}
