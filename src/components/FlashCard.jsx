import { useState, useRef, useEffect, useCallback } from "react";
import { evaluateAnswer } from "../services/ai";
import { useSettings } from "../context/SettingsContext";
import {
  createDictationSession,
  listenOnce,
  checkPronunciation,
} from "../utils/speechRecognition";

const SILENCE_STOP_MS = 2000;

function isMarkKnownKey(e) {
  return e.code === "Digit1" || e.code === "Numpad1" || e.key === "1";
}

function isMarkUnknownKey(e) {
  return e.code === "Digit0" || e.code === "Numpad0" || e.key === "0";
}

export default function FlashCard({ wordData, onResult, onNext, onPrev, micGranted }) {
  const { speakWord, settings, settingsOpen } = useSettings();
  const isTypeMode = settings.practiceStyle !== "recall";
  const [flipped, setFlipped] = useState(false);
  const [backMode, setBackMode] = useState(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [inputReady, setInputReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [dictating, setDictating] = useState(false);
  const [dictationHint, setDictationHint] = useState("");
  const [pronounceEnabled, setPronounceEnabled] = useState(false);
  const [pronouncing, setPronouncing] = useState(false);
  const [pronounceResult, setPronounceResult] = useState(null);
  const inputRef = useRef(null);
  const cardRef = useRef(null);
  const dictationRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const answerRef = useRef("");
  const loadingRef = useRef(false);
  const flippedRef = useRef(false);
  const backModeRef = useRef(null);
  const submitAnswerRef = useRef(null);
  const handleTypoClarificationRef = useRef(null);
  const startDictationRef = useRef(null);
  const dictatingRef = useRef(false);
  const resultRef = useRef(null);

  useEffect(() => {
    answerRef.current = userAnswer;
  }, [userAnswer]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    flippedRef.current = flipped;
  }, [flipped]);

  useEffect(() => {
    backModeRef.current = backMode;
  }, [backMode]);

  useEffect(() => {
    dictatingRef.current = dictating;
  }, [dictating]);

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  const stopDictation = useCallback(() => {
    clearTimeout(silenceTimerRef.current);
    dictationRef.current?.stop();
    dictationRef.current = null;
    setDictating(false);
    setDictationHint("");
  }, []);

  const focusInput = useCallback(() => {
    inputRef.current?.focus({ preventScroll: true });
    if (isTypeMode) setInputReady(true);
  }, [isTypeMode]);

  const focusCard = useCallback(() => {
    inputRef.current?.blur();
    setInputReady(false);
    cardRef.current?.focus({ preventScroll: true });
  }, []);

  const flipBack = useCallback(() => {
    setFlipped(false);
    setBackMode(null);
    setResult(null);
    requestAnimationFrame(isTypeMode ? focusInput : focusCard);
  }, [focusInput, focusCard, isTypeMode]);

  const flipToManual = useCallback(() => {
    if (loadingRef.current || flippedRef.current) return;
    stopDictation();
    setError(null);
    setBackMode("manual");
    setFlipped(true);
    requestAnimationFrame(focusCard);
  }, [stopDictation, focusCard]);

  const submitAnswer = useCallback(
    async (answerText) => {
      const text = (answerText ?? answerRef.current).trim();
      if (loadingRef.current || flippedRef.current || !text) return;

      stopDictation();
      setLoading(true);
      setError(null);
      try {
        const aiResult = await evaluateAnswer(wordData, text);
        setResult(aiResult);
        setBackMode("ai");
        setFlipped(true);
        if (!aiResult.needs_typo_clarification) {
          onResult?.(wordData, aiResult);
        }
        requestAnimationFrame(focusCard);
      } catch (err) {
        setError(err.message || "AI 批改失败，请稍后重试");
      } finally {
        setLoading(false);
      }
    },
    [wordData, onResult, stopDictation, focusCard]
  );

  const handleTypoClarification = useCallback(
    (isTypo) => {
      if (!result?.needs_typo_clarification || result.clarified_typo) return;

      const typoInfo = result.typo_match;
      const finalResult = isTypo
        ? {
            is_correct: true,
            ai_feedback: typoInfo
              ? `同音错字，本意应为「${typoInfo.expected}」，算正确。`
              : "打错字了，但本意是对的，算正确。",
            clarified_typo: true,
          }
        : {
            is_correct: false,
            ai_feedback: result.ai_feedback,
            clarified_typo: true,
          };

      setResult(finalResult);
      onResult?.(wordData, finalResult);
      requestAnimationFrame(focusCard);
    },
    [result, wordData, onResult, focusCard]
  );

  useEffect(() => {
    submitAnswerRef.current = submitAnswer;
  }, [submitAnswer]);

  useEffect(() => {
    handleTypoClarificationRef.current = handleTypoClarification;
  }, [handleTypoClarification]);

  const handleManualMark = useCallback(
    (isCorrect) => {
      onResult?.(wordData, {
        is_correct: isCorrect,
        ai_feedback: isCorrect ? "你已标记为认识" : "你已标记为需加强",
      });
      onNext?.();
    },
    [wordData, onResult, onNext]
  );

  const scheduleSilenceStop = useCallback(() => {
    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      stopDictation();
      const text = answerRef.current.trim();
      if (text && !loadingRef.current && !flippedRef.current) {
        submitAnswerRef.current?.(text);
      } else if (isTypeMode) {
        inputRef.current?.focus();
        setInputReady(true);
      } else {
        focusCard();
      }
    }, SILENCE_STOP_MS);
  }, [stopDictation, isTypeMode, focusCard]);

  const startDictation = useCallback(() => {
    if (!micGranted || loadingRef.current || flippedRef.current || dictatingRef.current) return;

    setError(null);
    setDictationHint("正在聆听…");
    setUserAnswer("");
    answerRef.current = "";

    const session = createDictationSession({
      lang: "zh-CN",
      onInterim: (text) => {
        setUserAnswer(text);
        answerRef.current = text;
        setDictationHint(text);
        scheduleSilenceStop();
      },
      onFinal: (text) => {
        setUserAnswer(text);
        answerRef.current = text;
        setDictationHint("");
        scheduleSilenceStop();
      },
      onError: (err) => {
        if (err.message === "未检测到语音") {
          scheduleSilenceStop();
          return;
        }
        setError(err.message || "语音输入失败");
        stopDictation();
      },
    });

    if (!session) {
      setError("当前浏览器不支持语音识别");
      return;
    }

    dictationRef.current = session;
    session.start();
    setDictating(true);
    scheduleSilenceStop();
  }, [micGranted, scheduleSilenceStop, stopDictation]);

  useEffect(() => {
    startDictationRef.current = startDictation;
  }, [startDictation]);

  useEffect(() => {
    setFlipped(false);
    setBackMode(null);
    setUserAnswer("");
    setResult(null);
    setError(null);
    setLoading(false);
    setDictating(false);
    setDictationHint("");
    setPronounceResult(null);
    setPronouncing(false);
    setInputReady(false);
    stopDictation();

    let speechTimer;
    let dictationTimer;
    let focusTimer;
    if (settings.autoReadOnNewWord) {
      speechTimer = setTimeout(() => speakWord(wordData.word), 200);
    }
    if (settings.autoDictateOnNewWord && micGranted) {
      dictationTimer = setTimeout(() => startDictationRef.current?.(), 500);
    } else if (isTypeMode) {
      focusTimer = setTimeout(() => focusInput(), 350);
    } else {
      focusTimer = setTimeout(() => focusCard(), 350);
    }

    return () => {
      clearTimeout(speechTimer);
      clearTimeout(dictationTimer);
      clearTimeout(focusTimer);
      stopDictation();
    };
  }, [
    wordData?.word,
    speakWord,
    stopDictation,
    settings.autoReadOnNewWord,
    settings.autoDictateOnNewWord,
    settings.practiceStyle,
    micGranted,
    isTypeMode,
    focusInput,
    focusCard,
  ]);

  useEffect(() => {
    if (!flipped || !settings.autoAdvanceAfterFlip) return undefined;
    if (result?.needs_typo_clarification && !result?.clarified_typo) return undefined;

    const delayMs = Math.min(60, Math.max(0, settings.autoAdvanceDelaySec)) * 1000;
    const timer = setTimeout(() => {
      onNext?.();
    }, delayMs);

    return () => clearTimeout(timer);
  }, [
    flipped,
    backMode,
    settings.autoAdvanceAfterFlip,
    settings.autoAdvanceDelaySec,
    onNext,
    wordData?.word,
    result?.needs_typo_clarification,
    result?.clarified_typo,
  ]);

  useEffect(() => {
    function isTypingInAnswerField() {
      const active = document.activeElement;
      return active === inputRef.current;
    }

    function isInsideVocabAssistant() {
      return Boolean(document.activeElement?.closest?.(".vocab-assistant"));
    }

    function isInsideSettingsPanel() {
      return Boolean(document.activeElement?.closest?.(".settings-panel"));
    }

    function handleGlobalKeyDown(e) {
      if (loadingRef.current) return;
      if (settingsOpen || isInsideSettingsPanel()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (isInsideVocabAssistant()) return;

      if (flippedRef.current && backModeRef.current === "ai") {
        const pending = resultRef.current;
        if (pending?.needs_typo_clarification && !pending?.clarified_typo) {
          if (isMarkKnownKey(e)) {
            e.preventDefault();
            e.stopPropagation();
            handleTypoClarificationRef.current?.(true);
            return;
          }
          if (isMarkUnknownKey(e)) {
            e.preventDefault();
            e.stopPropagation();
            handleTypoClarificationRef.current?.(false);
            return;
          }
        }
      }

      if (flippedRef.current && backModeRef.current === "manual") {
        if (isMarkKnownKey(e)) {
          e.preventDefault();
          e.stopPropagation();
          handleManualMark(true);
          return;
        }
        if (isMarkUnknownKey(e)) {
          e.preventDefault();
          e.stopPropagation();
          handleManualMark(false);
          return;
        }
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        onPrev?.();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        onNext?.();
        return;
      }

      if (e.key === " ") {
        if (isTypingInAnswerField()) return;
        e.preventDefault();
        if (flippedRef.current) {
          flipBack();
        } else {
          flipToManual();
        }
        return;
      }

      if (e.key === "Enter" && !e.shiftKey) {
        if (flippedRef.current) {
          e.preventDefault();
          if (backModeRef.current === "ai") {
            const pending = resultRef.current;
            if (pending?.needs_typo_clarification && !pending?.clarified_typo) return;
            onNext?.();
          } else {
            flipBack();
          }
          return;
        }

        const inInput = isTypingInAnswerField();
        const hasAnswer = answerRef.current.trim();

        e.preventDefault();

        if (hasAnswer && (isTypeMode || inInput)) {
          submitAnswer(answerRef.current);
          return;
        }

        flipToManual();
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown, true);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown, true);
  }, [onPrev, onNext, submitAnswer, flipToManual, flipBack, handleManualMark, isTypeMode, settingsOpen]);

  const frontPrompt = isTypeMode
    ? "用中文或别的英文词解释（勿照抄原词），Enter 提交批改"
    : "先在脑海里回忆词义，按空格或 Enter 翻面核对";

  const desktopHint = isTypeMode
    ? dictating
      ? "说完后停顿 2 秒自动提交批改"
      : "Enter 提交或空内容翻面 · Shift+Enter 换行 · 框外空格翻面 · ↑↓ 切词"
    : dictating
      ? "说完后停顿 2 秒自动提交"
      : "Enter / 空格翻面 · 输入后 Enter 提交 · Shift+Enter 换行 · ↑↓ 切词";

  const mobileHint = isTypeMode
    ? dictating
      ? "说完后停顿 2 秒自动提交"
      : "写好释义点「提交批改」，只看释义点「翻面」"
    : dictating
      ? "说完后停顿 2 秒自动提交"
      : "默认点「翻面」核对；输入释义后点「提交批改」";

  async function handlePronouncePractice() {
    if (!micGranted) {
      setError("请先允许麦克风权限");
      return;
    }

    setPronouncing(true);
    setPronounceResult(null);
    setError(null);

    try {
      const transcript = await listenOnce({ lang: "en-US", maxDurationMs: 8000 });
      const ok = checkPronunciation(transcript, wordData.word);
      setPronounceResult({
        ok,
        transcript,
        message: ok ? "发音正确，很棒！" : `识别为「${transcript}」，再听标准音试试`,
      });
    } catch (err) {
      setPronounceResult({
        ok: false,
        transcript: "",
        message: err.message || "读音识别失败",
      });
    } finally {
      setPronouncing(false);
    }
  }

  const awaitingTypoClarification = Boolean(
    result?.needs_typo_clarification && !result?.clarified_typo
  );

  const borderClass =
    backMode === "ai" && result && !awaitingTypoClarification
      ? result.is_correct
        ? "card--correct"
        : "card--wrong"
      : "";

  return (
    <div
      ref={cardRef}
      className="flashcard-scene"
      tabIndex={-1}
      aria-label="单词卡片"
    >
      <div className={`flashcard ${flipped ? "flashcard--flipped" : ""} ${borderClass}`}>
        <div className="flashcard__face flashcard__front">
          <div className="flashcard__term">
            <div className="flashcard__term-row">
              <h2 className="flashcard__word">{wordData.word}</h2>
              <div className="flashcard__term-actions">
                <button
                  type="button"
                  className="flashcard__sound"
                  onClick={() => speakWord(wordData.word)}
                  aria-label="播放标准发音"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                </button>
                {micGranted && pronounceEnabled && (
                  <button
                    type="button"
                    className={`flashcard__sound flashcard__sound--repeat ${pronouncing ? "flashcard__sound--active" : ""}`}
                    onClick={handlePronouncePractice}
                    disabled={pronouncing || loading}
                    aria-label="跟读单词"
                    title="跟读单词"
                  >
                    <MicIcon />
                  </button>
                )}
              </div>
            </div>

            {micGranted && (
              <div className="flashcard__pronounce-opts">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={pronounceEnabled}
                    onChange={(e) => {
                      setPronounceEnabled(e.target.checked);
                      setPronounceResult(null);
                    }}
                  />
                  <span className="toggle-switch__track" aria-hidden="true" />
                  <span className="toggle-switch__label">练习读音</span>
                </label>
                {pronounceEnabled && pronouncing && (
                  <span className="flashcard__pronounce-status flashcard__pronounce-status--pending">
                    聆听中…
                  </span>
                )}
                {pronounceEnabled && !pronouncing && pronounceResult && (
                  <span
                    className={`flashcard__pronounce-status ${pronounceResult.ok ? "flashcard__pronounce-status--ok" : "flashcard__pronounce-status--fail"}`}
                  >
                    {pronounceResult.message}
                  </span>
                )}
              </div>
            )}
          </div>

          <p className="flashcard__prompt">{frontPrompt}</p>

          <div className="flashcard__input-wrap">
            <textarea
              ref={inputRef}
              className={`flashcard__input${inputReady ? " flashcard__input--ready" : ""}`}
              placeholder={
                isTypeMode
                  ? micGranted
                    ? "中文释义或英文同义词，也可语音输入…"
                    : "中文释义或英文同义词…"
                  : micGranted
                    ? "可选：点这里输入释义，Enter 提交批改…"
                    : "可选：点这里输入释义，Enter 提交批改…"
              }
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onFocus={() => {
                if (isTypeMode) setInputReady(true);
              }}
              onBlur={() => setInputReady(false)}
              disabled={loading || dictating}
              rows={5}
            />
            {micGranted && (
              <button
                type="button"
                className={`voice-btn voice-btn--dictate ${dictating ? "voice-btn--active" : ""}`}
                onClick={startDictation}
                disabled={loading || dictating}
                title="语音输入释义"
                aria-label="语音输入释义"
              >
                <MicIcon />
              </button>
            )}
          </div>

          {dictationHint && <p className="flashcard__dictation-hint">{dictationHint}</p>}

          <div className="flashcard__footer">
            {loading ? (
              <span className="flashcard__status">
                <span className="spinner" />
                批改中
              </span>
            ) : error ? (
              <span className="flashcard__status flashcard__status--error">{error}</span>
            ) : (
              <>
                <span className="flashcard__status flashcard__status--desktop">{desktopHint}</span>
                <span className="flashcard__status flashcard__status--mobile">{mobileHint}</span>
              </>
            )}
          </div>
        </div>

        <div className="flashcard__face flashcard__back">
          {backMode === "ai" && result && (
            <>
              {awaitingTypoClarification ? (
                <div className="flashcard__typo-panel">
                  <div className="flashcard__badge flashcard__badge--neutral">再确认</div>
                  <div className="flashcard__feedback">
                    <p className="flashcard__feedback-text">{result.ai_feedback}</p>
                    <p className="flashcard__typo-question">{result.typo_clarification_question}</p>
                  </div>
                  <div className="flashcard__mark-actions flashcard__mark-actions--typo">
                    <button
                      type="button"
                      className="btn btn--mark btn--mark-ok"
                      onClick={() => handleTypoClarification(true)}
                    >
                      打错字了（本意对） <kbd className="flashcard__kbd">1</kbd>
                    </button>
                    <button
                      type="button"
                      className="btn btn--mark btn--mark-fail"
                      onClick={() => handleTypoClarification(false)}
                    >
                      真的不认识 <kbd className="flashcard__kbd">0</kbd>
                    </button>
                  </div>
                  <p className="flashcard__footer flashcard__footer--back flashcard__footer--typo flashcard__footer--desktop">
                    1 打错字了 · 0 真的不认识
                  </p>
                  <p className="flashcard__footer flashcard__footer--back flashcard__footer--typo flashcard__footer--mobile">
                    同音不同字时，选一项即可继续
                  </p>
                </div>
              ) : (
                <>
              <div className={`flashcard__badge ${result.is_correct ? "flashcard__badge--ok" : "flashcard__badge--fail"}`}>
                {result.is_correct ? "正确" : "需加强"}
              </div>

              <div className="flashcard__feedback">
                <p className="flashcard__feedback-text">{result.ai_feedback}</p>
                {wordData.definitions?.length > 0 && (
                  <div className="flashcard__book-defs">
                    <span className="flashcard__book-defs-label">书上释义</span>
                    <ul className="flashcard__definitions flashcard__definitions--book">
                      {wordData.definitions.map((def, i) => (
                        <li key={i}>{def}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <button type="button" className="btn btn--primary flashcard__next" onClick={onNext}>
                下一个
              </button>
              <p className="flashcard__footer flashcard__footer--back">Enter / ↓ 下一个 · 空格翻回正面</p>
                </>
              )}
            </>
          )}

          {backMode === "manual" && (
            <>
              <div className="flashcard__badge flashcard__badge--neutral">词义</div>

              <ul className="flashcard__definitions">
                {wordData.definitions?.map((def, i) => (
                  <li key={i}>{def}</li>
                ))}
              </ul>

              <p className="flashcard__mark-prompt">看完释义后，你认识这个词吗？</p>
              <div className="flashcard__mark-actions">
                <button type="button" className="btn btn--mark btn--mark-ok" onClick={() => handleManualMark(true)}>
                  认识 <kbd className="flashcard__kbd">1</kbd>
                </button>
                <button type="button" className="btn btn--mark btn--mark-fail" onClick={() => handleManualMark(false)}>
                  不认识 <kbd className="flashcard__kbd">0</kbd>
                </button>
              </div>
              <p className="flashcard__footer flashcard__footer--back flashcard__footer--desktop">
                1 认识 · 0 不认识 · Enter / 空格翻回正面
              </p>
              <p className="flashcard__footer flashcard__footer--back flashcard__footer--mobile">
                点击下方按钮标记，或点「翻回」返回
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flashcard__mobile-bar" aria-label="移动端快捷操作">
        <button type="button" className="flashcard__mobile-btn" onClick={onPrev}>
          上一词
        </button>
        {!flipped ? (
          <button
            type="button"
            className="flashcard__mobile-btn flashcard__mobile-btn--accent"
            onClick={() => (userAnswer.trim() ? submitAnswer(userAnswer) : flipToManual())}
            disabled={loading}
          >
            {userAnswer.trim() ? "提交批改" : "翻面"}
          </button>
        ) : backMode === "ai" ? (
          awaitingTypoClarification ? (
            <button type="button" className="flashcard__mobile-btn" disabled>
              请先确认
            </button>
          ) : (
          <button type="button" className="flashcard__mobile-btn flashcard__mobile-btn--accent" onClick={onNext}>
            下一个
          </button>
          )
        ) : (
          <button type="button" className="flashcard__mobile-btn" onClick={flipBack}>
            翻回正面
          </button>
        )}
        <button type="button" className="flashcard__mobile-btn" onClick={onNext}>
          下一词
        </button>
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  );
}
