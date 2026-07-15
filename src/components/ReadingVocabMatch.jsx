import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "../context/SettingsContext";
import { evaluateAnswer } from "../services/ai";
import { lookupWordDefinitions } from "../services/wordLookup";
import { buildWordBankMap } from "../utils/homophoneBank";
import { playAnswerSound } from "../utils/answerSounds";
import {
  buildSetRound,
  findPairById,
  getReadingVocabSets,
  getReadingVocabTitle,
  resolveWordData,
} from "../utils/readingVocabMatch";

function MeaningPanel({
  pair,
  meaningInput,
  onMeaningInputChange,
  onSubmit,
  evaluating,
  feedback,
  definitions,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [pair?.id]);

  if (!pair) return null;

  return (
    <div className="rvocab__meaning-panel">
      <div className="rvocab__meaning-header">
        <span className="rvocab__meaning-label">已匹配</span>
        <strong className="rvocab__meaning-word">{pair.word}</strong>
        <span className="rvocab__meaning-eq">=</span>
        <span className="rvocab__meaning-synonym">{pair.synonym}</span>
      </div>
      <p className="rvocab__meaning-prompt">请写出 <strong>{pair.word}</strong> 的中文意思</p>
      <form
        className="rvocab__meaning-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <input
          ref={inputRef}
          type="text"
          className="rvocab__meaning-input"
          value={meaningInput}
          onChange={(event) => onMeaningInputChange(event.target.value)}
          placeholder="输入中文释义…"
          disabled={evaluating}
          autoComplete="off"
        />
        <button type="submit" className="btn btn--primary" disabled={evaluating || !meaningInput.trim()}>
          {evaluating ? "批改中…" : "提交"}
        </button>
      </form>
      {feedback && (
        <p className={`rvocab__meaning-feedback ${feedback.correct ? "rvocab__meaning-feedback--ok" : "rvocab__meaning-feedback--err"}`}>
          {feedback.message}
        </p>
      )}
      {definitions?.length > 0 && feedback && !feedback.correct && (
        <p className="rvocab__meaning-hint">参考：{definitions.join("；")}</p>
      )}
    </div>
  );
}

export default function ReadingVocabMatch({ words }) {
  const { settings, speakWord } = useSettings();
  const sets = useMemo(() => getReadingVocabSets(), []);
  const wordBankMap = useMemo(() => buildWordBankMap(words), [words]);
  const definitionCacheRef = useRef(new Map());

  const [setIndex, setSetIndex] = useState(0);
  const [round, setRound] = useState(() => buildSetRound(sets[0]));
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
  const [matchedIds, setMatchedIds] = useState(() => new Set());
  const [completedIds, setCompletedIds] = useState(() => new Set());
  const [pendingMeaningId, setPendingMeaningId] = useState(null);
  const [meaningInput, setMeaningInput] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [shake, setShake] = useState(false);
  const [setComplete, setSetComplete] = useState(false);
  const evaluateAbortRef = useRef(null);

  const currentSet = sets[setIndex];
  const pendingPair = pendingMeaningId ? findPairById(round, pendingMeaningId) : null;
  const totalPairs = round.pairs.length;
  const doneCount = completedIds.size;

  const resetRoundState = useCallback((nextRound) => {
    evaluateAbortRef.current?.abort();
    evaluateAbortRef.current = null;
    setRound(nextRound);
    setSelectedLeft(null);
    setSelectedRight(null);
    setMatchedIds(new Set());
    setCompletedIds(new Set());
    setPendingMeaningId(null);
    setMeaningInput("");
    setFeedback(null);
    setEvaluating(false);
    setShake(false);
    setSetComplete(false);
  }, []);

  const loadSet = useCallback(
    (index) => {
      const safeIndex = Math.max(0, Math.min(index, sets.length - 1));
      setSetIndex(safeIndex);
      resetRoundState(buildSetRound(sets[safeIndex]));
    },
    [resetRoundState, sets]
  );

  useEffect(() => {
    return () => evaluateAbortRef.current?.abort();
  }, []);

  const getDefinitionsForWord = useCallback(
    async (word) => {
      const key = word.toLowerCase().trim();
      const cached = definitionCacheRef.current.get(key);
      if (cached) return cached;

      const fromBank = resolveWordData(word, wordBankMap);
      if (fromBank.definitions?.length) {
        definitionCacheRef.current.set(key, fromBank.definitions);
        return fromBank.definitions;
      }

      try {
        const data = await lookupWordDefinitions(word);
        const definitions = Array.isArray(data.definitions) ? data.definitions : [];
        definitionCacheRef.current.set(key, definitions);
        return definitions;
      } catch {
        definitionCacheRef.current.set(key, []);
        return [];
      }
    },
    [wordBankMap]
  );

  const handleWrongMatch = useCallback(() => {
    setShake(true);
    setSelectedLeft(null);
    setSelectedRight(null);
    if (settings.answerSounds) {
      playAnswerSound(false, {
        correctId: settings.answerSoundCorrect,
        wrongId: settings.answerSoundWrong,
      });
    }
    window.setTimeout(() => setShake(false), 450);
  }, [settings]);

  const tryMatch = useCallback(
    (leftId, rightId) => {
      if (leftId === rightId) {
        const pair = findPairById(round, leftId);
        setMatchedIds((prev) => new Set(prev).add(leftId));
        setSelectedLeft(null);
        setSelectedRight(null);
        setPendingMeaningId(leftId);
        setMeaningInput("");
        setFeedback(null);
        if (pair?.word) speakWord(pair.word);
        if (settings.answerSounds) {
          playAnswerSound(true, {
            correctId: settings.answerSoundCorrect,
            wrongId: settings.answerSoundWrong,
          });
        }
      }
      handleWrongMatch();
    },
    [handleWrongMatch, round, settings, speakWord]
  );

  const handleLeftClick = useCallback(
    (id) => {
      if (pendingMeaningId || matchedIds.has(id) || completedIds.has(id)) return;
      if (selectedLeft === id) {
        setSelectedLeft(null);
        return;
      }
      const nextLeft = id;
      setSelectedLeft(nextLeft);
      if (selectedRight) tryMatch(nextLeft, selectedRight);
    },
    [completedIds, matchedIds, pendingMeaningId, selectedLeft, selectedRight, tryMatch]
  );

  const handleRightClick = useCallback(
    (id) => {
      if (pendingMeaningId || matchedIds.has(id) || completedIds.has(id)) return;
      if (selectedRight === id) {
        setSelectedRight(null);
        return;
      }
      const nextRight = id;
      setSelectedRight(nextRight);
      if (selectedLeft) tryMatch(selectedLeft, nextRight);
    },
    [completedIds, matchedIds, pendingMeaningId, selectedLeft, selectedRight, tryMatch]
  );

  const submitMeaning = useCallback(async () => {
    if (!pendingPair || !meaningInput.trim() || evaluating) return;

    evaluateAbortRef.current?.abort();
    const controller = new AbortController();
    evaluateAbortRef.current = controller;

    setEvaluating(true);
    setFeedback(null);

    try {
      const definitions = await getDefinitionsForWord(pendingPair.word);
      const wordData = { word: pendingPair.word, definitions };
      const result = await evaluateAnswer(wordData, meaningInput, {
        signal: controller.signal,
        wordBankMap,
      });

      if (result.is_correct) {
        if (settings.answerSounds) {
          playAnswerSound(true, {
            correctId: settings.answerSoundCorrect,
            wrongId: settings.answerSoundWrong,
          });
        }
        setCompletedIds((prev) => new Set(prev).add(pendingPair.id));
        setPendingMeaningId(null);
        setMeaningInput("");
        setFeedback({ correct: true, message: result.ai_feedback || "正确！" });

        const nextDone = doneCount + 1;
        if (nextDone >= totalPairs) {
          setSetComplete(true);
        }
      } else {
        if (settings.answerSounds) {
          playAnswerSound(false, {
            correctId: settings.answerSoundCorrect,
            wrongId: settings.answerSoundWrong,
          });
        }
        setFeedback({
          correct: false,
          message: result.ai_feedback || "不太对，再试试。",
        });
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        setFeedback({ correct: false, message: error.message || "批改失败，请重试。" });
      }
    } finally {
      if (!controller.signal.aborted) setEvaluating(false);
    }
  }, [
    doneCount,
    evaluating,
    getDefinitionsForWord,
    meaningInput,
    pendingPair,
    settings,
    totalPairs,
    wordBankMap,
  ]);

  const pendingDefinitions = useMemo(() => {
    if (!pendingPair) return [];
    return resolveWordData(pendingPair.word, wordBankMap).definitions ?? [];
  }, [pendingPair, wordBankMap]);

  if (!sets.length) {
    return <div className="rvocab__empty">暂无阅读词汇题数据</div>;
  }

  return (
    <div className="rvocab">
      <header className="rvocab__header">
        <div>
          <h2 className="rvocab__title">{getReadingVocabTitle()}</h2>
          <p className="rvocab__subtitle">
            第 {currentSet.id} 组 · 共 {sets.length} 组 · 进度 {doneCount}/{totalPairs}
          </p>
        </div>
        <div className="rvocab__set-nav">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={setIndex <= 0}
            onClick={() => loadSet(setIndex - 1)}
          >
            上一组
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={setIndex >= sets.length - 1}
            onClick={() => loadSet(setIndex + 1)}
          >
            下一组
          </button>
        </div>
      </header>

      <p className="rvocab__instructions">
        点击左侧单词与右侧近义词配对；每成功匹配一对，需写出该单词的中文意思。
      </p>

      <div className={`rvocab__board ${shake ? "rvocab__board--shake" : ""}`}>
        <div className="rvocab__column">
          <span className="rvocab__column-label">单词</span>
          {round.leftItems.map((item) => {
            const isDone = completedIds.has(item.id);
            const isMatched = matchedIds.has(item.id);
            const isSelected = selectedLeft === item.id;
            const isPending = pendingMeaningId === item.id;
            return (
              <button
                key={`left-${item.id}`}
                type="button"
                className={[
                  "rvocab__item",
                  "rvocab__item--left",
                  isSelected && "rvocab__item--selected",
                  isMatched && "rvocab__item--matched",
                  isDone && "rvocab__item--done",
                  isPending && "rvocab__item--pending",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={Boolean(pendingMeaningId) || isDone || isMatched}
                onClick={() => handleLeftClick(item.id)}
              >
                {item.text}
              </button>
            );
          })}
        </div>

        <div className="rvocab__column">
          <span className="rvocab__column-label">近义词</span>
          {round.rightItems.map((item) => {
            const isDone = completedIds.has(item.id);
            const isMatched = matchedIds.has(item.id);
            const isSelected = selectedRight === item.id;
            const isPending = pendingMeaningId === item.id;
            return (
              <button
                key={`right-${item.id}`}
                type="button"
                className={[
                  "rvocab__item",
                  "rvocab__item--right",
                  isSelected && "rvocab__item--selected",
                  isMatched && "rvocab__item--matched",
                  isDone && "rvocab__item--done",
                  isPending && "rvocab__item--pending",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={Boolean(pendingMeaningId) || isDone || isMatched}
                onClick={() => handleRightClick(item.id)}
              >
                {item.text}
              </button>
            );
          })}
        </div>
      </div>

      {pendingPair && !setComplete && (
        <MeaningPanel
          pair={pendingPair}
          meaningInput={meaningInput}
          onMeaningInputChange={setMeaningInput}
          onSubmit={submitMeaning}
          evaluating={evaluating}
          feedback={feedback}
          definitions={pendingDefinitions}
        />
      )}

      {setComplete && (
        <div className="rvocab__complete">
          <p>第 {currentSet.id} 组全部完成！</p>
          {setIndex < sets.length - 1 ? (
            <button type="button" className="btn btn--primary" onClick={() => loadSet(setIndex + 1)}>
              下一组
            </button>
          ) : (
            <p className="rvocab__complete-all">全部 {sets.length} 组已完成 🎉</p>
          )}
        </div>
      )}
    </div>
  );
}
