import { useState } from "react";
import {
  MEMORY_TRICK_TYPE_LABELS,
  memoryTrickTagClass,
} from "../shared/memoryTrick";

export default function MemoryTrickBlock({ trick, tricks, compact = false, className = "" }) {
  // tricks 是数组（多个记忆法），trick 是单个（兼容旧格式）
  const allTricks = tricks && Array.isArray(tricks) && tricks.length > 0 ? tricks : (trick ? [trick] : []);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  if (allTricks.length === 0) return null;

  const currentTrick = allTricks[currentIndex];
  const type = currentTrick.type || "association";
  const label = MEMORY_TRICK_TYPE_LABELS[type] || "记忆法";
  const hasMultiple = allTricks.length > 1;

  const handleSwitch = () => {
    setCurrentIndex((prev) => (prev + 1) % allTricks.length);
  };

  return (
    <div className={`flashcard__memory ${className}`.trim()}>
      <div className="memory__header">
        <span className={`memory__tag ${memoryTrickTagClass(type)}`}>{label}</span>
        {currentTrick.formula ? <span className="memory__formula">{currentTrick.formula}</span> : null}
        {hasMultiple && (
          <button
            type="button"
            className="memory__switch-btn"
            onClick={handleSwitch}
            title="切换记忆法方式"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h18M3 12l6-6M3 12l6 6"/>
              <circle cx="12" cy="12" r="2" fill="currentColor"/>
            </svg>
            切换
            <span className="memory__switch-count">
              {currentIndex + 1}/{allTricks.length}
            </span>
          </button>
        )}
      </div>
      {currentTrick.content ? (
        <p className={compact ? "memory__content memory__content--compact" : "memory__content"}>
          {currentTrick.content}
        </p>
      ) : null}
    </div>
  );
}
