import { useEffect, useRef } from "react";

export default function RoundCompleteModal({ 
  isFirstPass, 
  roundNumber, 
  wordsInRound, 
  onContinue 
}) {
  const buttonRef = useRef(null);

  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onContinue();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onContinue]);

  return (
    <div className="round-complete-overlay" role="dialog" aria-modal="true">
      <div className="round-complete-modal">
        <div className="round-complete-modal__icon">
          {isFirstPass ? "🔄" : "✨"}
        </div>
        
        <h2 className="round-complete-modal__title">
          {isFirstPass ? `第 ${roundNumber} 轮学习完成` : `第 ${roundNumber} 轮复习完成`}
        </h2>
        
        <p className="round-complete-modal__message">
          {isFirstPass 
            ? `已完成本轮 ${wordsInRound} 个单词的学习，现在回到本轮开头复习一遍，加深记忆！` 
            : `本轮 ${wordsInRound} 个单词已全部掌握，准备好进入下一轮了吗？`
          }
        </p>

        <button
          ref={buttonRef}
          className="round-complete-modal__button"
          onClick={onContinue}
          autoFocus
        >
          {isFirstPass ? "开始复习" : "继续下一轮"}
        </button>
        
        <p className="round-complete-modal__hint">
          按 Enter 或 空格键 继续
        </p>
      </div>
    </div>
  );
}
