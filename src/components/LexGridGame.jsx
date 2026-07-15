import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LexGridRecallCard from "./LexGridRecallCard";
import { validateEnglishWord } from "../services/wordValidate";
import { shouldIgnoreAppGameKeys } from "../utils/appKeyboard";
import {
  TILE_STATES,
  buildLexGridPool,
  buildWordBankSet,
  createLexGridRound,
  evaluateGuess,
  getKeyboardRows,
  guessToWord,
  isGuessComplete,
  mergeKeyStates,
  validateGuessWord,
} from "../utils/lexGrid";

const REVEAL_MS_PER_TILE = 320;
const REVEAL_BASE_MS = 180;

function Tile({ letter, state, filled, flip, settled, selected, selectable, position, onSelect, delayMs }) {
  const className = [
    "lexgrid-tile",
    filled && "lexgrid-tile--filled",
    flip && state !== TILE_STATES.empty && `lexgrid-tile--${state}`,
    flip && "lexgrid-tile--flip",
    settled && state !== TILE_STATES.empty && `lexgrid-tile--${state}`,
    selectable && "lexgrid-tile--selectable",
    selected && "lexgrid-tile--selected",
  ]
    .filter(Boolean)
    .join(" ");

  if (settled) {
    return <div className={className}>{letter}</div>;
  }

  if (selectable) {
    return (
      <button
        type="button"
        className={className}
        onClick={onSelect}
        aria-label={
          letter
            ? `第 ${position + 1} 格，字母 ${letter.toUpperCase()}`
            : `选择第 ${position + 1} 格输入字母`
        }
        aria-current={selected ? "true" : undefined}
      >
        {letter}
      </button>
    );
  }

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

export default function LexGridGame({ words, availableLists, isActive = true }) {
  const pool = useMemo(
    () => buildLexGridPool(words, availableLists),
    [words, availableLists]
  );
  const wordBankSet = useMemo(() => buildWordBankSet(words), [words]);
  const validationCacheRef = useRef(new Map());
  const validateAbortRef = useRef(null);

  const [round, setRound] = useState(() => createLexGridRound(pool));
  const pendingRef = useRef(false);

  const startNewRound = useCallback(() => {
    validateAbortRef.current?.abort();
    validateAbortRef.current = null;
    pendingRef.current = false;
    setRound(createLexGridRound(pool));
  }, [pool]);

  useEffect(() => {
    if (!round && pool.length) {
      setRound(createLexGridRound(pool));
    }
  }, [pool, round]);

  useEffect(() => {
    return () => {
      validateAbortRef.current?.abort();
    };
  }, []);

  const submitGuess = useCallback(async () => {
    if (!round || round.status !== "playing" || pendingRef.current) return;
    if (round.revealingRow !== null || round.validating) return;

    const guess = guessToWord(round.currentGuess);
    if (!isGuessComplete(round.currentGuess)) {
      setRound((prev) => ({ ...prev, shake: true, invalidMsg: null }));
      window.setTimeout(() => setRound((prev) => ({ ...prev, shake: false })), 450);
      return;
    }

    validateAbortRef.current?.abort();
    const controller = new AbortController();
    validateAbortRef.current = controller;
    pendingRef.current = true;

    setRound((prev) => ({
      ...prev,
      validating: true,
      invalidMsg: null,
      shake: false,
    }));

    try {
      const validation = await validateGuessWord(guess, wordBankSet, {
        cache: validationCacheRef.current,
        signal: controller.signal,
        validateRemote: (word, options) => validateEnglishWord(word, options),
      });

      if (controller.signal.aborted) return;

      if (!validation.valid) {
        setRound((prev) => ({
          ...prev,
          validating: false,
          shake: true,
          invalidMsg: "不是有效英文单词，请换一个词",
        }));
        window.setTimeout(
          () => setRound((prev) => (prev ? { ...prev, shake: false } : prev)),
          450
        );
        pendingRef.current = false;
        return;
      }

      const evaluation = evaluateGuess(guess, round.target.word);
      const rowIndex = round.rows.length;

      setRound((prev) => ({
        ...prev,
        rows: [...prev.rows, { guess, evaluation }],
        currentGuess: Array(prev.wordLength).fill(""),
        cursorIndex: 0,
        revealingRow: rowIndex,
        validating: false,
        invalidMsg: null,
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
            status: won ? "recall" : lost ? "lost" : "playing",
            recallHint: won ? null : prev.recallHint,
          };
        });
        pendingRef.current = false;
      }, revealDuration);
    } catch (err) {
      if (err?.name === "AbortError" || controller.signal.aborted) return;
      setRound((prev) =>
        prev
          ? {
              ...prev,
              validating: false,
              invalidMsg: err.message || "单词验证失败，请稍后重试",
            }
          : prev
      );
      pendingRef.current = false;
    } finally {
      if (validateAbortRef.current === controller) {
        validateAbortRef.current = null;
      }
    }
  }, [round, wordBankSet]);

  const handleSelectCell = useCallback(
    (colIndex) => {
      if (
        !round ||
        round.status !== "playing" ||
        pendingRef.current ||
        round.revealingRow !== null ||
        round.validating
      ) {
        return;
      }
      setRound((prev) => ({
        ...prev,
        cursorIndex: colIndex,
        invalidMsg: null,
      }));
    },
    [round]
  );

  const handleLetter = useCallback(
    (letter) => {
      if (
        !round ||
        round.status !== "playing" ||
        pendingRef.current ||
        round.revealingRow !== null ||
        round.validating
      ) {
        return;
      }

      setRound((prev) => {
        const guess = [...prev.currentGuess];
        const index = prev.cursorIndex;
        guess[index] = letter;

        let nextIndex = index;
        const nextEmpty = guess.findIndex((char, i) => i > index && !char);
        if (nextEmpty >= 0) {
          nextIndex = nextEmpty;
        } else if (index < prev.wordLength - 1) {
          nextIndex = index + 1;
        }

        return {
          ...prev,
          currentGuess: guess,
          cursorIndex: nextIndex,
          invalidMsg: null,
        };
      });
    },
    [round]
  );

  const handleBackspace = useCallback(() => {
    if (
      !round ||
      round.status !== "playing" ||
      pendingRef.current ||
      round.revealingRow !== null ||
      round.validating
    ) {
      return;
    }

    setRound((prev) => {
      const guess = [...prev.currentGuess];
      let index = prev.cursorIndex;

      if (guess[index]) {
        guess[index] = "";
      } else if (index > 0) {
        index -= 1;
        guess[index] = "";
      }

      return {
        ...prev,
        currentGuess: guess,
        cursorIndex: index,
        invalidMsg: null,
      };
    });
  }, [round]);

  const moveCursor = useCallback(
    (delta) => {
      if (
        !round ||
        round.status !== "playing" ||
        pendingRef.current ||
        round.revealingRow !== null ||
        round.validating
      ) {
        return;
      }
      setRound((prev) => ({
        ...prev,
        cursorIndex: Math.max(0, Math.min(prev.wordLength - 1, prev.cursorIndex + delta)),
      }));
    },
    [round]
  );

  const handleRecallKnow = useCallback(() => {
    setRound((prev) => (prev ? { ...prev, status: "cleared", recallHint: null } : prev));
  }, []);

  const handleRecallUnknown = useCallback(() => {
    setRound((prev) =>
      prev
        ? {
            ...prev,
            recallHint: "需要认识这个词才能过关，请再看看释义后再选「认识」",
          }
        : prev
    );
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      if (!isActive) return;
      if (round?.status !== "playing") return;
      if (shouldIgnoreAppGameKeys(e)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Enter") {
        e.preventDefault();
        void submitGuess();
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        moveCursor(-1);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        moveCursor(1);
        return;
      }
      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handleLetter(e.key.toLowerCase());
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleBackspace, handleLetter, isActive, moveCursor, round?.status, submitGuess]);

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

  const {
    target,
    wordLength,
    maxGuesses,
    rows,
    currentGuess,
    cursorIndex,
    status,
    keyStates,
    shake,
    revealingRow,
    validating,
    invalidMsg,
    recallHint,
  } = round;
  const activeRow = rows.length;
  const isPlaying = status === "playing";
  const gridRows = Array.from({ length: maxGuesses }, (_, rowIndex) => {
    const submitted = rows[rowIndex];
    const isActive = rowIndex === activeRow && isPlaying;
    const guessChars = submitted
      ? submitted.guess.split("")
      : isActive
        ? currentGuess
        : Array(wordLength).fill("");
    const evaluation = submitted?.evaluation || Array(wordLength).fill(TILE_STATES.empty);

    return { rowIndex, guessChars, evaluation, isActive };
  });

  const keyboardRows = getKeyboardRows();

  return (
    <div className="lexgrid">
      <header className="lexgrid__header">
        <div>
          <h2 className="lexgrid__title">LexGrid</h2>
          <p className="lexgrid__subtitle">
            词格猜词 · Level 1–4 随机 · {wordLength} 字母 · {maxGuesses} 次机会
            {status === "recall" ? " · 认词过关" : ""}
          </p>
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={startNewRound}
          disabled={validating || revealingRow !== null}
        >
          换一词
        </button>
      </header>

      <div
        className={`lexgrid__board lexgrid__board--len-${Math.min(wordLength, 8)}${shake ? " lexgrid__board--shake" : ""}`}
        role="grid"
        aria-label="猜词棋盘"
      >
        {gridRows.map(({ rowIndex, guessChars, evaluation, isActive }) => (
          <div key={rowIndex} className="lexgrid__row" role="row">
            {Array.from({ length: wordLength }, (_, colIndex) => {
              const letter = guessChars[colIndex] || "";
              const filled = Boolean(letter);
              const state =
                rows[rowIndex] || revealingRow === rowIndex
                  ? evaluation[colIndex]
                  : TILE_STATES.empty;
              const settled = Boolean(rows[rowIndex]) && revealingRow !== rowIndex;
              const flip = revealingRow === rowIndex;
              const selectable = isActive && !validating && revealingRow === null;
              const selected = selectable && cursorIndex === colIndex;
              return (
                <Tile
                  key={colIndex}
                  letter={letter}
                  state={state}
                  filled={filled}
                  flip={flip}
                  settled={settled}
                  selectable={selectable}
                  selected={selected}
                  onSelect={() => handleSelectCell(colIndex)}
                  position={colIndex}
                  delayMs={colIndex * REVEAL_MS_PER_TILE}
                />
              );
            })}
          </div>
        ))}
      </div>

      {invalidMsg ? (
        <p className="lexgrid__invalid" role="alert">
          {invalidMsg}
        </p>
      ) : null}

      {status === "recall" && (
        <LexGridRecallCard
          wordData={target}
          recallHint={recallHint}
          onKnow={handleRecallKnow}
          onUnknown={handleRecallUnknown}
          isActive={isActive}
        />
      )}

      {status === "cleared" && (
        <div className="lexgrid__result lexgrid__result--won" role="status">
          <strong>过关！</strong>
          <span>
            答案：<em>{target.word}</em> · 用了 {rows.length} / {maxGuesses} 次 · 已确认认识
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
          <strong>机会用完了</strong>
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
                      onClick={() => void submitGuess()}
                      disabled={revealingRow !== null || validating}
                    >
                      {validating ? "验证中…" : "确认"}
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
                      disabled={revealingRow !== null || validating}
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
                    disabled={revealingRow !== null || validating}
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
        <p className="lexgrid__hint">
          点击格子选定位置再输入 · ← → 切换格子 · 每次须填真实英文单词 · 猜对后需认词过关
        </p>
      )}
    </div>
  );
}
