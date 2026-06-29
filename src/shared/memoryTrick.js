export const MEMORY_TRICK_TYPE_LABELS = {
  root: "词根词缀",
  homophone: "谐音联想",
  story: "场景故事",
  association: "语义联想",
};

export function memoryTrickTagClass(type) {
  return type === "root" ? "memory__tag--root" : "memory__tag--homophone";
}

/** 非一遍过：任意一次答错，或历史上曾答错过（wrongCount >= 1） */
export function shouldFetchMemoryTrick({ isCorrect, priorWrongCount, existingTrick }) {
  if (existingTrick) return false;
  if (isCorrect === true) return false;
  if (isCorrect === false) return true;
  return (priorWrongCount ?? 0) >= 1;
}
