import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Navbar from "./components/Navbar";
import PracticeSession from "./components/PracticeSession";
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
  normalizeBookPractice,
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
  const [listIndex, setListIndex] = useState(0);
  const [bookPractice, setBookPractice] = useState(() =>
    normalizeBookPractice(savedRef.current.bookPractice)
  );
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
    setListIndex(clampIndex(index, words.length));
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
    setListProgress((prev) => {
      if (prev[activeListId]?.currentIndex === listIndex) return prev;
      return patchListProgress(prev, activeListId, listIndex);
    });
  }, [listIndex, activeListId, wordsLoading]);

  useEffect(() => {
    if (wordsLoading) return;
    saveProgress({
      activeListId,
      activeTab,
      reviewShuffle,
      listProgress,
      bookPractice,
    });
  }, [activeListId, activeTab, reviewShuffle, listProgress, bookPractice, wordsLoading]);

  const handleListChange = useCallback(
    async (listId) => {
      if (listId === activeListId) return;

      const nextProgress = patchListProgress(listProgress, activeListId, listIndex);
      setListProgress(nextProgress);

      try {
        const { meta, words } = await fetchWordList(listId);
        const savedIndex = getSavedIndex(nextProgress, listId);
        applyList(listId, words, meta, savedIndex);
        saveProgress({
          activeListId: listId,
          activeTab,
          reviewShuffle,
          listProgress: nextProgress,
          bookPractice,
        });
      } catch (err) {
        setWordsError(err.message || "词库切换失败");
      }
    },
    [activeListId, activeTab, applyList, bookPractice, listIndex, listProgress, reviewShuffle]
  );

  const handleTabChange = useCallback(
    (tab) => {
      setActiveTab(tab);
      setListProgress((prev) => {
        const next = activeListId ? patchListProgress(prev, activeListId, listIndex) : prev;
        saveProgress({
          activeListId,
          activeTab: tab,
          reviewShuffle,
          listProgress: next,
          bookPractice,
        });
        return next;
      });
    },
    [activeListId, bookPractice, listIndex, reviewShuffle]
  );

  const listWord = wordList[listIndex] ?? null;
  const bookWord = bookPractice ? bookPractice.queue[bookPractice.index] ?? null : null;
  const currentWord =
    activeTab === "practice"
      ? listWord
      : bookPractice?.type === activeTab
        ? bookWord
        : null;

  const getWordStats = useCallback(
    (wordData) => {
      if (!wordData) return { wrongCount: 0, memory_trick: null };
      const unrec = unrecognized.find((item) => item.word === wordData.word);
      const rec = recognized.find((item) => item.word === wordData.word);
      const entry = unrec || rec;
      return {
        wrongCount: entry?.wrongCount ?? 0,
        memory_trick: entry?.memory_trick ?? null,
      };
    },
    [unrecognized, recognized]
  );

  const handleMemoryTrickGenerated = useCallback((wordData, memory_trick) => {
    setUnrecognized((prev) => {
      const existing = prev.find((item) => item.word === wordData.word);
      if (!existing || existing.memory_trick) return prev;
      const next = upsertWord(prev, { ...existing, memory_trick });
      saveUnrecognized(next);
      return next;
    });
    setRecognized((prev) => {
      const existing = prev.find((item) => item.word === wordData.word);
      if (!existing || existing.memory_trick) return prev;
      const next = upsertWord(prev, { ...existing, memory_trick });
      saveRecognized(next);
      return next;
    });
  }, []);

  const handleRecognizedMemoryTrick = useCallback((word, memory_trick) => {
    setRecognized((prev) => {
      const existing = prev.find((item) => item.word === word);
      if (!existing || existing.memory_trick) return prev;
      const next = upsertWord(prev, { ...existing, memory_trick });
      saveRecognized(next);
      return next;
    });
  }, []);

  const handleBookResult = useCallback(
    (wordData, aiResult, removeFromUnrecognizedOnCorrect) => {
      if (aiResult.is_correct) {
        setUnrecognized((prevUnrec) => {
          const wrongEntry = prevUnrec.find((item) => item.word === wordData.word);
          const priorWrongCount = wrongEntry?.wrongCount;

          setRecognized((prevRec) => {
            const existingRec = prevRec.find((item) => item.word === wordData.word);
            const carryWrong =
              priorWrongCount ??
              (existingRec?.wrongCount && existingRec.wrongCount > 0 ? existingRec.wrongCount : undefined);
            const record = buildRecognizedRecord(wordData, aiResult, carryWrong);
            if (wrongEntry?.memory_trick || aiResult.memory_trick || existingRec?.memory_trick) {
              record.memory_trick =
                wrongEntry?.memory_trick || aiResult.memory_trick || existingRec?.memory_trick;
            }
            const next = upsertWord(prevRec, record);
            saveRecognized(next);
            return next;
          });

          if (removeFromUnrecognizedOnCorrect) {
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
    []
  );

  const handleListResult = useCallback(
    (wordData, aiResult) => handleBookResult(wordData, aiResult, false),
    [handleBookResult]
  );

  const handleUnrecognizedBookResult = useCallback(
    (wordData, aiResult) => handleBookResult(wordData, aiResult, true),
    [handleBookResult]
  );

  const handleRecognizedBookResult = useCallback(
    (wordData, aiResult) => handleBookResult(wordData, aiResult, false),
    [handleBookResult]
  );

  const handleListNext = useCallback(() => {
    if (listIndex < wordList.length - 1) {
      setListIndex((i) => i + 1);
    } else {
      setListIndex(0);
    }
  }, [listIndex, wordList.length]);

  const handleListPrev = useCallback(() => {
    if (listIndex > 0) {
      setListIndex((i) => i - 1);
    }
  }, [listIndex]);

  const handleBookNext = useCallback(() => {
    setBookPractice((prev) => {
      if (!prev) return null;
      if (prev.index < prev.queue.length - 1) {
        return { ...prev, index: prev.index + 1 };
      }
      return null;
    });
  }, []);

  const handleBookPrev = useCallback(() => {
    setBookPractice((prev) => {
      if (!prev || prev.index <= 0) return prev;
      return { ...prev, index: prev.index - 1 };
    });
  }, []);

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
        reviewShuffle: next,
        listProgress,
        bookPractice,
      });
      return next;
    });
  }, [activeListId, activeTab, bookPractice, listProgress]);

  const reshuffleUnrecognized = useCallback(() => {
    setShuffleSeed(Date.now());
  }, []);

  const startReview = useCallback(() => {
    if (unrecognized.length === 0) return;

    const reviewWords = (reviewShuffle ? shuffleArray : sortByWrongCount)(unrecognized).map((item) => ({
      word: item.word,
      definitions: item.definitions,
    }));

    setBookPractice({ type: "unrecognized", queue: reviewWords, index: 0 });
  }, [reviewShuffle, unrecognized]);

  const startRecognizedReview = useCallback(() => {
    if (recognizedPastWrong.length === 0) return;

    const reviewWords = (reviewShuffle ? shuffleArray : sortByWrongCount)(recognizedPastWrong).map((item) => ({
      word: item.word,
      definitions: item.definitions,
    }));

    setBookPractice({ type: "recognized", queue: reviewWords, index: 0 });
  }, [recognizedPastWrong, reviewShuffle]);

  const stopBookPractice = useCallback(() => {
    setBookPractice(null);
  }, []);

  const unrecognizedPracticeActive = bookPractice?.type === "unrecognized";
  const recognizedPracticeActive = bookPractice?.type === "recognized";

  const bookPracticeTitle = useMemo(() => {
    if (!bookPractice) return "";
    if (bookPractice.type === "unrecognized") {
      return reviewShuffle ? "针对性强化练习 · 乱序" : "针对性强化练习";
    }
    return reviewShuffle ? "曾错题巩固 · 乱序" : "曾错题巩固";
  }, [bookPractice, reviewShuffle]);

  const bookPracticeExitButton = (
    <button type="button" className="btn btn--ghost btn--sm" onClick={stopBookPractice}>
      返回列表
    </button>
  );

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
          <PracticeSession
            title={listMeta?.title ?? "单词练习"}
            toolbarExtra={
              availableLists.length > 0 ? (
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
              ) : null
            }
            stats={
              <>
                <span className="stat-pill stat-pill--ok">认识 {recognized.length}</span>
                <span className="stat-pill stat-pill--fail">不认识 {unrecognized.length}</span>
              </>
            }
            queueLength={wordList.length}
            currentIndex={listIndex}
            currentWord={listWord}
            wordStats={getWordStats(listWord)}
            micGranted={mic.isGranted}
            onResult={handleListResult}
            onMemoryTrickGenerated={handleMemoryTrickGenerated}
            onNext={handleListNext}
            onPrev={handleListPrev}
            sessionKey={`list-${listWord?.word ?? "empty"}-${listIndex}`}
          />
        )}

        {activeTab === "unrecognized" && (
          unrecognizedPracticeActive ? (
            <PracticeSession
              title={bookPracticeTitle}
              toolbarExtra={bookPracticeExitButton}
              queueLength={bookPractice.queue.length}
              currentIndex={bookPractice.index}
              currentWord={bookWord}
              wordStats={getWordStats(bookWord)}
              micGranted={mic.isGranted}
              onResult={handleUnrecognizedBookResult}
              onMemoryTrickGenerated={handleMemoryTrickGenerated}
              onNext={handleBookNext}
              onPrev={handleBookPrev}
              sessionKey={`unrec-${bookWord?.word ?? "empty"}-${bookPractice.index}`}
              emptyMessage="本轮强化练习已完成！"
            />
          ) : (
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
          )
        )}

        {activeTab === "recognized" && (
          recognizedPracticeActive ? (
            <PracticeSession
              title={bookPracticeTitle}
              toolbarExtra={bookPracticeExitButton}
              queueLength={bookPractice.queue.length}
              currentIndex={bookPractice.index}
              currentWord={bookWord}
              wordStats={getWordStats(bookWord)}
              micGranted={mic.isGranted}
              onResult={handleRecognizedBookResult}
              onMemoryTrickGenerated={handleMemoryTrickGenerated}
              onNext={handleBookNext}
              onPrev={handleBookPrev}
              sessionKey={`rec-${bookWord?.word ?? "empty"}-${bookPractice.index}`}
              emptyMessage="本轮巩固练习已完成！"
            />
          ) : (
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
            onMemoryTrickSaved={handleRecognizedMemoryTrick}
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
          )
        )}
      </main>

      <VocabAssistant
        currentWord={currentWord}
        micGranted={mic.isGranted}
      />

      <MottoFooter />
      </div>

      <SettingsPanel />
    </div>
  );
}
