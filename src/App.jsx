import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Navbar from "./components/Navbar";
import FlashCard from "./components/FlashCard";
import WordList from "./components/WordList";
import MicPermissionPrompt from "./components/MicPermissionPrompt";
import SettingsPanel from "./components/SettingsPanel";
import VocabAssistant from "./components/VocabAssistant";
import StreakPanel from "./components/StreakPanel";
import VocabLoadingScreen from "./components/VocabLoadingScreen";
import MottoFooter from "./components/MottoFooter";
import { recordVisit, refreshStreak } from "./services/streak";
import { useMicrophone } from "./hooks/useMicrophone";
import { useSettings } from "./context/SettingsContext";
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
  const { settingsOpen } = useSettings();
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
  const [isRecognizedReviewMode, setIsRecognizedReviewMode] = useState(
    savedRef.current.isRecognizedReviewMode ?? false
  );
  const inReviewMode = isReviewMode || isRecognizedReviewMode;
  const [reviewShuffle, setReviewShuffle] = useState(savedRef.current.reviewShuffle ?? false);
  const [shuffleSeed, setShuffleSeed] = useState(() => Date.now());
  const [streakData, setStreakData] = useState(() => recordVisit());
  const [streakOpen, setStreakOpen] = useState(false);

  useEffect(() => {
    function syncStreak() {
      setStreakData(recordVisit());
    }

    function handleStorage(event) {
      if (event.key === "toefl666_streak") {
        setStreakData(refreshStreak());
      }
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") syncStreak();
    }

    window.addEventListener("focus", syncStreak);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("focus", syncStreak);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

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

    if (inReviewMode) {
      saveProgress({
        activeListId,
        activeTab,
        isReviewMode,
        isRecognizedReviewMode,
        reviewShuffle,
        listProgress,
      });
      return;
    }

    setListProgress((prev) => {
      if (prev[activeListId]?.currentIndex === currentIndex) {
        saveProgress({
          activeListId,
          activeTab,
          isReviewMode: false,
          isRecognizedReviewMode: false,
          reviewShuffle,
          listProgress: prev,
        });
        return prev;
      }
      const next = patchListProgress(prev, activeListId, currentIndex);
      saveProgress({
        activeListId,
        activeTab,
        isReviewMode: false,
        isRecognizedReviewMode: false,
        reviewShuffle,
        listProgress: next,
      });
      return next;
    });
  }, [
    currentIndex,
    activeListId,
    activeTab,
    inReviewMode,
    isReviewMode,
    isRecognizedReviewMode,
    reviewShuffle,
    wordsLoading,
    listProgress,
  ]);

  const handleListChange = useCallback(
    async (listId) => {
      if (listId === activeListId || inReviewMode) return;

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
          isRecognizedReviewMode: false,
          reviewShuffle,
          listProgress: nextProgress,
        });
      } catch (err) {
        setWordsError(err.message || "词库切换失败");
      }
    },
    [activeListId, activeTab, applyList, currentIndex, inReviewMode, listProgress]
  );

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    saveProgress({
      activeListId,
      activeTab: tab,
      isReviewMode,
      isRecognizedReviewMode,
      reviewShuffle,
      listProgress,
    });
  }, [activeListId, isReviewMode, isRecognizedReviewMode, reviewShuffle, listProgress]);

  const currentWord = practiceQueue[currentIndex] ?? null;

  const currentWordStats = useMemo(() => {
    if (!currentWord) return { wrongCount: 0, memory_trick: null };
    const entry = unrecognized.find((item) => item.word === currentWord.word);
    return {
      wrongCount: entry?.wrongCount ?? 0,
      memory_trick: entry?.memory_trick ?? null,
    };
  }, [currentWord, unrecognized]);

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
            if (wrongEntry?.memory_trick || aiResult.memory_trick) {
              record.memory_trick = wrongEntry?.memory_trick || aiResult.memory_trick;
            }
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
            memory_trick: record.memory_trick ?? existing?.memory_trick,
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
        setPracticeQueue(wordList);
        setActiveTab("unrecognized");
      } else if (isRecognizedReviewMode) {
        setPracticeQueue(wordList);
        setActiveTab("recognized");
      }
      setIsReviewMode(false);
      setIsRecognizedReviewMode(false);
    }
  }, [currentIndex, practiceQueue.length, isReviewMode, isRecognizedReviewMode, wordList]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const displayedUnrecognized = useMemo(() => {
    if (reviewShuffle) return seededShuffle(unrecognized, shuffleSeed);
    return sortByWrongCount(unrecognized);
  }, [unrecognized, reviewShuffle, shuffleSeed]);

  const recognizedPastWrong = useMemo(
    () => recognized.filter((item) => (item.wrongCount ?? 0) >= 1),
    [recognized]
  );

  const toggleReviewShuffle = useCallback(() => {
    setReviewShuffle((prev) => {
      const next = !prev;
      if (next) setShuffleSeed(Date.now());
      saveProgress({
        activeListId,
        activeTab,
        isReviewMode,
        isRecognizedReviewMode,
        reviewShuffle: next,
        listProgress,
      });
      return next;
    });
  }, [activeListId, activeTab, isReviewMode, isRecognizedReviewMode, listProgress]);

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
    setIsRecognizedReviewMode(false);
    setActiveTab("practice");
    saveProgress({
      activeListId,
      activeTab: "practice",
      isReviewMode: true,
      isRecognizedReviewMode: false,
      reviewShuffle,
      listProgress,
    });
  }, [activeListId, listProgress, reviewShuffle, unrecognized]);

  const startRecognizedReview = useCallback(() => {
    if (recognizedPastWrong.length === 0) return;

    const reviewWords = (reviewShuffle ? shuffleArray : sortByWrongCount)(recognizedPastWrong).map((item) => ({
      word: item.word,
      definitions: item.definitions,
    }));

    setPracticeQueue(reviewWords);
    setCurrentIndex(0);
    setIsRecognizedReviewMode(true);
    setIsReviewMode(false);
    setActiveTab("practice");
    saveProgress({
      activeListId,
      activeTab: "practice",
      isReviewMode: false,
      isRecognizedReviewMode: true,
      reviewShuffle,
      listProgress,
    });
  }, [activeListId, listProgress, recognizedPastWrong, reviewShuffle]);

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
        <VocabLoadingScreen />
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
      <div className="app-shell" inert={settingsOpen ? "" : undefined}>
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
                  {isRecognizedReviewMode
                    ? reviewShuffle
                      ? "熟词巩固 · 曾错题 · 乱序"
                      : "熟词巩固 · 曾错题"
                    : isReviewMode
                    ? reviewShuffle
                      ? "强化练习 · 乱序"
                      : "强化练习"
                    : listMeta?.title ?? "单词练习"}
                </span>
                {!inReviewMode && availableLists.length > 0 && (
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
                key={`${currentWord.word}-${currentIndex}-${isReviewMode}-${isRecognizedReviewMode}`}
                wordData={currentWord}
                wordStats={currentWordStats}
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
            subtitle={
              recognizedPastWrong.length > 0
                ? `${recognized.length} 个 · 曾错 ${recognizedPastWrong.length} 个可巩固 · 本地保存`
                : "一次过的词不标注 · 曾错过的词会显示次数 · 本地保存"
            }
            words={recognized}
            emptyText="还没有熟词，去卡片练习场开始吧！"
            onRemoveWord={handleRemoveRecognized}
            onClearAll={handleClearRecognized}
            clearLabel="清空熟词本"
            showWrongCount
            wrongCountPast
            withToolbar
            reviewBar={
              <div className="word-list-review-bar">
                <div className="word-list-review-bar__text">
                  <strong>曾错题巩固</strong>
                  <p>
                    {recognizedPastWrong.length > 0
                      ? `${recognizedPastWrong.length} 个词曾错过、现已掌握，再过一遍防止遗忘`
                      : "暂无曾错题。答错后进熟词本的词会带「曾错 N 次」标记，即可在此巩固"}
                  </p>
                </div>
                {recognizedPastWrong.length > 0 && (
                  <div className="word-list-review-bar__actions">
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
                    <button type="button" className="btn btn--accent" onClick={startRecognizedReview}>
                      开始巩固（{recognizedPastWrong.length}）
                    </button>
                  </div>
                )}
              </div>
            }
          />
        )}
      </main>

      <VocabAssistant
        currentWord={activeTab === "practice" ? currentWord : null}
        micGranted={mic.isGranted}
      />

      <MottoFooter />
      </div>

      <SettingsPanel />
    </div>
  );
}
