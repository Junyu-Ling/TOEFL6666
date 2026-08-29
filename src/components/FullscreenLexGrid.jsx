import { useEffect, useRef, useState } from "react";
import LexGridGame from "./LexGridGame";
import HangmanGame from "./HangmanGame";
import { ActiveTabProvider } from "../context/ActiveTabContext";

const LEXGRID_TAB_ID = "lexgrid-fullscreen";
const MODE_KEY = "toefl666_minigame_mode";

function loadMode() {
  try {
    return localStorage.getItem(MODE_KEY) === "hangman" ? "hangman" : "lexgrid";
  } catch {
    return "lexgrid";
  }
}

export default function FullscreenLexGrid({ words, availableLists, appMode, onClose, isOpen }) {
  const rootRef = useRef(null);
  const [mode, setMode] = useState(loadMode);

  function selectMode(next) {
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      /* ignore */
    }
  }

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
          aria-label="关闭小游戏"
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

        <div className="minigame-modes" role="tablist" aria-label="小游戏模式">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "lexgrid"}
            className={`minigame-modes__btn${mode === "lexgrid" ? " minigame-modes__btn--active" : ""}`}
            onClick={() => selectMode("lexgrid")}
          >
            词格
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "hangman"}
            className={`minigame-modes__btn${mode === "hangman" ? " minigame-modes__btn--active" : ""}`}
            onClick={() => selectMode("hangman")}
          >
            Hangman
          </button>
        </div>

        <ActiveTabProvider value={LEXGRID_TAB_ID}>
          <div hidden={mode !== "lexgrid"}>
            <LexGridGame
              words={words}
              availableLists={availableLists}
              tabId={LEXGRID_TAB_ID}
              appMode={appMode}
              overlay
              enabled={mode === "lexgrid"}
            />
          </div>
          <div hidden={mode !== "hangman"}>
            <HangmanGame
              words={words}
              availableLists={availableLists}
              tabId={LEXGRID_TAB_ID}
              appMode={appMode}
              overlay
              enabled={mode === "hangman"}
            />
          </div>
        </ActiveTabProvider>
      </div>
    </div>
  );
}
