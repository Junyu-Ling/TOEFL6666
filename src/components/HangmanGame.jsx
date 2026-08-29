import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useIsActiveTab } from "../context/ActiveTabContext";
import { shouldIgnoreAppGameKeys } from "../utils/appKeyboard";
import { getKeyboardRows } from "../utils/lexGrid";
import {
  applyHangmanGuess,
  buildHangmanPool,
  createHangmanRound,
  getHangmanLevelLabel,
  hangmanSlots,
  HANGMAN_MAX_MISSES,
} from "../utils/hangman";

function HangmanFigure({ misses }) {
  const stroke = "currentColor";
  return (
    <svg
      className="hangman__figure"
      viewBox="0 0 200 240"
      fill="none"
      stroke={stroke}
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="24" y1="224" x2="108" y2="224" />
      <line x1="56" y1="224" x2="56" y2="20" />
      <line x1="56" y1="20" x2="148" y2="20" />
      <line x1="148" y1="20" x2="148" y2="48" />
      {misses >= 1 ? <circle cx="148" cy="72" r="22" /> : null}
      {misses >= 2 ? <line x1="148" y1="94" x2="148" y2="154" /> : null}
      {misses >= 3 ? <line x1="148" y1="112" x2="116" y2="138" /> : null}
      {misses >= 4 ? <line x1="148" y1="112" x2="180" y2="138" /> : null}
      {misses >= 5 ? <line x1="148" y1="154" x2="120" y2="198" /> : null}
      {misses >= 6 ? <line x1="148" y1="154" x2="176" y2="198" /> : null}
    </svg>
  );
}

function HangmanGame({ words, availableLists, tabId, appMode = "toefl", overlay = false, enabled = true }) {
  const isTabActive = enabled && (useIsActiveTab(tabId) || overlay);
  const levelLabel = useMemo(() => getHangmanLevelLabel(appMode), [appMode]);
  const pool = useMemo(
    () => buildHangmanPool(words, availableLists, appMode),
    [words, availableLists, appMode]
  );

  const [round, setRound] = useState(() => createHangmanRound(pool));

  const startNewRound = useCallback(() => {
    setRound(createHangmanRound(pool));
  }, [pool]);

  useEffect(() => {
    if (!pool.length) return;
    setRound((prev) => {
      if (!prev) return createHangmanRound(pool);
      const stillValid = pool.some(
        (item) => item.word.toLowerCase() === prev.target?.word?.toLowerCase()
      );
      return stillValid ? prev : createHangmanRound(pool);
    });
  }, [pool]);

  const guessLetter = useCallback((letter) => {
    setRound((prev) => applyHangmanGuess(prev, letter));
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      if (!isTabActive) return;
      if (round?.status !== "playing") return;
      if (shouldIgnoreAppGameKeys(e, { allowFullscreen: overlay })) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        guessLetter(e.key.toLowerCase());
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [guessLetter, isTabActive, overlay, round?.status]);

  if (!pool.length) {
    return (
      <div className="lexgrid hangman">
        <div className="lexgrid__empty">
          <span className="empty-icon">🎮</span>
          <p>{levelLabel} 词库暂无可用单词（需 4–12 个纯字母单词）</p>
        </div>
      </div>
    );
  }

  if (!round) return null;

  const { target, guessed, misses, status } = round;
  const slots = hangmanSlots(round);
  const remaining = HANGMAN_MAX_MISSES - misses;
  const isPlaying = status === "playing";
  const keyboardRows = getKeyboardRows();

  return (
    <div className="lexgrid hangman">
      <header className="lexgrid__header">
        <div>
          <h2 className="lexgrid__title">Hangman</h2>
          <p className="lexgrid__subtitle">
            猜字母 · {levelLabel} 随机 · {target.word.length} 字母 · 剩余 {remaining} 次
          </p>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={startNewRound}>
          换一词
        </button>
      </header>

      <div className="hangman__stage">
        <HangmanFigure misses={misses} />
        <div className="hangman__word" aria-label="待猜单词">
          {slots.map((slot, index) => (
            <span
              key={`${slot.letter}-${index}`}
              className={[
                "hangman__slot",
                slot.revealed && "hangman__slot--revealed",
                slot.missed && "hangman__slot--missed",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {slot.revealed ? slot.letter : ""}
            </span>
          ))}
        </div>
      </div>

      {status === "won" && (
        <div className="lexgrid__result lexgrid__result--won" role="status">
          <strong>猜对了！</strong>
          <span>
            答案：<em>{target.word}</em> · 用错 {misses} 次
          </span>
          {target.definitions?.length > 0 && (
            <p className="lexgrid__defs">{target.definitions.join(" · ")}</p>
          )}
          <button type="button" className="btn btn--accent btn--sm" onClick={startNewRound}>
            再来一局
          </button>
        </div>
      )}

      {status === "lost" && (
        <div className="lexgrid__result lexgrid__result--lost" role="status">
          <strong>小人被吊起来了</strong>
          <span>
            正确答案：<em>{target.word}</em>
          </span>
          {target.definitions?.length > 0 && (
            <p className="lexgrid__defs">{target.definitions.join(" · ")}</p>
          )}
          <button type="button" className="btn btn--accent btn--sm" onClick={startNewRound}>
            再来一局
          </button>
        </div>
      )}

      {isPlaying && (
        <div className="lexgrid__keyboard" aria-label="字母键盘">
          {keyboardRows.map((row, rowIndex) => (
            <div key={rowIndex} className="lexgrid__keyboard-row">
              {row.map((key) => {
                if (key === "enter" || key === "backspace") return null;
                const state = guessed[key];
                return (
                  <button
                    key={key}
                    type="button"
                    className={[
                      "lexgrid-key",
                      state && `lexgrid-key--${state}`,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => guessLetter(key)}
                    disabled={Boolean(state)}
                  >
                    {key.toUpperCase()}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {isPlaying && (
        <p className="lexgrid__hint">点字母或用键盘猜 · 错 {HANGMAN_MAX_MISSES} 次小人就会被吊起来</p>
      )}
    </div>
  );
}

export default memo(HangmanGame);
