import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "../context/SettingsContext";
import { useIsActiveTab } from "../context/ActiveTabContext";
import { playAnswerSound } from "../utils/answerSounds";
import { shouldIgnoreAppGameKeys } from "../utils/appKeyboard";
import {
  evaluateTransitionWordChoice,
  getTransitionWordCategoryOptions,
} from "../utils/transitionWords";
import { getPhonetic } from "../services/phonetics";

export default function TransitionWordCard({
  wordData,
  onResult,
  onNext,
  onPrev,
  tabId,
}) {
  const { settings, speakWord, settingsOpen } = useSettings();
  const isActive = useIsActiveTab(tabId);
  const categories = useMemo(() => getTransitionWordCategoryOptions(), []);
  const [answered, setAnswered] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [result, setResult] = useState(null);
  const answeredRef = useRef(false);

  const transitionWord = wordData?.transitionWord;
  const phonetic = useMemo(() => getPhonetic(wordData?.word), [wordData?.word]);

  useEffect(() => {
    setAnswered(false);
    setSelectedId(null);
    setResult(null);
    answeredRef.current = false;
  }, [wordData?.word, transitionWord?.entryId]);

  useEffect(() => {
    if (!answered) return undefined;
    const timer = window.setTimeout(() => onNext?.(), 1500);
    return () => window.clearTimeout(timer);
  }, [answered, onNext]);

  useEffect(() => {
    if (!settings.autoReadOnNewWord || !wordData?.word) return undefined;
    const timer = window.setTimeout(() => speakWord(wordData.word), 200);
    return () => window.clearTimeout(timer);
  }, [wordData?.word, settings.autoReadOnNewWord, speakWord]);

  const handleChoice = useCallback(
    (categoryId) => {
      if (answeredRef.current || !transitionWord) return;
      answeredRef.current = true;

      const aiResult = evaluateTransitionWordChoice(categoryId, transitionWord);
      setSelectedId(categoryId);
      setResult(aiResult);
      setAnswered(true);
      if (settings.answerSounds) {
        playAnswerSound(aiResult.is_correct, {
          correctId: settings.answerSoundCorrect,
          wrongId: settings.answerSoundWrong,
        });
      }
      onResult?.(wordData, aiResult);
    },
    [onResult, settings.answerSoundCorrect, settings.answerSoundWrong, settings.answerSounds, transitionWord, wordData]
  );

  useEffect(() => {
    if (!isActive) return undefined;

    function handleKeyDown(e) {
      if (shouldIgnoreAppGameKeys(e) || settingsOpen) return;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        onPrev?.();
        return;
      }
      if (e.key === "ArrowDown" || (answered && (e.key === "Enter" || e.key === " "))) {
        e.preventDefault();
        if (answered) onNext?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [answered, isActive, onNext, onPrev, settingsOpen]);

  return (
    <div className="tw-card-scene" aria-label="过渡词练习">
      <div className="tw-card__head">
        <div className="tw-card__term-row">
          <div className="flashcard__word-group">
            <h2 className="tw-card__word">{wordData.word}</h2>
            {phonetic && (
              <div className="flashcard__phonetic">{phonetic}</div>
            )}
          </div>
          <button
            type="button"
            className="flashcard__sound"
            onClick={() => speakWord(wordData.word)}
            aria-label="播放发音"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
          </button>
        </div>
        <p className="tw-card__prompt">选择这个过渡词表示的逻辑关系</p>
      </div>

      <div className="tw-card__choices" role="listbox" aria-label="全部逻辑关系">
        {categories.map((choice) => {
          const isSelected = selectedId === choice.id;
          const allCorrect = transitionWord?.allCorrectCategoryIds ?? (transitionWord?.categoryId ? [transitionWord.categoryId] : []);
          const isCorrect = allCorrect.includes(choice.id);
          let stateClass = "";
          if (answered) {
            if (isCorrect) stateClass = " tw-card__choice--correct";
            else if (isSelected) stateClass = " tw-card__choice--wrong";
            else stateClass = " tw-card__choice--muted";
          }

          return (
            <button
              key={choice.id}
              type="button"
              className={`tw-card__choice${stateClass}`}
              onClick={() => handleChoice(choice.id)}
              disabled={answered}
            >
              <span className="tw-card__choice-text">
                <strong>{choice.label}</strong>
                <small>{choice.subtitle}</small>
              </span>
            </button>
          );
        })}
      </div>

      {answered && result ? (
        <div className={`tw-card__result${result.is_correct ? " tw-card__result--ok" : " tw-card__result--fail"}`}>
          <div className={`flashcard__badge ${result.is_correct ? "flashcard__badge--ok" : "flashcard__badge--fail"}`}>
            {result.is_correct ? "正确" : "需加强"}
          </div>
          <p className="tw-card__result-text">
            {result.is_correct
              ? `${transitionWord.categoryLabel}：${transitionWord.categorySubtitle}`
              : result.ai_feedback}
          </p>
          <button type="button" className="btn btn--primary flashcard__next" onClick={onNext}>
            下一个
          </button>
          <p className="flashcard__footer flashcard__footer--back">Enter 下一个 · ↑↓ 切词</p>
        </div>
      ) : (
        <p className="flashcard__status tw-card__hint">点击选择逻辑关系 · ↑↓ 切词</p>
      )}
    </div>
  );
}
