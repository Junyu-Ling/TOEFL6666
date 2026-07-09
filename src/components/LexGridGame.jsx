import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TILE_STATES,
  buildLexGridPool,
  createLexGridRound,
  evaluateGuess,
  getKeyboardRows,
  mergeKeyStates,
} from "../utils/lexGrid";

const REVEAL_MS_PER_TILE = 320;
const REVEAL_BASE_MS = 180;

function Tile({ letter, state, filled, flip, settled, delayMs }) {
  if (settled) {
    return (
      <div className={`lexgrid-tile lexgrid-tile--filled lexgrid-tile--${state}`}>
        {letter}
      </div>
    );
  }

  const className = [
    "lexgrid-tile",
    filled && "lexgrid-tile--filled",
    flip && state !== TILE_STATES.empty && `lexgrid-tile--${state}`,
    flip && "lexgrid-tile--flip",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      style={flip ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      <div className="lexgrid-tile__face lexgrid-tile__front">{letter}</div>
      <div className={`lexgrid-tile__face lexgrid-tile__back lexgrid-tile__back--${state}`}>
        {letter}
      </div>
    </div>
  );
}

export default function LexGridGame({ words, availableLists }) {
  const pool = useMemo(
    () => buildLexGridPool(words, availableLists),
    [words, availableLists]
  );

  const [round, setRound] = useState(() => createLexGridRound(pool));
  const pendingRef = useRef(false);

  const startNewRound = useCallback(() => {
    pendingRef.current = false;
    setRound(createLexGridRound(pool));
  }, [pool]);

  useEffect(() => {
    if (!round && pool.length) {
      setRound(createLexGridRound(pool));
    }
  }, [pool, round]);

  const submitGuess = useCallback(() => {
    if (!round || round.status !== "playing" || pendingRef.current) return;
    if (round.revealingRow !== null) return;

    const guess = round.currentGuess.toLowerCase();
    if (guess.length !== round.wordLength) {
      setRound((prev) => ({ ...prev, shake: true }));
      window.setTimeout(() => setRound((prev) => ({ ...prev, shake: false })), 450);
      return;
    }

    const evaluation = evaluateGuess(guess, round.target.word);
    const rowIndex = round.rows.length;
    pendingRef.current = true;

    setRound((prev) => ({
      ...prev,
      rows: [...prev.rows, { guess, evaluation }],
      currentGuess: "",
      revealingRow: rowIndex,
      shake: false,
    }));

    const revealDuration = REVEAL_BASE_MS + round.wordLength * REVEAL_MS_PER_TILE;
    window.setTimeout(() => {
      setRound((prev) => {
        if (!prev) return prev;
        const won = evaluation.every((state) => state === TILE_STATES.correct);
        const lost = !won && prev.rows.length >= prev.maxGuesses;
        return {
          ...prev,
          revealingRow: null,
          keyStates: mergeKeyStates(prev.keyStates, guess, evaluation),
          status: won ? "won" : lost ? "lost" : "playing",
        };
      });
      pendingRef.current = false;
    }, revealDuration);
  }, [round]);

  const handleLetter = useCallback(
    (letter) => {
      if (!round || round.status !== "playing" || pendingRef.current || round.revealingRow !== null) {
        return;
      }
      if (round.currentGuess.length >= round.wordLength) return;
      setRound((prev) => ({
        ...prev,
        currentGuess: `${prev.currentGuess}${letter}`.slice(0, prev.wordLength),
      }));
    },
    [round]
  );

  const handleBackspace = useCallback(() => {
    if (!round || round.status !== "playing" || pendingRef.current || round.revealingRow !== null) {
      return;
    }
    setRound((prev) => ({
      ...prev,
      currentGuess: prev.currentGuess.slice(0, -1),
    }));
  }, [round]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Enter") {
        e.preventDefault();
        submitGuess();
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
        return;
      }
      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handleLetter(e.key.toLowerCase());
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleBackspace, handleLetter, submitGuess]);

  if (!pool.length) {
    return (
      <div className="lexgrid">
        <div className="lexgrid__empty">
          <span className="empty-icon">🎮</span>
          <p>Level 1–4 词库暂无可用单词（需 4–8 个纯字母单词）</p>
        </div>
      </div>
    );
  }

  if (!round) return null;

  const { target, wordLength, maxGuesses, rows, currentGuess, status, keyStates, shake, revealingRow } =
    round;
  const activeRow = rows.length;
  const gridRows = Array.from({ length: maxGuesses }, (_, rowIndex) => {
    const submitted = rows[rowIndex];
    const isActive = rowIndex === activeRow && status === "playing";
    const guess =
      submitted?.guess ||
      (isActive ? currentGuess.padEnd(wordLength, " ") : " ".repeat(wordLength));
    const evaluation = submitted?.evaluation || Array(wordLength).fill(TILE_STATES.empty);

    return { rowIndex, guess, evaluation, isActive };
  });

  const keyboardRows = getKeyboardRows();

  return (
    <div className="lexgrid">
      <header className="lexgrid__header">
        <div>
          <h2 className="lexgrid__title">LexGrid</h2>
          <p className="lexgrid__subtitle">词格猜词 · Level 1–4 随机 · {wordLength} 字母 · {maxGuesses} 次机会</p>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={startNewRound}>
          换一词
        </button>
      </header>

      <div
        className={`lexgrid__board lexgrid__board--len-${Math.min(wordLength, 8)}${shake ? " lexgrid__board--shake" : ""}`}
        role="grid"
        aria-label="猜词棋盘"
      >
        {gridRows.map(({ rowIndex, guess, evaluation }) => (
          <div key={rowIndex} className="lexgrid__row" role="row">
            {Array.from({ length: wordLength }, (_, colIndex) => {
              const letter = guess[colIndex]?.trim() ? guess[colIndex] : "";
              const filled = Boolean(letter);
              const state =
                rows[rowIndex] || revealingRow === rowIndex
                  ? evaluation[colIndex]
                  : TILE_STATES.empty;
              const settled = Boolean(rows[rowIndex]) && revealingRow !== rowIndex;
              const flip = revealingRow === rowIndex;
              return (
                <Tile
                  key={colIndex}
                  letter={letter}
                  state={state}
                  filled={filled}
                  flip={flip}
                  settled={settled}
                  delayMs={colIndex * REVEAL_MS_PER_TILE}
                />
              );
            })}
          </div>
        ))}
      </div>

      {status !== "playing" && (
        <div className={`lexgrid__result lexgrid__result--${status}`} role="status">
          {status === "won" ? (
            <>
              <strong>猜对了！</strong>
              <span>
                答案：<em>{target.word}</em> · 用了 {rows.length} / {maxGuesses} 次
              </span>
            </>
          ) : (
            <>
              <strong>机会用完了</strong>
              <span>
                正确答案：<em>{target.word}</em>
              </span>
            </>
          )}
          {target.definitions?.length > 0 && (
            <p className="lexgrid__defs">{target.definitions.join(" · ")}</p>
          )}
          <button type="button" className="btn btn--accent btn--sm" onClick={startNewRound}>
            再来一局
          </button>
        </div>
      )}

      <div className="lexgrid__keyboard" aria-label="虚拟键盘">
        {keyboardRows.map((row, rowIndex) => (
          <div key={rowIndex} className="lexgrid__keyboard-row">
            {row.map((key) => {
              if (key === "enter") {
                return (
                  <button
                    key={key}
                    type="button"
                    className="lexgrid-key lexgrid-key--wide"
                    onClick={submitGuess}
                    disabled={status !== "playing" || revealingRow !== null}
                  >
                    确认
                  </button>
                );
              }
              if (key === "backspace") {
                return (
                  <button
                    key={key}
                    type="button"
                    className="lexgrid-key lexgrid-key--wide"
                    onClick={handleBackspace}
                    disabled={status !== "playing" || revealingRow !== null}
                    aria-label="删除"
                  >
                    ⌫
                  </button>
                );
              }
              const state = keyStates[key] || TILE_STATES.empty;
              return (
                <button
                  key={key}
                  type="button"
                  className={[
                    "lexgrid-key",
                    state !== TILE_STATES.empty && `lexgrid-key--${state}`,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleLetter(key)}
                  disabled={status !== "playing" || revealingRow !== null}
                >
                  {key.toUpperCase()}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <p className="lexgrid__hint">
        绿 = 字母与位置都对 · 黄 = 字母在词中但位置不对 · 灰 = 词中没有该字母
      </p>
    </div>
  );
}
