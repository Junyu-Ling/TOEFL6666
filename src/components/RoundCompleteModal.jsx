import { useEffect, useRef } from "react";
import { isMarkKnownKey } from "../utils/appKeyboard";

export default function RoundCompleteModal({ 
  roundNumber, 
  wordsInRound,
  correctCount,
  wrongCount,
  onReviewAgain,
  onNextRound 
}) {
  const reviewButtonRef = useRef(null);
  const nextButtonRef = useRef(null);

  useEffect(() => {
    // 默认聚焦到"复习本轮"按钮
    reviewButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      if (isMarkKnownKey(e)) {
        e.preventDefault();
        onReviewAgain();
      } else if (e.key === "2" || e.code === "Digit2" || e.code === "Numpad2" || e.key === "Enter") {
        e.preventDefault();
        onNextRound();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onReviewAgain, onNextRound]);

  const accuracy = wordsInRound > 0 ? Math.round((correctCount / wordsInRound) * 100) : 0;

  return (
    <div className="round-complete-overlay" role="dialog" aria-modal="true">
      <div className="round-complete-modal">
        <div className="round-complete-modal__icon">
          {accuracy >= 80 ? "🎉" : accuracy >= 60 ? "👍" : "💪"}
        </div>
        
        <h2 className="round-complete-modal__title">
          第 {roundNumber} 轮完成
        </h2>
        
        <div className="round-complete-modal__stats">
          <div className="round-stat">
            <span className="round-stat__label">本轮单词</span>
            <span className="round-stat__value">{wordsInRound}</span>
          </div>
          <div className="round-stat round-stat--correct">
            <span className="round-stat__label">答对</span>
            <span className="round-stat__value">{correctCount}</span>
          </div>
          <div className="round-stat round-stat--wrong">
            <span className="round-stat__label">答错</span>
            <span className="round-stat__value">{wrongCount}</span>
          </div>
          <div className="round-stat round-stat--accuracy">
            <span className="round-stat__label">正确率</span>
            <span className="round-stat__value">{accuracy}%</span>
          </div>
        </div>

        <p className="round-complete-modal__message">
          {accuracy >= 80 
            ? "太棒了！大部分单词都掌握了，继续保持！" 
            : accuracy >= 60
            ? "不错！再复习一遍会记得更牢。"
            : "建议再复习一遍，加深记忆！"
          }
        </p>

        <div className="round-complete-modal__actions">
          <button
            ref={reviewButtonRef}
            className="round-complete-modal__button round-complete-modal__button--secondary"
            onClick={onReviewAgain}
          >
            🔄 复习本轮
          </button>
          
          <button
            ref={nextButtonRef}
            className="round-complete-modal__button round-complete-modal__button--primary"
            onClick={onNextRound}
            autoFocus
          >
            ➡️ 继续下一轮
          </button>
        </div>
        
        <p className="round-complete-modal__hint">
          按 1 复习 / 按 2 或 Enter 继续
        </p>
      </div>
    </div>
  );
}
