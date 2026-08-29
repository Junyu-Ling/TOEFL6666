import { useState, useEffect } from "react";

export default function FloatingLexGridButton({ onClick, visible = true }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipDismissed, setTooltipDismissed] = useState(false);

  // 每隔30-60秒随机显示提示气泡
  useEffect(() => {
    if (tooltipDismissed) return;

    const showTooltipRandomly = () => {
      setShowTooltip(true);
      setTimeout(() => {
        setShowTooltip(false);
      }, 4000); // 显示4秒后自动隐藏
    };

    // 首次延迟10秒显示
    const initialTimer = setTimeout(() => {
      showTooltipRandomly();
    }, 10000);

    // 之后每30-60秒随机显示
    const intervalTimer = setInterval(() => {
      if (Math.random() > 0.5) {
        showTooltipRandomly();
      }
    }, 45000); // 平均45秒

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [tooltipDismissed]);

  const handleClick = () => {
    setShowTooltip(false);
    setTooltipDismissed(true);
    onClick?.();
  };

  if (!visible) return null;

  return (
    <div className="floating-lexgrid">
      <button
        type="button"
        className="floating-lexgrid__btn"
        onClick={handleClick}
        aria-label="打开词格游戏"
        title="词格游戏"
      >
        <svg
          className="floating-lexgrid__icon"
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="none"
          aria-hidden
        >
          <rect x="2.5" y="2.5" width="8" height="8" rx="1.5" />
          <rect x="13.5" y="2.5" width="8" height="8" rx="1.5" />
          <rect x="2.5" y="13.5" width="8" height="8" rx="1.5" />
          <rect x="13.5" y="13.5" width="8" height="8" rx="1.5" />
        </svg>
      </button>

      {showTooltip && (
        <div className="floating-lexgrid__tooltip">
          <span>累了？玩会小游戏</span>
          <button
            type="button"
            className="floating-lexgrid__tooltip-close"
            onClick={(e) => {
              e.stopPropagation();
              setShowTooltip(false);
              setTooltipDismissed(true);
            }}
            aria-label="关闭提示"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
