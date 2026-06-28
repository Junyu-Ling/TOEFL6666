import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Navbar from "./components/Navbar";
import FlashCard from "./components/FlashCard";
import WordList from "./components/WordList";
import MicPermissionPrompt from "./components/MicPermissionPrompt";
import SettingsPanel from "./components/SettingsPanel";
import VocabAssistant from "./components/VocabAssistant";
import StreakPanel from "./components/StreakPanel";
import { recordVisit } from "./services/streak";
import { useMicrophone } from "./hooks/useMicrophone";
import { fetchWordList, fetchWordListManifest } from "./services/wordlist";
import {
  loadRecognized,
  loadUnrecognized,
  saveRecognized,
  saveUnrecognized,
  loadProgress,
  saveProgress,
  getSavedIndex,
  patchListProgress,
  buildWordRecord,
  buildRecognizedRecord,
  upsertWord,
  removeWord,
  shuffleArray,
  sortByWrongCount,
  seededShuffle,
} from "./services/storage";
import "./App.css";

function clampIndex(index, length) {
  if (length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}

export default function App() {
  const savedRef = useRef(loadProgress());
  const mic = useMicrophone();
  const [micPromptVisible, setMicPromptVisible] = useState(true);

  const [activeTab, setActiveTab] = useState(savedRef.current.activeTab);
  const [recognized, setRecognized] = useState(loadRecognized);
  const [unrecognized, setUnrecognized] = useState(loadUnrecognized);
  const [wordList, setWordList] = useState([]);
  const [listMeta, setListMeta] = useState(null);
  const [availableLists, setAvailableLists] = useState([]);
  const [activeListId, setActiveListId] = useState(savedRef.current.activeListId);
  const [listProgress, setListProgress] = useState(savedRef.current.listProgress);
  const [wordsLoading, setWordsLoading] = useState(true);
  const [wordsError, setWordsError] = useState(null);
  const [practiceQueue, setPracticeQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [reviewShuffle, setReviewShuffle] = useState(savedRef.current.reviewShuffle ?? false);
  const [shuffleSeed, setShuffleSeed] = useState(() => Date.now());
  const [streakData, setStreakData] = useState(() => recordVisit());
  const [streakOpen, setStreakOpen] = useState(false);

  const applyList = useCallback((listId, words, meta, index) => {
    setListMeta(meta);
    setWordList(words);
    setActiveListId(listId);
    setPracticeQueue(words);
    setCurrentIndex(clampIndex(index, words.length));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCloudWords() {
      setWordsLoading(true);
      setWordsError(null);
      try {
        const manifest = await fetchWordListManifest();
        if (cancelled) return;

        setAvailableLists(manifest.lists ?? []);

        const listId =
          savedRef.current.activeListId ??
          manifest.defaultListId ??
          manifest.lists?.[0]?.id;

        const { meta, words } = await fetchWordList(listId);
        if (cancelled) return;

        const savedIndex = getSavedIndex(savedRef.current.listProgress, listId);
        applyList(listId, words, meta, savedIndex);
      } catch (err) {
        if (!cancelled) setWordsError(err.message || "词库加载失败");
      } finally {
        if (!cancelled) setWordsLoading(false);
      }
    }

    loadCloudWords();
    return () => {
      cancelled = true;
    };
  }, [applyList]);

  useEffect(() => {
    if (wordsLoading || !activeListId) return;

    if (isReviewMode) {
      saveProgress({ activeListId, activeTab, isReviewMode: true, reviewShuffle, listProgress });
      return;
    }

    setListProgress((prev) => {
      if (prev[activeListId]?.currentIndex === currentIndex) {
        saveProgress({ activeListId, activeTab, isReviewMode: false, reviewShuffle, listProgress: prev });
        return prev;
      }
      const next = patchListProgress(prev, activeListId, currentIndex);
      saveProgress({ activeListId, activeTab, isReviewMode: false, reviewShuffle, listProgress: next });
      return next;
    });
  }, [currentIndex, activeListId, activeTab, isReviewMode, reviewShuffle, wordsLoading, listProgress]);

  const handleListChange = useCallback(
    async (listId) => {
      if (listId === activeListId || isReviewMode) return;

      const nextProgress = patchListProgress(listProgress, activeListId, currentIndex);
      setListProgress(nextProgress);

      try {
        const { meta, words } = await fetchWordList(listId);
        const savedIndex = getSavedIndex(nextProgress, listId);
        applyList(listId, words, meta, savedIndex);
        saveProgress({
          activeListId: listId,
          activeTab,
          isReviewMode: false,
          reviewShuffle,
          listProgress: nextProgress,
        });
      } catch (err) {
        setWordsError(err.message || "词库切换失败");
      }
    },
    [activeListId, activeTab, applyList, currentIndex, isReviewMode, listProgress]
  );

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    saveProgress({ activeListId, activeTab: tab, isReviewMode, reviewShuffle, listProgress });
  }, [activeListId, isReviewMode, reviewShuffle, listProgress]);

  const currentWord = practiceQueue[currentIndex] ?? null;

  const handleResult = useCallback(
    (wordData, aiResult) => {
      if (aiResult.is_correct) {
        setUnrecognized((prevUnrec) => {
          const wrongEntry = prevUnrec.find((item) => item.word === wordData.word);
          const priorWrongCount = wrongEntry?.wrongCount;

          setRecognized((prevRec) => {
            const existingRec = prevRec.find((item) => item.word === wordData.word);
            const carryWrong =
              priorWrongCount ?? (existingRec?.wrongCount && existingRec.wrongCount > 0 ? existingRec.wrongCount : undefined);
            const record = buildRecognizedRecord(wordData, aiResult, carryWrong);
            const next = upsertWord(prevRec, record);
            saveRecognized(next);
            return next;
          });

          if (isReviewMode) {
            const next = removeWord(prevUnrec, wordData.word);
            saveUnrecognized(next);
            return next;
          }
          return prevUnrec;
        });
      } else {
        const record = buildWordRecord(wordData, aiResult);
        setUnrecognized((prev) => {
          const existing = prev.find((item) => item.word === wordData.word);
          const wrongRecord = {
            ...record,
            wrongCount: (existing?.wrongCount ?? 0) + 1,
          };
          const next = upsertWord(prev, wrongRecord);
          saveUnrecognized(next);
          return next;
        });
        setRecognized((prev) => {
          const next = removeWord(prev, wordData.word);
          saveRecognized(next);
          return next;
        });
      }
    },
    [isReviewMode]
  );

  const handleNext = useCallback(() => {
    if (currentIndex < practiceQueue.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setCurrentIndex(0);
      if (isReviewMode) {
        setIsReviewMode(false);
        setPracticeQueue(wordList);
        setActiveTab("unrecognized");
      }
    }
  }, [currentIndex, practiceQueue.length, isReviewMode, wordList]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const displayedUnrecognized = useMemo(() => {
    if (reviewShuffle) return seededShuffle(unrecognized, shuffleSeed);
    return sortByWrongCount(unrecognized);
  }, [unrecognized, reviewShuffle, shuffleSeed]);

  const toggleReviewShuffle = useCallback(() => {
    setReviewShuffle((prev) => {
      const next = !prev;
      if (next) setShuffleSeed(Date.now());
      saveProgress({ activeListId, activeTab, isReviewMode, reviewShuffle: next, listProgress });
      return next;
    });
  }, [activeListId, activeTab, isReviewMode, listProgress]);

  const reshuffleUnrecognized = useCallback(() => {
    setShuffleSeed(Date.now());
  }, []);

  const startReview = useCallback(() => {
    if (unrecognized.length === 0) return;

    const reviewWords = (reviewShuffle ? shuffleArray : sortByWrongCount)(unrecognized).map((item) => ({
      word: item.word,
      definitions: item.definitions,
    }));

    setPracticeQueue(reviewWords);
    setCurrentIndex(0);
    setIsReviewMode(true);
    setActiveTab("practice");
    saveProgress({ activeListId, activeTab: "practice", isReviewMode: true, reviewShuffle, listProgress });
  }, [activeListId, listProgress, reviewShuffle, unrecognized]);

  const handleRemoveRecognized = useCallback((word) => {
    setRecognized((prev) => {
      const next = removeWord(prev, word);
      saveRecognized(next);
      return next;
    });
  }, []);

  const handleClearRecognized = useCallback(() => {
    if (recognized.length === 0) return;
    if (!window.confirm(`确定清空熟词本中的 ${recognized.length} 个单词吗？`)) return;
    setRecognized([]);
    saveRecognized([]);
  }, [recognized.length]);

  const progress = useMemo(() => {
    if (!practiceQueue.length) return 0;
    return Math.round(((currentIndex + 1) / practiceQueue.length) * 100);
  }, [currentIndex, practiceQueue.length]);

  const listsByLevel = useMemo(() => {
    const map = new Map();
    for (const item of availableLists) {
      const level = item.level ?? 0;
      if (!map.has(level)) map.set(level, []);
      map.get(level).push(item);
    }
    for (const lists of map.values()) {
      lists.sort((a, b) => a.list - b.list);
    }
    return map;
  }, [availableLists]);

  const levelNumbers = useMemo(
    () => [...listsByLevel.keys()].sort((a, b) => a - b),
    [listsByLevel]
  );

  const activeLevel = useMemo(() => {
    const current = availableLists.find((item) => item.id === activeListId);
    return current?.level ?? levelNumbers[0] ?? null;
  }, [availableLists, activeListId, levelNumbers]);

  const listsInActiveLevel = useMemo(
    () => (activeLevel != null ? listsByLevel.get(activeLevel) ?? [] : []),
    [listsByLevel, activeLevel]
  );

  const handleLevelChange = useCallback(
    (levelValue) => {
      const level = Number(levelValue);
      const lists = listsByLevel.get(level);
      if (!lists?.length) return;

      const current = availableLists.find((item) => item.id === activeListId);
      const preferred = lists.find((item) => item.list === current?.list);
      handleListChange(preferred?.id ?? lists[0].id);
    },
    [activeListId, availableLists, handleListChange, listsByLevel]
  );

  if (wordsLoading) {
    return (
      <div className="app app--loading">
        <div className="loading-screen">
          <span className="spinner spinner--lg" />
          <p>正在从云端加载词库…</p>
        </div>
      </div>
    );
  }

  if (wordsError) {
    return (
      <div className="app app--loading">
        <div className="loading-screen loading-screen--error">
          <span className="empty-icon">⚠️</span>
          <p>{wordsError}</p>
          <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Navbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        counts={{ recognized: recognized.length, unrecognized: unrecognized.length }}
        streak={streakData}
        onStreakClick={() => {
          setStreakData(recordVisit());
          setStreakOpen(true);
        }}
      />

      {micPromptVisible && (
        <MicPermissionPrompt mic={mic} onDismiss={() => setMicPromptVisible(false)} />
      )}

      <SettingsPanel />

      <StreakPanel
        open={streakOpen}
        onClose={() => setStreakOpen(false)}
        streak={streakData}
        onStreakChange={setStreakData}
      />

      <main className="main">
        {activeTab === "practice" && (
          <section className="practice-view">
            <div className="practice-toolbar">
              <div className="practice-toolbar__left">
                <span className="practice-toolbar__title">
                  {isReviewMode
                    ? reviewShuffle
                      ? "强化练习 · 乱序"
                      : "强化练习"
                    : listMeta?.title ?? "单词练习"}
                </span>
                {!isReviewMode && availableLists.length > 0 && (
                  <div className="practice-toolbar__pickers">
                    {levelNumbers.length > 1 && (
                      <select
                        className="practice-toolbar__select"
                        value={activeLevel ?? ""}
                        onChange={(e) => handleLevelChange(e.target.value)}
                        aria-label="选择 Level"
                      >
                        {levelNumbers.map((level) => (
                          <option key={level} value={level}>
                            Level {level}
                          </option>
                        ))}
                      </select>
                    )}
                    {listsInActiveLevel.length > 1 && (
                      <select
                        className="practice-toolbar__select"
                        value={activeListId ?? ""}
                        onChange={(e) => handleListChange(e.target.value)}
                        aria-label="选择 List"
                      >
                        {listsInActiveLevel.map((item) => (
                          <option key={item.id} value={item.id}>
                            List {item.list}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
              <div className="practice-toolbar__stats">
                <span className="stat-pill stat-pill--ok">认识 {recognized.length}</span>
                <span className="stat-pill stat-pill--fail">不认识 {unrecognized.length}</span>
              </div>
            </div>

            <div className="progress-track" aria-label="学习进度">
              <div className="progress-track__fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="progress-label">
              {currentIndex + 1} / {practiceQueue.length}
            </p>

            {currentWord ? (
              <FlashCard
                key={`${currentWord.word}-${currentIndex}-${isReviewMode}`}
                wordData={currentWord}
                micGranted={mic.isGranted}
                onResult={handleResult}
                onNext={handleNext}
                onPrev={handlePrev}
              />
            ) : (
              <div className="word-list-view__empty">
                <span className="empty-icon">🎉</span>
                <p>本轮练习已完成！</p>
              </div>
            )}
          </section>
        )}

        {activeTab === "unrecognized" && (
          <WordList
            title="不认识的词"
            subtitle={
              reviewShuffle
                ? `${unrecognized.length} 个 · 乱序显示 · 按错误次数排序可关闭打乱`
                : `${unrecognized.length} 个 · 按错误次数排序 · 本地保存`
            }
            words={displayedUnrecognized}
            emptyText="太棒了！目前没有生词，继续保持。"
            showWrongCount
            headerAction={
              unrecognized.length > 0 ? (
                <>
                  <button
                    type="button"
                    className={`btn btn--ghost btn--sm ${reviewShuffle ? "btn--toggle-on" : ""}`}
                    onClick={toggleReviewShuffle}
                    aria-pressed={reviewShuffle}
                  >
                    {reviewShuffle ? "乱序" : "顺序"}
                  </button>
                  {reviewShuffle && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={reshuffleUnrecognized}
                      title="重新打乱"
                    >
                      重新打乱
                    </button>
                  )}
                  <button type="button" className="btn btn--accent" onClick={startReview}>
                    针对性强化练习
                  </button>
                </>
              ) : null
            }
          />
        )}

        {activeTab === "recognized" && (
          <WordList
            title="已认识的词"
            subtitle={`${recognized.length} 个 · 一次过的词不标注 · 曾错过的词会显示次数`}
            words={recognized}
            emptyText="还没有熟词，去卡片练习场开始吧！"
            onRemoveWord={handleRemoveRecognized}
            onClearAll={handleClearRecognized}
            clearLabel="清空熟词本"
            showWrongCount
            wrongCountPast
          />
        )}
      </main>

      <VocabAssistant
        currentWord={activeTab === "practice" ? currentWord : null}
        micGranted={mic.isGranted}
      />
    </div>
  );
}
