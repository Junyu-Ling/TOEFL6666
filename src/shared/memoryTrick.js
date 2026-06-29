export const MEMORY_TRICK_WRONG_THRESHOLD = 3;

export const MEMORY_TRICK_TYPE_LABELS = {
  root: "词根词缀",
  homophone: "谐音联想",
  story: "场景故事",
  association: "语义联想",
};

export function memoryTrickTagClass(type) {
  return type === "root" ? "memory__tag--root" : "memory__tag--homophone";
}

export function shouldFetchMemoryTrick({ isCorrect, priorWrongCount, existingTrick }) {
  if (isCorrect) return false;
  if (existingTrick) return false;
  return (priorWrongCount ?? 0) + 1 >= MEMORY_TRICK_WRONG_THRESHOLD;
}
