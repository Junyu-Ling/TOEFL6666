import { useCallback, useEffect, useState } from "react";
import { useSettings } from "../context/SettingsContext";

export default function LexGridRecallCard({ wordData, recallHint, onKnow, onUnknown }) {
  const { speakWord } = useSettings();
  const [flipped, setFlipped] = useState(false);

  const flip = useCallback(() => {
    setFlipped((prev) => !prev);
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "1") {
        e.preventDefault();
        if (!flipped) {
          setFlipped(true);
          return;
        }
        onKnow();
        return;
      }

      if (e.key === "0") {
        e.preventDefault();
        if (!flipped) {
          setFlipped(true);
          return;
        }
        onUnknown();
        return;
      }

      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        flip();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flip, flipped, onKnow, onUnknown]);

  return (
    <section className="lexgrid-recall" aria-label="认词确认">
      <p className="lexgrid-recall__lead">猜对了！请翻到背面看释义，确认你是否认识这个词</p>

      <div className="flashcard-scene lexgrid-recall__scene">
        <button
          type="button"
          className={`flashcard lexgrid-recall__card${flipped ? " flashcard--flipped" : ""}`}
          onClick={flip}
          aria-label={flipped ? "翻回单词正面" : "查看释义"}
        >
          <div className="flashcard__face flashcard__front">
            <div className="flashcard__term">
              <div className="flashcard__term-row">
                <h2 className="flashcard__word">{wordData.word}</h2>
                <div className="flashcard__term-actions">
                  <button
                    type="button"
                    className="flashcard__sound"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakWord(wordData.word);
                    }}
                    aria-label="播放标准发音"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <p className="flashcard__prompt">点击卡片或按空格查看释义</p>
          </div>

          <div className="flashcard__face flashcard__back">
            <div className="flashcard__badge flashcard__badge--neutral">词义</div>
            <ul className="flashcard__definitions">
              {wordData.definitions?.map((def, index) => (
                <li key={index}>{def}</li>
              ))}
            </ul>
            <p className="flashcard__mark-prompt">你认识这个词吗？</p>
            <div className="flashcard__mark-actions">
              <button
                type="button"
                className="btn btn--mark btn--mark-ok"
                onClick={(e) => {
                  e.stopPropagation();
                  onKnow();
                }}
              >
                认识 <kbd className="flashcard__kbd">1</kbd>
              </button>
              <button
                type="button"
                className="btn btn--mark btn--mark-fail"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnknown();
                }}
              >
                不认识 <kbd className="flashcard__kbd">0</kbd>
              </button>
            </div>
            <p className="flashcard__footer flashcard__footer--back">1 认识 · 0 不认识 · 空格翻回正面</p>
          </div>
        </button>
      </div>

      {recallHint ? <p className="lexgrid-recall__warn" role="alert">{recallHint}</p> : null}
    </section>
  );
}
