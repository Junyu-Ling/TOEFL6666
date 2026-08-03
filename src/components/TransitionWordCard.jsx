import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "../context/SettingsContext";
import { useIsActiveTab } from "../context/ActiveTabContext";
import { playAnswerSound } from "../utils/answerSounds";
import { shouldIgnoreAppGameKeys } from "../utils/appKeyboard";
import { evaluateTransitionWordChoice } from "../utils/transitionWords";

export default function TransitionWordCard({
  wordData,
  choices,
  onResult,
  onNext,
  onPrev,
  tabId,
}) {
  const { settings, speakWord, settingsOpen } = useSettings();
  const isActive = useIsActiveTab(tabId);
  const [flipped, setFlipped] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [result, setResult] = useState(null);
  const cardRef = useRef(null);
  const answeredRef = useRef(false);

  const transitionWord = wordData?.transitionWord;

  useEffect(() => {
    setFlipped(false);
    setSelectedId(null);
    setResult(null);
    answeredRef.current = false;
  }, [wordData?.word, transitionWord?.entryId]);

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
      setFlipped(true);
      if (settings.answerSounds) {
        playAnswerSound(aiResult.is_correct ? settings.answerSoundCorrect : settings.answerSoundWrong);
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
      if (e.key === "ArrowDown" || (flipped && (e.key === "Enter" || e.key === " "))) {
        e.preventDefault();
        if (flipped) onNext?.();
        return;
      }
      if (flipped) return;

      const choiceIndex = "1234".indexOf(e.key);
      if (choiceIndex >= 0 && choices[choiceIndex]) {
        e.preventDefault();
        handleChoice(choices[choiceIndex].id);
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [choices, flipped, handleChoice, isActive, onNext, onPrev, settingsOpen]);

  const choiceButtons = useMemo(
    () =>
      choices.map((choice, index) => {
        const isSelected = selectedId === choice.id;
        const isCorrect = choice.id === transitionWord?.categoryId;
        let stateClass = "";
        if (flipped) {
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
            disabled={flipped}
          >
            <span className="tw-card__choice-key" aria-hidden>
              {index + 1}
            </span>
            <span className="tw-card__choice-text">
              <strong>{choice.label}</strong>
              <small>{choice.subtitle}</small>
            </span>
          </button>
        );
      }),
    [choices, flipped, handleChoice, selectedId, transitionWord?.categoryId]
  );

  return (
    <div ref={cardRef} className="flashcard-scene tw-card-scene" aria-label="过渡词卡片">
      <div className={`flashcard tw-card ${flipped ? "flashcard--flipped" : ""}`}>
        <div className="flashcard__face flashcard__front tw-card__front">
          <div className="flashcard__term">
            <div className="flashcard__term-row">
              <h2 className="flashcard__word tw-card__word">{wordData.word}</h2>
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
          </div>

          <p className="flashcard__prompt">选择这个过渡词表示的逻辑关系</p>

          <div className="tw-card__choices" role="listbox" aria-label="逻辑关系选项">
            {choiceButtons}
          </div>

          <p className="flashcard__status">按 1–4 选择 · ↑↓ 切词</p>
        </div>

        <div className="flashcard__face flashcard__back tw-card__back">
          <div className={`flashcard__badge ${result?.is_correct ? "flashcard__badge--ok" : "flashcard__badge--fail"}`}>
            {result?.is_correct ? "正确" : "需加强"}
          </div>

          <div className="flashcard__feedback">
            <p className="flashcard__feedback-text">
              {result?.is_correct
                ? "正确！"
                : result?.ai_feedback || `正确关系：${transitionWord?.categoryLabel}`}
            </p>
          </div>

          <ul className="flashcard__definitions">
            <li>
              {transitionWord?.categoryLabel}：{transitionWord?.categorySubtitle}
            </li>
          </ul>

          <button type="button" className="btn btn--primary flashcard__next" onClick={onNext}>
            下一个
          </button>
          <p className="flashcard__footer flashcard__footer--back">Enter 下一个 · ↑↓ 切词</p>
        </div>
      </div>
    </div>
  );
}
