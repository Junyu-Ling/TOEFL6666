import { useEffect, useRef } from "react";
import LexGridGame from "./LexGridGame";
import { ActiveTabProvider } from "../context/ActiveTabContext";

const LEXGRID_TAB_ID = "lexgrid-fullscreen";

export default function FullscreenLexGrid({ words, availableLists, appMode, onClose, isOpen }) {
  const rootRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    rootRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fullscreen-lexgrid" ref={rootRef} tabIndex={-1}>
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

        <ActiveTabProvider value={LEXGRID_TAB_ID}>
          <LexGridGame
            words={words}
            availableLists={availableLists}
            tabId={LEXGRID_TAB_ID}
            appMode={appMode}
            overlay
          />
        </ActiveTabProvider>
      </div>
    </div>
  );
}
