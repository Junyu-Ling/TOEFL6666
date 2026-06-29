import {
  MEMORY_TRICK_TYPE_LABELS,
  memoryTrickTagClass,
} from "../shared/memoryTrick";

export default function MemoryTrickBlock({ trick, compact = false, className = "" }) {
  if (!trick) return null;

  const type = trick.type || "association";
  const label = MEMORY_TRICK_TYPE_LABELS[type] || "记忆法";

  return (
    <div className={`flashcard__memory ${className}`.trim()}>
      <div className="memory__header">
        <span className={`memory__tag ${memoryTrickTagClass(type)}`}>{label}</span>
        {trick.formula ? <span className="memory__formula">{trick.formula}</span> : null}
      </div>
      {trick.content ? (
        <p className={compact ? "memory__content memory__content--compact" : "memory__content"}>
          {trick.content}
        </p>
      ) : null}
    </div>
  );
}
