import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { evaluateAnswer } from "../services/ai";
import { useSettings } from "../context/SettingsContext";
import {
  createDictationSession,
  listenOnce,
  checkPronunciation,
  matchesEnglishRecall,
} from "../utils/speechRecognition";
import { evaluatePronunciation } from "../services/pronunciationEvaluate";
import { getPronunciationAlert } from "../utils/pronunciationAlert";
import { playAnswerSound } from "../utils/answerSounds";
import { fetchMemoryTrick } from "../services/memoryTrick";
import { shouldFetchMemoryTrick } from "../shared/memoryTrick";
import MemoryTrickBlock from "./MemoryTrickBlock";
import PronunciationAlert from "./PronunciationAlert";

const SILENCE_STOP_MS = 2000;
const SWIPE_THRESHOLD_PX = 48;
const TAP_MOVE_TOLERANCE_PX = 14;
const TAP_MAX_DURATION_MS = 350;
const SWIPE_EXIT_MS = 300;
const SWIPE_SNAP_MS = 320;

function isMobileLayout() {
  return window.matchMedia("(max-width: 640px)").matches;
}

function isTouchInteractiveTarget(target) {
  return Boolean(
    target?.closest?.(
      "button, a, input, textarea, select, label, .toggle-switch, .voice-btn, .flashcard__mobile-bar, .flashcard__input-wrap"
    )
  );
}

function isMarkKnownKey(e) {
  return e.code === "Digit1" || e.code === "Numpad1" || e.key === "1";
}

function isMarkUnknownKey(e) {
  return e.code === "Digit0" || e.code === "Numpad0" || e.key === "0";
}

function computeSwipeTransform(dx) {
  const clamped = Math.max(-160, Math.min(160, dx));
  const progress = clamped / 160;
  return {
    x: clamped * 0.88,
    rotate: progress * 14,
    opacity: 1 - Math.abs(progress) * 0.14,
  };
}

export default function FlashCard({
  wordData,
  wordStats,
  onResult,
  onMemoryTrickGenerated,
  onNext,
  onPrev,
  micGranted,
}) {
  const { speakWord, settings, settingsOpen } = useSettings();
  const settingsOpenRef = useRef(settingsOpen);
  settingsOpenRef.current = settingsOpen;
  const isTypeModeRef = useRef(settings.practiceStyle !== "recall");
  const isTypeMode = settings.practiceStyle !== "recall";
  const hideWordFirst = settings.hideWordFirst && isTypeMode;
  const hideWordFirstRef = useRef(hideWordFirst);
  hideWordFirstRef.current = hideWordFirst;
  isTypeModeRef.current = isTypeMode;
  const [flipped, setFlipped] = useState(false);
  const [backMode, setBackMode] = useState(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [englishAttempt, setEnglishAttempt] = useState("");
  const [recallStep, setRecallStep] = useState("english");
  const [englishRecallHint, setEnglishRecallHint] = useState("");
  const [inputReady, setInputReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [dictating, setDictating] = useState(false);
  const [dictationHint, setDictationHint] = useState("");
  const [pronounceEnabled, setPronounceEnabled] = useState(false);
  const [pronouncePhase, setPronouncePhase] = useState(null);
  const [pronounceResult, setPronounceResult] = useState(null);
  const pronounceAbortRef = useRef(null);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [swipeVisual, setSwipeVisual] = useState(null);
  const inputRef = useRef(null);
  const englishInputRef = useRef(null);
  const cardRef = useRef(null);
  const dictationRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const answerRef = useRef("");
  const englishAnswerRef = useRef("");
  const recallStepRef = useRef("english");
  const loadingRef = useRef(false);
  const flippedRef = useRef(false);
  const backModeRef = useRef(null);
  const submitAnswerRef = useRef(null);
  const cancelEvaluationRef = useRef(null);
  const handleTypoClarificationRef = useRef(null);
  const startDictationRef = useRef(null);
  const dictatingRef = useRef(false);
  const resultRef = useRef(null);
  const handleBlankTapRef = useRef(null);
  const touchStartRef = useRef(null);
  const memoryFetchRef = useRef(false);
  const mobileInputFocusRef = useRef(false);
  const swipeLockRef = useRef(false);
  const swipeDraggingRef = useRef(false);
  const onNextRef = useRef(onNext);
  const onPrevRef = useRef(onPrev);
  onNextRef.current = onNext;
  onPrevRef.current = onPrev;
  const answerSoundsRef = useRef(settings.answerSounds);
  const answerSoundCorrectRef = useRef(settings.answerSoundCorrect);
  const answerSoundWrongRef = useRef(settings.answerSoundWrong);
  answerSoundsRef.current = settings.answerSounds;
  answerSoundCorrectRef.current = settings.answerSoundCorrect;
  answerSoundWrongRef.current = settings.answerSoundWrong;

  function notifyAnswerResult(isCorrect) {
    if (!answerSoundsRef.current) return;
    playAnswerSound(isCorrect, {
      correctId: answerSoundCorrectRef.current,
      wrongId: answerSoundWrongRef.current,
    });
  }

  const fetchMemoryTrickBackground = useCallback(
    async (baseResult) => {
      const priorWrongCount = wordStats?.wrongCount ?? 0;
      const existingTrick = wordStats?.memory_trick ?? baseResult.memory_trick ?? null;

      if (
        existingTrick ||
        !shouldFetchMemoryTrick({
          isCorrect: false,
          priorWrongCount,
          existingTrick,
        })
      ) {
        return;
      }
      if (memoryFetchRef.current) return;

      memoryFetchRef.current = true;
      setMemoryLoading(true);
      try {
        const memory_trick = await fetchMemoryTrick(wordData);
        setResult((prev) =>
          prev && prev.is_correct === false ? { ...prev, memory_trick } : prev
        );
        onMemoryTrickGenerated?.(wordData, memory_trick);
      } catch {
        // ignore background fetch errors
      } finally {
        memoryFetchRef.current = false;
        setMemoryLoading(false);
      }
    },
    [wordData, wordStats?.wrongCount, wordStats?.memory_trick, onMemoryTrickGenerated]
  );

  const pronunciationAlert = useMemo(
    () =>
      getPronunciationAlert(
        wordData?.word,
        wordStats?.memory_trick?.pronunciation_alert ?? result?.memory_trick?.pronunciation_alert
      ),
    [
      wordData?.word,
      wordStats?.memory_trick?.pronunciation_alert,
      result?.memory_trick?.pronunciation_alert,
    ]
  );

  useEffect(() => {
    setPronounceResult(null);
    setPronouncePhase(null);
    pronounceAbortRef.current?.abort();
    pronounceAbortRef.current = null;
  }, [wordData?.word]);

  useEffect(() => {
    answerRef.current = userAnswer;
  }, [userAnswer]);

  useEffect(() => {
    englishAnswerRef.current = englishAttempt;
  }, [englishAttempt]);

  useEffect(() => {
    recallStepRef.current = recallStep;
  }, [recallStep]);

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
    if (settingsOpenRef.current) return;
    const input =
      hideWordFirstRef.current && recallStepRef.current === "english"
        ? englishInputRef.current
        : inputRef.current;
    if (!input || input.disabled) return;

    if (isMobileLayout()) {
      const wasReadOnly = input.readOnly;
      input.readOnly = true;
      input.focus({ preventScroll: true });
      input.readOnly = wasReadOnly;
    } else {
      input.focus({ preventScroll: true });
    }
    if (isTypeModeRef.current) setInputReady(true);
  }, []);

  const queueMobileInputFocus = useCallback(() => {
    if (isMobileLayout() && isTypeModeRef.current) {
      mobileInputFocusRef.current = true;
    }
  }, []);

  const focusCard = useCallback(() => {
    if (settingsOpenRef.current) return;
    inputRef.current?.blur();
    setInputReady(false);
    cardRef.current?.focus({ preventScroll: true });
  }, []);

  const showWrongAnswer = useCallback(
    (aiResult, { playSound = true, persist = true } = {}) => {
      const existingTrick = wordStats?.memory_trick ?? aiResult.memory_trick ?? null;
      const nextResult = {
        ...aiResult,
        is_correct: false,
        ...(existingTrick && !aiResult.memory_trick ? { memory_trick: existingTrick } : {}),
      };

      setResult(nextResult);
      setBackMode("ai");
      setFlipped(true);
      if (playSound) notifyAnswerResult(false);
      if (persist) onResult?.(wordData, nextResult);
      requestAnimationFrame(focusCard);

      if (!nextResult.memory_trick) {
        void fetchMemoryTrickBackground(nextResult);
      }
    },
    [wordData, wordStats?.memory_trick, onResult, focusCard, fetchMemoryTrickBackground]
  );

  const flipBack = useCallback(() => {
    setFlipped(false);
    setBackMode(null);
    setResult(null);
    if (hideWordFirstRef.current) {
      setRecallStep("english");
      setEnglishRecallHint("");
    }
    requestAnimationFrame(isTypeMode ? focusInput : focusCard);
  }, [focusInput, focusCard, isTypeMode]);

  const flipToManual = useCallback(() => {
    if (loadingRef.current || flippedRef.current) return;
    if (hideWordFirstRef.current && recallStepRef.current === "english") return;
    stopDictation();
    setError(null);
    setBackMode("manual");
    setFlipped(true);
    requestAnimationFrame(focusCard);
  }, [stopDictation, focusCard]);

  const handleBlankTap = useCallback(() => {
    if (loadingRef.current || settingsOpenRef.current) return;

    if (flippedRef.current) {
      if (backModeRef.current === "ai") {
        const pending = resultRef.current;
        if (pending?.needs_typo_clarification && !pending?.clarified_typo) return;
      }
      flipBack();
      return;
    }

    flipToManual();
  }, [flipBack, flipToManual]);

  const evalAbortRef = useRef(null);

  const cancelEvaluation = useCallback(() => {
    if (!loadingRef.current) return;
    evalAbortRef.current?.abort();
    evalAbortRef.current = null;
    loadingRef.current = false;
    setLoading(false);
    setError(null);
    requestAnimationFrame(focusInput);
  }, [focusInput]);

  const submitAnswer = useCallback(
    async (answerText) => {
      const text = (answerText ?? answerRef.current).trim();
      if (loadingRef.current || flippedRef.current || !text) return;
      if (hideWordFirstRef.current && recallStepRef.current !== "meaning") return;

      stopDictation();
      evalAbortRef.current?.abort();
      const controller = new AbortController();
      evalAbortRef.current = controller;
      setLoading(true);
      setError(null);
      try {
        const aiResult = await evaluateAnswer(wordData, text, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!aiResult.needs_typo_clarification && !aiResult.is_correct) {
          setFlipped(true);
          showWrongAnswer(aiResult);
          return;
        }
        setResult(aiResult);
        setBackMode("ai");
        setFlipped(true);
        if (!aiResult.needs_typo_clarification) {
          notifyAnswerResult(aiResult.is_correct);
          onResult?.(wordData, aiResult);
        }
        requestAnimationFrame(focusCard);
      } catch (err) {
        if (err?.name === "AbortError" || controller.signal.aborted) return;
        setError(err.message || "AI 批改失败，请稍后重试");
      } finally {
        if (evalAbortRef.current === controller) {
          evalAbortRef.current = null;
        }
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [wordData, onResult, stopDictation, focusCard, showWrongAnswer]
  );

  const handleTypoClarification = useCallback(
    async (isTypo) => {
      if (!result?.needs_typo_clarification || result.clarified_typo) return;

      const typoInfo = result.typo_match;
      let finalResult = isTypo
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

      if (isTypo) {
        setResult(finalResult);
        notifyAnswerResult(true);
        onResult?.(wordData, finalResult);
        requestAnimationFrame(focusCard);
        return;
      }

      showWrongAnswer(
        {
          ...finalResult,
          clarified_typo: true,
        },
        { playSound: true, persist: true }
      );
    },
    [result, wordData, onResult, focusCard, showWrongAnswer]
  );

  useEffect(() => {
    submitAnswerRef.current = submitAnswer;
  }, [submitAnswer]);

  useEffect(() => {
    cancelEvaluationRef.current = cancelEvaluation;
  }, [cancelEvaluation]);

  useEffect(() => {
    handleTypoClarificationRef.current = handleTypoClarification;
  }, [handleTypoClarification]);

  useEffect(() => {
    handleBlankTapRef.current = handleBlankTap;
  }, [handleBlankTap]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return undefined;

    function onTouchStart(e) {
      if (!isMobileLayout() || settingsOpenRef.current || loadingRef.current || swipeLockRef.current) {
        return;
      }
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        t: Date.now(),
        target: e.target,
      };
      setSwipeVisual(null);
      swipeDraggingRef.current = false;
    }

    function onTouchMove(e) {
      const start = touchStartRef.current;
      if (!start || !isMobileLayout() || swipeLockRef.current) return;
      if (isTouchInteractiveTarget(start.target)) return;

      const touch = e.touches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        e.preventDefault();
        swipeDraggingRef.current = true;
        const transform = computeSwipeTransform(dx);
        setSwipeVisual({ mode: "drag", ...transform });
      }
    }

    function clearTouchStart() {
      touchStartRef.current = null;
    }

    function onTouchEnd(e) {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start || !isMobileLayout()) return;
      if (settingsOpenRef.current || loadingRef.current || swipeLockRef.current) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      const dt = Date.now() - start.t;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (isTouchInteractiveTarget(start.target)) {
        setSwipeVisual(null);
        return;
      }

      if (absDx >= SWIPE_THRESHOLD_PX && absDx > absDy * 1.15) {
        swipeLockRef.current = true;
        const exitMode = dx > 0 ? "exit-next" : "exit-prev";
        setSwipeVisual({ mode: exitMode });
        window.setTimeout(() => {
          if (isMobileLayout() && isTypeModeRef.current) {
            mobileInputFocusRef.current = true;
          }
          if (dx > 0) onNextRef.current?.();
          else onPrevRef.current?.();
          setSwipeVisual(null);
          swipeLockRef.current = false;
        }, SWIPE_EXIT_MS);
        return;
      }

      if (swipeDraggingRef.current) {
        swipeDraggingRef.current = false;
        setSwipeVisual({ mode: "snap", x: 0, rotate: 0, opacity: 1 });
        window.setTimeout(() => setSwipeVisual(null), SWIPE_SNAP_MS);
        return;
      }

      if (
        absDx <= TAP_MOVE_TOLERANCE_PX &&
        absDy <= TAP_MOVE_TOLERANCE_PX &&
        dt <= TAP_MAX_DURATION_MS
      ) {
        handleBlankTapRef.current?.();
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", clearTouchStart, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", clearTouchStart);
    };
  }, []);

  const handleManualMark = useCallback(
    async (isCorrect) => {
      if (isCorrect) {
        notifyAnswerResult(true);
        onResult?.(wordData, {
          is_correct: true,
          ai_feedback: "你已标记为认识",
        });
        if (isMobileLayout() && isTypeModeRef.current) {
          mobileInputFocusRef.current = true;
        }
        onNext?.();
        return;
      }

      stopDictation();
      showWrongAnswer({
        is_correct: false,
        ai_feedback: "你已标记为需加强",
      });
    },
    [wordData, onResult, onNext, stopDictation, showWrongAnswer]
  );

  const advanceToMeaningStepRef = useRef(null);

  const advanceToMeaningStep = useCallback(() => {
    const text = englishAnswerRef.current.trim();
    if (!text || !hideWordFirstRef.current) return;

    stopDictation();
    const matched = matchesEnglishRecall(text, wordData.word);
    setEnglishRecallHint(
      matched ? "拼写正确，请写出中文释义" : `已记录「${text}」，请写出中文释义`
    );
    setRecallStep("meaning");
    setUserAnswer("");
    answerRef.current = "";
    setDictationHint("");
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
      setInputReady(true);
    });
  }, [wordData.word, stopDictation]);

  useEffect(() => {
    advanceToMeaningStepRef.current = advanceToMeaningStep;
  }, [advanceToMeaningStep]);

  const scheduleSilenceStop = useCallback(() => {
    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      stopDictation();
      if (hideWordFirstRef.current && recallStepRef.current === "english") {
        const text = englishAnswerRef.current.trim();
        if (text) {
          advanceToMeaningStepRef.current?.();
        } else {
          englishInputRef.current?.focus();
          setInputReady(true);
        }
        return;
      }

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

    const englishPhase = hideWordFirstRef.current && recallStepRef.current === "english";

    setError(null);
    setDictationHint(englishPhase ? "正在聆听英文…" : "正在聆听…");
    if (englishPhase) {
      setEnglishAttempt("");
      englishAnswerRef.current = "";
    } else {
      setUserAnswer("");
      answerRef.current = "";
    }

    const session = createDictationSession({
      lang: englishPhase ? "en-US" : "zh-CN",
      onInterim: (text) => {
        if (englishPhase) {
          setEnglishAttempt(text);
          englishAnswerRef.current = text;
        } else {
          setUserAnswer(text);
          answerRef.current = text;
        }
        setDictationHint(text);
        scheduleSilenceStop();
      },
      onFinal: (text) => {
        if (englishPhase) {
          setEnglishAttempt(text);
          englishAnswerRef.current = text;
        } else {
          setUserAnswer(text);
          answerRef.current = text;
        }
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
    evalAbortRef.current?.abort();
    evalAbortRef.current = null;
    setFlipped(false);
    setBackMode(null);
    setUserAnswer("");
    setEnglishAttempt("");
    setRecallStep("english");
    setEnglishRecallHint("");
    setResult(null);
    setError(null);
    setLoading(false);
    setDictating(false);
    setDictationHint("");
    setPronounceResult(null);
    setPronouncing(false);
    setInputReady(false);
    setSwipeVisual(null);
    swipeLockRef.current = false;
    swipeDraggingRef.current = false;
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
      const delay = isMobileLayout() || mobileInputFocusRef.current ? 0 : 350;
      mobileInputFocusRef.current = false;
      focusTimer = setTimeout(() => focusInput(), delay);
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
    settings.hideWordFirst,
    settings.practiceStyle,
    micGranted,
    isTypeMode,
    focusInput,
    focusCard,
  ]);

  useEffect(() => {
    if (!settingsOpen) return;
    stopDictation();
    inputRef.current?.blur();
    cardRef.current?.blur();
  }, [settingsOpen, stopDictation]);

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
      return active === inputRef.current || active === englishInputRef.current;
    }

    function isTypingEnglishField() {
      return document.activeElement === englishInputRef.current;
    }

    function isInsideVocabAssistant() {
      return Boolean(document.activeElement?.closest?.(".vocab-assistant"));
    }

    function isInsideSettingsPanel() {
      const active = document.activeElement;
      return Boolean(
        settingsOpenRef.current ||
        active?.closest?.(".settings-panel, .settings-overlay")
      );
    }

    function handleGlobalKeyDown(e) {
      if (loadingRef.current) {
        if (e.key === "Escape") {
          e.preventDefault();
          cancelEvaluationRef.current?.();
        }
        return;
      }
      if (isInsideSettingsPanel()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (isInsideVocabAssistant()) return;

      if (flippedRef.current && backModeRef.current === "ai") {
        const pending = resultRef.current;
        if (pending?.needs_typo_clarification && !pending?.clarified_typo) {
          if (isTypingInAnswerField()) return;
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
        if (isTypingInAnswerField()) return;
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
        if (hideWordFirstRef.current && recallStepRef.current === "english" && !flippedRef.current) {
          return;
        }
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

        if (hideWordFirstRef.current && recallStepRef.current === "english") {
          const hasEnglish = englishAnswerRef.current.trim();
          if (!hasEnglish) return;
          e.preventDefault();
          advanceToMeaningStepRef.current?.();
          return;
        }

        const inInput = isTypingInAnswerField();
        const hasAnswer = answerRef.current.trim();

        e.preventDefault();

        if (hasAnswer && (isTypeMode || inInput)) {
          submitAnswer(answerRef.current);
          return;
        }

        const onMeaningStep =
          !hideWordFirstRef.current ||
          recallStepRef.current === "meaning";
        if (onMeaningStep) {
          flipToManual();
        }
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown, true);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown, true);
  }, [onPrev, onNext, submitAnswer, flipToManual, flipBack, handleManualMark, isTypeMode]);

  const onEnglishPhase = hideWordFirst && recallStep === "english";
  const showWord = !onEnglishPhase;

  const frontPrompt = onEnglishPhase
    ? "先听发音，默写或语音输入英文单词"
    : hideWordFirst && recallStep === "meaning"
      ? "写出该词的中文释义，Enter 提交或空内容翻面"
      : isTypeMode
        ? "用中文或别的英文词解释（勿照抄原词），Enter 提交批改"
        : "先在脑海里回忆词义，按空格或 Enter 翻面核对";

  const desktopHint = onEnglishPhase
    ? dictating
      ? "说完后停顿 2 秒进入写释义"
      : "Enter 写释义 · 可点喇叭重听 · ↑↓ 切词"
    : isTypeMode
      ? dictating
        ? "说完后停顿 2 秒自动提交批改"
        : "Enter 提交或空内容翻面 · Shift+Enter 换行 · 框外空格翻面 · ↑↓ 切词"
      : dictating
        ? "说完后停顿 2 秒自动提交"
        : "Enter / 空格翻面 · 输入后 Enter 提交 · Shift+Enter 换行 · ↑↓ 切词";

  const mobileHint = onEnglishPhase
    ? dictating
      ? "说完后停顿 2 秒进入写释义"
      : "听音默写英文 · 点「写释义」继续"
    : isTypeMode
      ? dictating
        ? "说完后停顿 2 秒自动提交"
        : "点卡片空白翻面 · 左滑上一词 · 右滑下一词"
      : dictating
        ? "说完后停顿 2 秒自动提交"
        : "点卡片空白翻面 · 左滑上一词 · 右滑下一词";

  async function handlePronouncePractice() {
    if (!micGranted) {
      setError("请先允许麦克风权限");
      return;
    }

    pronounceAbortRef.current?.abort();
    const controller = new AbortController();
    pronounceAbortRef.current = controller;

    setPronouncePhase("listening");
    setPronounceResult(null);
    setError(null);

    let heardTranscript = "";

    try {
      const heard = await listenOnce({
        lang: "en-US",
        maxDurationMs: 8000,
        withAlternatives: true,
      });

      const transcript = typeof heard === "string" ? heard : heard?.transcript;
      const alternatives = typeof heard === "string" ? [] : heard?.alternatives ?? [];
      heardTranscript = transcript?.trim() || "";

      if (!heardTranscript) {
        throw new Error("未检测到语音，请再试一次");
      }

      setPronouncePhase("evaluating");

      const alert = getPronunciationAlert(wordData.word);
      const evaluation = await evaluatePronunciation(wordData, {
        transcript: heardTranscript,
        alternatives,
        pronunciationHint: alert?.message,
        signal: controller.signal,
      });

      setPronounceResult({
        ok: Boolean(evaluation.is_correct),
        transcript: heardTranscript,
        message: evaluation.feedback || (evaluation.is_correct ? "发音正确！" : "请再听标准音，按音节重读。"),
        syllables: evaluation.expected_syllables ?? [],
        stressIndex: evaluation.stress_index ?? 0,
        expectedIpa: evaluation.expected_ipa ?? "",
        issues: evaluation.issues ?? [],
      });
    } catch (err) {
      if (err.name === "AbortError") return;
      const fallbackOk = heardTranscript
        ? checkPronunciation(heardTranscript, wordData.word)
        : false;
      setPronounceResult({
        ok: fallbackOk,
        transcript: heardTranscript,
        message:
          err.message ||
          (fallbackOk
            ? "发音基本正确（AI 批改暂不可用）"
            : heardTranscript
              ? `识别为「${heardTranscript}」，再听标准音试试`
              : "读音批改失败"),
        syllables: [],
        stressIndex: 0,
        expectedIpa: "",
        issues: err.message ? [err.message] : [],
      });
    } finally {
      setPronouncePhase(null);
      pronounceAbortRef.current = null;
    }
  }

  function renderSyllableGuide(syllables, stressIndex) {
    if (!syllables?.length) return null;
    return (
      <span className="flashcard__pronounce-syllables">
        {syllables.map((syllable, index) => (
          <span
            key={`${syllable}-${index}`}
            className={`flashcard__pronounce-syllable${index === stressIndex ? " flashcard__pronounce-syllable--stress" : ""}`}
          >
            {syllable}
          </span>
        ))}
      </span>
    );
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

  const swipeLayerClass = [
    "flashcard-swipe",
    swipeVisual?.mode === "drag" && "flashcard-swipe--dragging",
    swipeVisual?.mode === "snap" && "flashcard-swipe--snap",
    swipeVisual?.mode === "exit-next" && "flashcard-swipe--exit-next",
    swipeVisual?.mode === "exit-prev" && "flashcard-swipe--exit-prev",
  ]
    .filter(Boolean)
    .join(" ");

  const swipeLayerStyle =
    swipeVisual && (swipeVisual.mode === "drag" || swipeVisual.mode === "snap")
      ? {
          transform: `translateX(${swipeVisual.x}px) rotate(${swipeVisual.rotate}deg)`,
          opacity: swipeVisual.opacity ?? 1,
        }
      : undefined;

  return (
    <div
      ref={cardRef}
      className="flashcard-scene"
      tabIndex={-1}
      aria-label="单词卡片"
    >
      <div className={swipeLayerClass} style={swipeLayerStyle}>
      <div className={`flashcard ${flipped ? "flashcard--flipped" : ""} ${borderClass}`}>
        <div className="flashcard__face flashcard__front">
          <div className="flashcard__term">
            <div className="flashcard__term-row">
              <h2
                className={`flashcard__word${showWord ? "" : " flashcard__word--hidden"}`}
                aria-hidden={!showWord}
              >
                {showWord ? wordData.word : "？？？"}
              </h2>
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
                    className={`flashcard__sound flashcard__sound--repeat ${pronouncePhase ? "flashcard__sound--active" : ""}`}
                    onClick={handlePronouncePractice}
                    disabled={Boolean(pronouncePhase) || loading}
                    aria-label="跟读单词"
                    title="跟读单词（按音节与重音严格批改）"
                  >
                    <MicIcon />
                  </button>
                )}
              </div>
            </div>

            <PronunciationAlert alert={pronunciationAlert} className="flashcard__pronunciation-alert" />

            {micGranted && (
              <div className="flashcard__pronounce-block">
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
                  {pronounceEnabled && pronouncePhase === "listening" && (
                    <span className="flashcard__pronounce-status flashcard__pronounce-status--pending">
                      聆听中…
                    </span>
                  )}
                  {pronounceEnabled && pronouncePhase === "evaluating" && (
                    <span className="flashcard__pronounce-status flashcard__pronounce-status--pending">
                      分析音节与重音…
                    </span>
                  )}
                </div>
                {pronounceEnabled && !pronouncePhase && pronounceResult && (
                  <div
                    className={`flashcard__pronounce-feedback ${pronounceResult.ok ? "flashcard__pronounce-feedback--ok" : "flashcard__pronounce-feedback--fail"}`}
                  >
                    <p className="flashcard__pronounce-status">{pronounceResult.message}</p>
                    {(pronounceResult.expectedIpa || pronounceResult.syllables?.length > 0) && (
                      <div className="flashcard__pronounce-guide">
                        {pronounceResult.expectedIpa && (
                          <span className="flashcard__pronounce-ipa">{pronounceResult.expectedIpa}</span>
                        )}
                        {renderSyllableGuide(pronounceResult.syllables, pronounceResult.stressIndex)}
                      </div>
                    )}
                    {pronounceResult.issues?.length > 0 && (
                      <ul className="flashcard__pronounce-issues">
                        {pronounceResult.issues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    )}
                    {pronounceResult.transcript && !pronounceResult.ok && (
                      <p className="flashcard__pronounce-heard">识别为「{pronounceResult.transcript}」</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="flashcard__prompt">{frontPrompt}</p>

          {onEnglishPhase ? (
            <div className="flashcard__input-wrap">
              <textarea
                ref={englishInputRef}
                className={`flashcard__input flashcard__input--english${inputReady ? " flashcard__input--ready" : ""}`}
                inputMode="text"
                enterKeyHint="next"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder={micGranted ? "听音默写英文单词，也可语音输入…" : "听音默写英文单词…"}
                value={englishAttempt}
                onChange={(e) => setEnglishAttempt(e.target.value)}
                onFocus={() => {
                  if (settingsOpenRef.current) {
                    englishInputRef.current?.blur();
                    return;
                  }
                  setInputReady(true);
                }}
                onBlur={() => setInputReady(false)}
                disabled={loading || dictating || settingsOpen}
                rows={3}
              />
              {micGranted && (
                <button
                  type="button"
                  className={`voice-btn voice-btn--dictate ${dictating ? "voice-btn--active" : ""}`}
                  onClick={startDictation}
                  disabled={loading || dictating}
                  title="语音输入英文单词"
                  aria-label="语音输入英文单词"
                >
                  <MicIcon />
                </button>
              )}
            </div>
          ) : (
          <div className="flashcard__input-wrap">
            <textarea
              ref={inputRef}
              className={`flashcard__input${inputReady ? " flashcard__input--ready" : ""}`}
              inputMode="text"
              enterKeyHint="done"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={
                hideWordFirst && recallStep === "meaning"
                  ? micGranted
                    ? "写出中文释义，也可语音输入…"
                    : "写出中文释义…"
                  : isTypeMode
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
                if (settingsOpenRef.current) {
                  inputRef.current?.blur();
                  return;
                }
                if (isTypeMode) setInputReady(true);
              }}
              onBlur={() => setInputReady(false)}
              disabled={loading || dictating || settingsOpen || (hideWordFirst && recallStep === "english")}
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
          )}

          {englishRecallHint && !onEnglishPhase ? (
            <p className="flashcard__recall-hint">{englishRecallHint}</p>
          ) : null}

          {dictationHint && <p className="flashcard__dictation-hint">{dictationHint}</p>}

          <div className="flashcard__footer">
            {loading ? (
              <span className="flashcard__status">
                <span className="spinner" />
                批改中
                <button
                  type="button"
                  className="flashcard__cancel-eval"
                  onClick={cancelEvaluation}
                >
                  取消
                </button>
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

              {!result.is_correct && wordData.definitions?.length > 0 && (
                <BookDefinitionsList definitions={wordData.definitions} result={result} lead />
              )}

              <div className="flashcard__feedback">
                <p className="flashcard__feedback-text">{result.ai_feedback}</p>
                {result.is_correct && wordData.definitions?.length > 0 && (
                  <BookDefinitionsList definitions={wordData.definitions} result={result} />
                )}
              </div>

              {!result.is_correct && memoryLoading && !result.memory_trick && (
                <p className="flashcard__memory-status">
                  <span className="spinner spinner--inline" />
                  记忆法生成中…
                </p>
              )}

              {!result.is_correct && result.memory_trick && (
                <MemoryTrickBlock trick={result.memory_trick} />
              )}

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
                点空白翻回 · 左滑上一词 · 右滑下一词
              </p>
            </>
          )}
        </div>
      </div>
      </div>

      <div className="flashcard__mobile-bar" aria-label="移动端快捷操作">
        <button
          type="button"
          className="flashcard__mobile-btn"
          onClick={() => {
            queueMobileInputFocus();
            onPrev?.();
          }}
        >
          上一词
        </button>
        {!flipped ? (
          loading ? (
            <button
              type="button"
              className="flashcard__mobile-btn flashcard__mobile-btn--accent"
              onClick={cancelEvaluation}
            >
              取消批改
            </button>
          ) : onEnglishPhase ? (
            <button
              type="button"
              className="flashcard__mobile-btn flashcard__mobile-btn--accent"
              onClick={() => advanceToMeaningStep()}
              disabled={!englishAttempt.trim()}
            >
              写释义
            </button>
          ) : (
          <button
            type="button"
            className="flashcard__mobile-btn flashcard__mobile-btn--accent"
            onClick={() => (userAnswer.trim() ? submitAnswer(userAnswer) : flipToManual())}
          >
            {userAnswer.trim() ? "提交批改" : "翻面"}
          </button>
          )
        ) : backMode === "ai" ? (
          awaitingTypoClarification ? (
            <button type="button" className="flashcard__mobile-btn" disabled>
              请先确认
            </button>
          ) : (
          <button type="button" className="flashcard__mobile-btn flashcard__mobile-btn--accent" onClick={() => {
            queueMobileInputFocus();
            onNext?.();
          }}>
            下一个
          </button>
          )
        ) : (
          <button type="button" className="flashcard__mobile-btn" onClick={flipBack}>
            翻回正面
          </button>
        )}
        <button
          type="button"
          className="flashcard__mobile-btn"
          onClick={() => {
            queueMobileInputFocus();
            onNext?.();
          }}
        >
          下一词
        </button>
      </div>
    </div>
  );
}

function BookDefinitionsList({ definitions, result, lead = false }) {
  if (!definitions?.length) return null;

  const matched = new Set(result?.matched_definition_indices ?? []);
  const missed = new Set(result?.missed_definition_indices ?? []);
  const highlight = Boolean(result?.is_correct && result?.partial_meaning);

  return (
    <div className={`flashcard__book-defs${lead ? " flashcard__book-defs--lead" : ""}`}>
      <span className="flashcard__book-defs-label">
        {highlight ? "书上释义（高亮为尚未答到的义项）" : "书上释义"}
      </span>
      <ul className="flashcard__definitions flashcard__definitions--book">
        {definitions.map((def, i) => (
          <li
            key={i}
            className={
              highlight && missed.has(i)
                ? "flashcard__def--missed"
                : highlight && matched.has(i)
                  ? "flashcard__def--matched"
                  : undefined
            }
          >
            {def}
          </li>
        ))}
      </ul>
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
