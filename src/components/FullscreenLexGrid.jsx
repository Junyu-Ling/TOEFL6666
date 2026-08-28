import { useEffect } from "react";
import LexGridGame from "./LexGridGame";

export default function FullscreenLexGrid({ words, availableLists, appMode, onClose, isOpen }) {
  // ESC键关闭
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // 防止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fullscreen-lexgrid">
      <div className="fullscreen-lexgrid__content">
        <button
          type="button"
          className="fullscreen-lexgrid__close"
          onClick={onClose}
          aria-label="关闭词格游戏"
          title="关闭 (ESC)"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <LexGridGame
          words={words}
          availableLists={availableLists}
          tabId="lexgrid-fullscreen"
          appMode={appMode}
        />
      </div>
    </div>
  );
}
