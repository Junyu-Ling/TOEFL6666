import { useCallback, useEffect, useMemo, useState } from "react";
import { useSettings } from "../context/SettingsContext";
import { resolveReadingVocabDefinitions } from "../services/readingVocabDefinitions";
import {
  getSavedSetProgress,
  loadReadingVocabProgress,
  patchReadingVocabSetIndex,
  patchSavedSetProgress,
} from "../services/readingVocabProgress";
import { buildWordBankMap } from "../utils/homophoneBank";
import { playAnswerSound } from "../utils/answerSounds";
import {
  buildSetRound,
  findPairById,
  getReadingVocabSets,
  getReadingVocabTitle,
  restoreSetRound,
} from "../utils/readingVocabMatch";

function RevealPanel({ pair, definitions, loading, onContinue }) {
  if (!pair) return null;

  return (
    <div className="rvocab__meaning-panel">
      <div className="rvocab__meaning-header">
        <span className="rvocab__meaning-label">已匹配</span>
        <strong className="rvocab__meaning-word">{pair.word}</strong>
        <span className="rvocab__meaning-eq">=</span>
        <span className="rvocab__meaning-synonym">{pair.synonym}</span>
      </div>
      <div className="rvocab__reveal-body">
        {loading ? (
          <p className="rvocab__reveal-loading">正在查询中文释义…</p>
        ) : definitions.length > 0 ? (
          <ul className="rvocab__reveal-list">
            {definitions.map((definition, index) => (
              <li key={`${definition}-${index}`}>{definition}</li>
            ))}
          </ul>
        ) : (
          <p className="rvocab__reveal-empty">词库中暂无该词的中文释义</p>
        )}
      </div>
      <button type="button" className="btn btn--primary rvocab__reveal-continue" onClick={onContinue}>
        继续
      </button>
    </div>
  );
}

function createInitialState(sets) {
  const saved = loadReadingVocabProgress();
  const setIndex = Math.max(0, Math.min(saved?.setIndex ?? 0, sets.length - 1));
  const set = sets[setIndex];
  const savedSet = getSavedSetProgress(set.id);
  const round = restoreSetRound(set, savedSet);

  return {
    setIndex,
    round,
    completedIds: new Set(savedSet?.completedIds ?? []),
    setComplete: savedSet?.setComplete === true,
  };
}

function persistSetState(setId, round, completedIds, setComplete) {
  patchSavedSetProgress(setId, {
    completedIds: [...completedIds],
    leftItemIds: round.leftItems.map((item) => item.id),
    rightItemIds: round.rightItems.map((item) => item.id),
    setComplete,
  });
}

export default function ReadingVocabMatch({ words }) {
  const { settings, speakWord } = useSettings();
  const sets = useMemo(() => getReadingVocabSets(), []);
  const wordBankMap = useMemo(() => buildWordBankMap(words), [words]);
  const [initialState] = useState(() => createInitialState(sets));

  const [setIndex, setSetIndex] = useState(initialState.setIndex);
  const [round, setRound] = useState(initialState.round);
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
  const [completedIds, setCompletedIds] = useState(initialState.completedIds);
  const [revealPairId, setRevealPairId] = useState(null);
  const [revealDefinitions, setRevealDefinitions] = useState([]);
  const [revealLoading, setRevealLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [setComplete, setSetComplete] = useState(initialState.setComplete);

  const currentSet = sets[setIndex];
  const revealPair = revealPairId ? findPairById(round, revealPairId) : null;
  const totalPairs = round.pairs.length;
  const doneCount = completedIds.size;

  useEffect(() => {
    if (!currentSet) return;
    persistSetState(currentSet.id, round, completedIds, setComplete);
    patchReadingVocabSetIndex(setIndex);
  }, [completedIds, currentSet, round, setComplete, setIndex]);

  const notifyAnswerResult = useCallback(
    (isCorrect) => {
      if (!settings.answerSounds) return;
      playAnswerSound(isCorrect, {
        correctId: settings.answerSoundCorrect,
        wrongId: settings.answerSoundWrong,
      });
    },
    [settings.answerSoundCorrect, settings.answerSoundWrong, settings.answerSounds]
  );

  const applySetState = useCallback((index, set, savedSet) => {
    setSetIndex(index);
    setRound(restoreSetRound(set, savedSet));
    setSelectedLeft(null);
    setSelectedRight(null);
    setCompletedIds(new Set(savedSet?.completedIds ?? []));
    setRevealPairId(null);
    setRevealDefinitions([]);
    setRevealLoading(false);
    setShake(false);
    setSetComplete(savedSet?.setComplete === true);
    patchReadingVocabSetIndex(index);
  }, []);

  const loadSet = useCallback(
    (index) => {
      const safeIndex = Math.max(0, Math.min(index, sets.length - 1));
      const set = sets[safeIndex];
      const savedSet = getSavedSetProgress(set.id);
      applySetState(safeIndex, set, savedSet);
    },
    [applySetState, sets]
  );

  const getDefinitionsForWord = useCallback(
    async (word) => resolveReadingVocabDefinitions(word, wordBankMap),
    [wordBankMap]
  );

  const revealMatch = useCallback(
    async (pairId) => {
      const pair = findPairById(round, pairId);
      if (!pair) return;

      setSelectedLeft(null);
      setSelectedRight(null);
      setRevealPairId(pairId);
      setRevealDefinitions([]);
      setRevealLoading(true);
      speakWord(pair.word);
      notifyAnswerResult(true);

      const definitions = await getDefinitionsForWord(pair.word);
      setRevealDefinitions(definitions);
      setRevealLoading(false);
    },
    [getDefinitionsForWord, notifyAnswerResult, round, speakWord]
  );

  const handleWrongMatch = useCallback(() => {
    setShake(true);
    setSelectedLeft(null);
    setSelectedRight(null);
    notifyAnswerResult(false);
    window.setTimeout(() => setShake(false), 450);
  }, [notifyAnswerResult]);

  const tryMatch = useCallback(
    (leftId, rightId) => {
      if (leftId === rightId) {
        revealMatch(leftId);
        return;
      }
      handleWrongMatch();
    },
    [handleWrongMatch, revealMatch]
  );

  const handleLeftClick = useCallback(
    (id) => {
      if (revealPairId || completedIds.has(id)) return;
      if (selectedLeft === id) {
        setSelectedLeft(null);
        return;
      }
      const nextLeft = id;
      setSelectedLeft(nextLeft);
      if (selectedRight) tryMatch(nextLeft, selectedRight);
    },
    [completedIds, revealPairId, selectedLeft, selectedRight, tryMatch]
  );

  const handleRightClick = useCallback(
    (id) => {
      if (revealPairId || completedIds.has(id)) return;
      if (selectedRight === id) {
        setSelectedRight(null);
        return;
      }
      const nextRight = id;
      setSelectedRight(nextRight);
      if (selectedLeft) tryMatch(selectedLeft, nextRight);
    },
    [completedIds, revealPairId, selectedLeft, selectedRight, tryMatch]
  );

  const dismissReveal = useCallback(() => {
    if (!revealPairId) return;

    const nextDone = doneCount + 1;
    setCompletedIds((prev) => new Set(prev).add(revealPairId));
    setRevealPairId(null);
    setRevealDefinitions([]);
    setRevealLoading(false);

    if (nextDone >= totalPairs) {
      setSetComplete(true);
    }
  }, [doneCount, revealPairId, totalPairs]);

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
            disabled={setIndex <= 0 || Boolean(revealPairId)}
            onClick={() => loadSet(setIndex - 1)}
          >
            上一组
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={setIndex >= sets.length - 1 || Boolean(revealPairId)}
            onClick={() => loadSet(setIndex + 1)}
          >
            下一组
          </button>
        </div>
      </header>

      <p className="rvocab__instructions">
        点击左侧单词与右侧近义词配对；每成功匹配一对，会显示该单词的中文意思。
      </p>

      <div className={`rvocab__board ${shake ? "rvocab__board--shake" : ""}`}>
        <div className="rvocab__column">
          <span className="rvocab__column-label">单词</span>
          {round.leftItems.map((item) => {
            const isDone = completedIds.has(item.id);
            const isSelected = selectedLeft === item.id;
            const isRevealing = revealPairId === item.id;
            return (
              <button
                key={`left-${item.id}`}
                type="button"
                className={[
                  "rvocab__item",
                  "rvocab__item--left",
                  isSelected && "rvocab__item--selected",
                  isDone && "rvocab__item--done",
                  isRevealing && "rvocab__item--pending",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={Boolean(revealPairId) || isDone || setComplete}
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
            const isSelected = selectedRight === item.id;
            const isRevealing = revealPairId === item.id;
            return (
              <button
                key={`right-${item.id}`}
                type="button"
                className={[
                  "rvocab__item",
                  "rvocab__item--right",
                  isSelected && "rvocab__item--selected",
                  isDone && "rvocab__item--done",
                  isRevealing && "rvocab__item--pending",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={Boolean(revealPairId) || isDone || setComplete}
                onClick={() => handleRightClick(item.id)}
              >
                {item.text}
              </button>
            );
          })}
        </div>
      </div>

      {revealPair && !setComplete && (
        <RevealPanel
          pair={revealPair}
          definitions={revealDefinitions}
          loading={revealLoading}
          onContinue={dismissReveal}
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
