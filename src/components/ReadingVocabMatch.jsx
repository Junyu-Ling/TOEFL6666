import { useCallback, useMemo, useRef, useState } from "react";
import { useSettings } from "../context/SettingsContext";
import { lookupWordDefinitions } from "../services/wordLookup";
import { buildWordBankMap } from "../utils/homophoneBank";
import { playAnswerSound } from "../utils/answerSounds";
import {
  buildFullRound,
  findPairById,
  getReadingVocabTitle,
  resolveWordData,
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
            {definitions.map((definition) => (
              <li key={definition}>{definition}</li>
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

export default function ReadingVocabMatch({ words }) {
  const { settings, speakWord } = useSettings();
  const wordBankMap = useMemo(() => buildWordBankMap(words), [words]);
  const definitionCacheRef = useRef(new Map());

  const [round] = useState(() => buildFullRound());
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
  const [completedIds, setCompletedIds] = useState(() => new Set());
  const [revealPairId, setRevealPairId] = useState(null);
  const [revealDefinitions, setRevealDefinitions] = useState([]);
  const [revealLoading, setRevealLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [allComplete, setAllComplete] = useState(false);

  const revealPair = revealPairId ? findPairById(round, revealPairId) : null;
  const totalPairs = round.pairs.length;
  const doneCount = completedIds.size;

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
      setAllComplete(true);
    }
  }, [doneCount, revealPairId, totalPairs]);

  if (!round.pairs.length) {
    return <div className="rvocab__empty">暂无阅读词汇题数据</div>;
  }

  return (
    <div className="rvocab">
      <header className="rvocab__header">
        <div>
          <h2 className="rvocab__title">{getReadingVocabTitle()}</h2>
          <p className="rvocab__subtitle">进度 {doneCount}/{totalPairs}</p>
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
                disabled={Boolean(revealPairId) || isDone}
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
                disabled={Boolean(revealPairId) || isDone}
                onClick={() => handleRightClick(item.id)}
              >
                {item.text}
              </button>
            );
          })}
        </div>
      </div>

      {revealPair && !allComplete && (
        <RevealPanel
          pair={revealPair}
          definitions={revealDefinitions}
          loading={revealLoading}
          onContinue={dismissReveal}
        />
      )}

      {allComplete && (
        <div className="rvocab__complete">
          <p className="rvocab__complete-all">全部 {totalPairs} 题已完成 🎉</p>
        </div>
      )}
    </div>
  );
}
