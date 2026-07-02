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
import { syncService, SYNC_APPLIED_EVENT, SYNC_STATUS_EVENT } from "./services/syncService";
import { useMicrophone } from "./hooks/useMicrophone";
import { useSettings } from "./context/SettingsContext";
import { fetchWordList, fetchWordListManifest, fetchWordListIndex } from "./services/wordlist";
import {
  loadRecognized,
  loadUnrecognized,
  saveRecognized,
  saveUnrecognized,
  loadProgress,
  saveProgress,
  getSavedIndex,
  patchListProgress,
  loadBookPractices,
  loadBookPracticePaused,
  buildWordRecord,
  buildRecognizedRecord,
  upsertWord,
  removeWord,
  shuffleArray,
  sortByWrongCount,
} from "./services/storage";
import { inferSourceListId } from "./utils/wordListGrouping";
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
  const [wordListIndex, setWordListIndex] = useState(null);
  const wordListIndexRef = useRef(null);
  wordListIndexRef.current = wordListIndex;
  const [activeListId, setActiveListId] = useState(savedRef.current.activeListId);
  const [listProgress, setListProgress] = useState(savedRef.current.listProgress);
  const [wordsLoading, setWordsLoading] = useState(true);
  const [wordsError, setWordsError] = useState(null);
  const [listIndex, setListIndex] = useState(0);
  const [bookPractices, setBookPractices] = useState(() => loadBookPractices(savedRef.current));
  const [bookPracticePaused, setBookPracticePaused] = useState(() =>
    loadBookPracticePaused(savedRef.current, loadBookPractices(savedRef.current))
  );
  const [reviewShuffle, setReviewShuffle] = useState(savedRef.current.reviewShuffle ?? false);
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

  const reloadFromSync = useCallback(() => {
    const progress = loadProgress();
    savedRef.current = progress;
    setRecognized(loadRecognized());
    setUnrecognized(loadUnrecognized());
    setListProgress(progress.listProgress || {});
    const practices = loadBookPractices(progress);
    setBookPractices(practices);
    setBookPracticePaused(loadBookPracticePaused(progress, practices));
    if (progress.activeTab) setActiveTab(progress.activeTab);
    setReviewShuffle(progress.reviewShuffle ?? false);
    setStreakData(refreshStreak());
    if (activeListId) {
      setListIndex(getSavedIndex(progress.listProgress, activeListId));
    }
  }, [activeListId]);

  useEffect(() => {
    const cleanupFocus = syncService.start();
    const onApplied = () => reloadFromSync();
    window.addEventListener(SYNC_APPLIED_EVENT, onApplied);
    return () => {
      window.removeEventListener(SYNC_APPLIED_EVENT, onApplied);
      cleanupFocus?.();
      syncService.stop();
    };
  }, [reloadFromSync]);

  useEffect(() => {
    if (wordsLoading) return;
    syncService.markDirty();
  }, [recognized, unrecognized, listProgress, bookPractices, bookPracticePaused, streakData, wordsLoading]);

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
        const [manifest, index] = await Promise.all([
          fetchWordListManifest(),
          fetchWordListIndex(),
        ]);
        if (cancelled) return;

        setAvailableLists(manifest.lists ?? []);
        setWordListIndex(index);

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
      bookPractices,
      bookPracticePaused,
    });
  }, [activeListId, activeTab, reviewShuffle, listProgress, bookPractices, bookPracticePaused, wordsLoading]);

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
          bookPractices,
          bookPracticePaused,
        });
      } catch (err) {
        setWordsError(err.message || "词库切换失败");
      }
    },
    [activeListId, activeTab, applyList, bookPracticePaused, bookPractices, listIndex, listProgress, reviewShuffle]
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
          bookPractices,
          bookPracticePaused,
        });
        return next;
      });
    },
    [activeListId, bookPracticePaused, bookPractices, listIndex, reviewShuffle]
  );

  const listWord = useMemo(() => {
    const item = wordList[listIndex];
    if (!item) return null;
    return activeListId ? { ...item, sourceListId: activeListId } : item;
  }, [wordList, listIndex, activeListId]);
  const unrecognizedSession = bookPractices.unrecognized;
  const recognizedSession = bookPractices.recognized;
  const unrecognizedWord = unrecognizedSession?.queue[unrecognizedSession.index] ?? null;
  const recognizedWord = recognizedSession?.queue[recognizedSession.index] ?? null;

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
      const bookListId = inferSourceListId(wordData, wordListIndexRef.current);
      if (aiResult.is_correct) {
        setUnrecognized((prevUnrec) => {
          const wrongEntry = prevUnrec.find((item) => item.word === wordData.word);
          const priorWrongCount = wrongEntry?.wrongCount;

          setRecognized((prevRec) => {
            const existingRec = prevRec.find((item) => item.word === wordData.word);
            const carryWrong =
              priorWrongCount ??
              (existingRec?.wrongCount && existingRec.wrongCount > 0 ? existingRec.wrongCount : undefined);
            const record = buildRecognizedRecord(
              {
                ...wordData,
                sourceListId:
                  wordData.sourceListId ??
                  wrongEntry?.sourceListId ??
                  existingRec?.sourceListId ??
                  bookListId,
              },
              aiResult,
              carryWrong
            );
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
            sourceListId: record.sourceListId ?? existing?.sourceListId ?? wordData.sourceListId ?? bookListId,
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

  const handleBookPrev = useCallback((bookType) => {
    setBookPractices((prev) => {
      const session = prev[bookType];
      if (!session || session.index <= 0) return prev;
      return { ...prev, [bookType]: { ...session, index: session.index - 1 } };
    });
  }, []);

  const recognizedPastWrong = useMemo(
    () => recognized.filter((item) => (item.wrongCount ?? 0) >= 1),
    [recognized]
  );

  const toggleReviewShuffle = useCallback(() => {
    setReviewShuffle((prev) => {
      const next = !prev;
      saveProgress({
        activeListId,
        activeTab,
        reviewShuffle: next,
        listProgress,
        bookPractices,
        bookPracticePaused,
      });
      return next;
    });
  }, [activeListId, activeTab, bookPracticePaused, bookPractices, listProgress]);

  const startReview = useCallback(() => {
    if (unrecognized.length === 0) return;

    setBookPracticePaused((p) => ({ ...p, unrecognized: false }));
    setBookPractices((prev) => {
      if (prev.unrecognized) return prev;

      const reviewWords = (reviewShuffle ? shuffleArray : sortByWrongCount)(unrecognized).map((item) => ({
        word: item.word,
        definitions: item.definitions,
        ...(item.sourceListId ? { sourceListId: item.sourceListId } : {}),
      }));

      return { ...prev, unrecognized: { queue: reviewWords, index: 0 } };
    });
  }, [reviewShuffle, unrecognized]);

  const startRecognizedReview = useCallback(() => {
    if (recognizedPastWrong.length === 0) return;

    setBookPracticePaused((p) => ({ ...p, recognized: false }));
    setBookPractices((prev) => {
      if (prev.recognized) return prev;

      const reviewWords = (reviewShuffle ? shuffleArray : sortByWrongCount)(recognizedPastWrong).map(
        (item) => ({
          word: item.word,
          definitions: item.definitions,
          ...(item.sourceListId ? { sourceListId: item.sourceListId } : {}),
        })
      );

      return { ...prev, recognized: { queue: reviewWords, index: 0 } };
    });
  }, [recognizedPastWrong, reviewShuffle]);

  const pauseUnrecognizedPractice = useCallback(() => {
    setBookPracticePaused((p) => ({ ...p, unrecognized: true }));
  }, []);

  const pauseRecognizedPractice = useCallback(() => {
    setBookPracticePaused((p) => ({ ...p, recognized: true }));
  }, []);

  const resumeUnrecognizedPractice = useCallback(() => {
    if (!bookPractices.unrecognized) {
      startReview();
      return;
    }
    setBookPracticePaused((p) => ({ ...p, unrecognized: false }));
  }, [bookPractices.unrecognized, startReview]);

  const resumeRecognizedPractice = useCallback(() => {
    if (!bookPractices.recognized) {
      startRecognizedReview();
      return;
    }
    setBookPracticePaused((p) => ({ ...p, recognized: false }));
  }, [bookPractices.recognized, startRecognizedReview]);

  const handleBookNext = useCallback((bookType) => {
    setBookPractices((prev) => {
      const session = prev[bookType];
      if (!session) return prev;
      if (session.index < session.queue.length - 1) {
        return { ...prev, [bookType]: { ...session, index: session.index + 1 } };
      }
      setBookPracticePaused((p) => ({ ...p, [bookType]: false }));
      return { ...prev, [bookType]: null };
    });
  }, []);

  const unrecognizedPracticeActive =
    Boolean(unrecognizedSession) && !bookPracticePaused.unrecognized;
  const recognizedPracticeActive =
    Boolean(recognizedSession) && !bookPracticePaused.recognized;

  const assistantWord =
    activeTab === "practice"
      ? listWord
      : activeTab === "unrecognized" && unrecognizedPracticeActive
        ? unrecognizedWord
        : activeTab === "recognized" && recognizedPracticeActive
          ? recognizedWord
          : null;

  const unrecognizedPracticeTitle = reviewShuffle
    ? "针对性强化练习 · 乱序"
    : "针对性强化练习";

  const recognizedPracticeTitle = reviewShuffle ? "曾错题巩固 · 乱序" : "曾错题巩固";

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
              title={unrecognizedPracticeTitle}
              toolbarExtra={
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={pauseUnrecognizedPractice}
                >
                  返回列表
                </button>
              }
              queueLength={unrecognizedSession.queue.length}
              currentIndex={unrecognizedSession.index}
              currentWord={unrecognizedWord}
              wordStats={getWordStats(unrecognizedWord)}
              micGranted={mic.isGranted}
              onResult={handleUnrecognizedBookResult}
              onMemoryTrickGenerated={handleMemoryTrickGenerated}
              onNext={() => handleBookNext("unrecognized")}
              onPrev={() => handleBookPrev("unrecognized")}
              sessionKey={`unrec-${unrecognizedWord?.word ?? "empty"}-${unrecognizedSession.index}`}
              emptyMessage="本轮强化练习已完成！"
            />
          ) : (
          <WordList
            title="不认识的词"
            subtitle={
              reviewShuffle
                ? `${unrecognized.length} 个 · 按 Level · List 分组 · 乱序仅影响练习`
                : `${unrecognized.length} 个 · 按 Level · List 分组 · 按错误次数排序`
            }
            words={sortByWrongCount(unrecognized)}
            emptyText="太棒了！目前没有生词，继续保持。"
            showWrongCount
            groupByList
            availableLists={availableLists}
            wordListIndex={wordListIndex}
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
                  <button type="button" className="btn btn--accent" onClick={resumeUnrecognizedPractice}>
                    {unrecognizedSession && bookPracticePaused.unrecognized
                      ? `继续强化练习（${unrecognizedSession.index + 1}/${unrecognizedSession.queue.length}）`
                      : "针对性强化练习"}
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
              title={recognizedPracticeTitle}
              toolbarExtra={
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={pauseRecognizedPractice}
                >
                  返回列表
                </button>
              }
              queueLength={recognizedSession.queue.length}
              currentIndex={recognizedSession.index}
              currentWord={recognizedWord}
              wordStats={getWordStats(recognizedWord)}
              micGranted={mic.isGranted}
              onResult={handleRecognizedBookResult}
              onMemoryTrickGenerated={handleMemoryTrickGenerated}
              onNext={() => handleBookNext("recognized")}
              onPrev={() => handleBookPrev("recognized")}
              sessionKey={`rec-${recognizedWord?.word ?? "empty"}-${recognizedSession.index}`}
              emptyMessage="本轮巩固练习已完成！"
            />
          ) : (
          <WordList
            title="已认识的词"
            subtitle={
              recognizedPastWrong.length > 0
                ? `${recognized.length} 个 · 按 Level · List 分组 · 曾错 ${recognizedPastWrong.length} 个可巩固`
                : `${recognized.length} 个 · 按 Level · List 分组 · 本地保存`
            }
            words={recognized}
            emptyText="还没有熟词，去卡片练习场开始吧！"
            onRemoveWord={handleRemoveRecognized}
            onClearAll={handleClearRecognized}
            clearLabel="清空熟词本"
            showWrongCount
            wrongCountPast
            withToolbar
            groupByList
            availableLists={availableLists}
            wordListIndex={wordListIndex}
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
                    <button type="button" className="btn btn--accent" onClick={resumeRecognizedPractice}>
                      {recognizedSession && bookPracticePaused.recognized
                        ? `继续巩固（${recognizedSession.index + 1}/${recognizedSession.queue.length}）`
                        : `开始巩固（${recognizedPastWrong.length}）`}
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
        currentWord={assistantWord}
        micGranted={mic.isGranted}
      />

      <MottoFooter />
      </div>

      <SettingsPanel />
    </div>
  );
}
