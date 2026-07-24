import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Navbar from "./components/Navbar";
import PracticeSession from "./components/PracticeSession";
import WordList from "./components/WordList";
import MicPermissionPrompt from "./components/MicPermissionPrompt";
import SettingsPanel from "./components/SettingsPanel";
import VocabAssistant from "./components/VocabAssistant";
import StreakPanel from "./components/StreakPanel";
import VocabLoadingScreen from "./components/VocabLoadingScreen";
import ExamModeTransition from "./components/ExamModeTransition";
import BookReviewScopeBar from "./components/BookReviewScopeBar";
import VocabularyBank from "./components/VocabularyBank";
import LexGridGame from "./components/LexGridGame";
import ReadingVocabMatch from "./components/ReadingVocabMatch";
import ReadingFillBlank from "./components/ReadingFillBlank";
import TabPanel from "./components/TabPanel";
import MottoFooter from "./components/MottoFooter";
import { recordVisit, refreshStreak } from "./services/streak";
import { syncService, SYNC_APPLIED_EVENT, SYNC_STATUS_EVENT } from "./services/syncService";
import { useMicrophone } from "./hooks/useMicrophone";
import { useSettings } from "./context/SettingsContext";
import { ActiveTabProvider } from "./context/ActiveTabContext";
import { fetchWordList, fetchWordListManifest, fetchWordListIndex, fetchWordBank, resolveActiveListId } from "./services/wordlist";
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
  appendToBookQueue,
  shuffleArray,
  sortByWrongCount,
  setStorageAppMode,
} from "./services/storage";
import { normalizeAppMode, normalizeActiveTabForMode } from "./utils/appMode";
import {
  UNCategorized_LIST_ID,
  inferSourceListId,
  countWordsByListId,
  countPastWrongByListId,
  countWordsInListIds,
  filterWordsByListIds,
  filterPastWrongByListIds,
  getListReviewScopeLabel,
  getSessionListIds,
  matchesBookPracticeListId,
  sameListIdSet,
} from "./utils/wordListGrouping";
import { buildWordBankMap } from "./utils/homophoneBank";
import "./App.css";

function clampIndex(index, length) {
  if (length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}

export default function App() {
  const { settingsOpen, settings, setAppMode } = useSettings();
  const appMode = normalizeAppMode(settings.appMode);
  const savedRef = useRef(loadProgress(appMode));
  const mic = useMicrophone();
  const [micPromptVisible, setMicPromptVisible] = useState(true);

  useEffect(() => {
    setStorageAppMode(appMode);
  }, [appMode]);

  const [activeTab, setActiveTab] = useState(() =>
    normalizeActiveTabForMode(savedRef.current.activeTab, appMode)
  );

  useEffect(() => {
    setActiveTab((tab) => normalizeActiveTabForMode(tab, appMode));
  }, [appMode]);

  const [recognized, setRecognized] = useState(() => loadRecognized(appMode));
  const [unrecognized, setUnrecognized] = useState(() => loadUnrecognized(appMode));
  const [wordList, setWordList] = useState([]);
  const [allBankWords, setAllBankWords] = useState([]);
  const [listMeta, setListMeta] = useState(null);
  const [availableLists, setAvailableLists] = useState([]);
  const [wordListIndex, setWordListIndex] = useState(null);
  const wordListIndexRef = useRef(null);
  wordListIndexRef.current = wordListIndex;
  const wordlistVersionRef = useRef(null);
  const [activeListId, setActiveListId] = useState(savedRef.current.activeListId);
  const [listProgress, setListProgress] = useState(savedRef.current.listProgress);
  const [wordsLoading, setWordsLoading] = useState(true);
  const [wordsDataReady, setWordsDataReady] = useState(false);
  const [loadingWordJudged, setLoadingWordJudged] = useState(false);
  const [wordsError, setWordsError] = useState(null);
  const [listIndex, setListIndex] = useState(0);
  const [bookPractices, setBookPractices] = useState(() => loadBookPractices(savedRef.current));
  const [bookPracticePaused, setBookPracticePaused] = useState(() =>
    loadBookPracticePaused(savedRef.current, loadBookPractices(savedRef.current))
  );
  const [reviewShuffle, setReviewShuffle] = useState(savedRef.current.reviewShuffle ?? false);
  const [streakData, setStreakData] = useState(() => recordVisit());
  const [streakOpen, setStreakOpen] = useState(false);
  const [unrecognizedReviewListIds, setUnrecognizedReviewListIds] = useState([]);
  const [recognizedReviewListIds, setRecognizedReviewListIds] = useState([]);
  const [modeTransition, setModeTransition] = useState(null);

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
    const progress = loadProgress(appMode);
    savedRef.current = progress;
    setRecognized(loadRecognized(appMode));
    setUnrecognized(loadUnrecognized(appMode));
    setListProgress(progress.listProgress || {});
    const practices = loadBookPractices(progress);
    setBookPractices(practices);
    setBookPracticePaused(loadBookPracticePaused(progress, practices));
    if (progress.activeTab) setActiveTab(normalizeActiveTabForMode(progress.activeTab, appMode));
    setReviewShuffle(progress.reviewShuffle ?? false);
    setStreakData(refreshStreak());
    if (progress.activeListId) {
      setActiveListId(progress.activeListId);
      setListIndex(getSavedIndex(progress.listProgress, progress.activeListId));
    }
  }, [appMode]);

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
      setWordsDataReady(false);
      setLoadingWordJudged(false);
      setWordsError(null);
      try {
        const manifest = fetchWordListManifest(appMode);
        if (cancelled) return;

        const version = manifest.updatedAt;
        wordlistVersionRef.current = version;
        setAvailableLists(manifest.lists ?? []);

        const listId = resolveActiveListId(savedRef.current.activeListId, manifest);
        if (!listId) throw new Error("词库目录为空");

        const index = fetchWordListIndex(appMode);
        const listPayload = await fetchWordList(listId, appMode, version).then((data) => ({ listId, ...data }));
        if (cancelled) return;

        setWordListIndex(index);

        const { meta, words } = listPayload;

        if (savedRef.current.activeListId !== listId) {
          savedRef.current = { ...savedRef.current, activeListId: listId };
        }

        const savedIndex = getSavedIndex(savedRef.current.listProgress, listId);
        applyList(listId, words, meta, savedIndex);
      } catch (err) {
        if (!cancelled) setWordsError(err.message || "词库加载失败");
      } finally {
        if (!cancelled) setWordsDataReady(true);
      }
    }

    loadCloudWords();
    return () => {
      cancelled = true;
    };
  }, [applyList, appMode]);

  useEffect(() => {
    if (!wordsDataReady) return;
    let cancelled = false;
    fetchWordBank(appMode).then((words) => {
      if (!cancelled) setAllBankWords(words);
    });
    return () => {
      cancelled = true;
    };
  }, [appMode, wordsDataReady]);

  useEffect(() => {
    if (wordsError) {
      setWordsLoading(false);
      return;
    }
    if (wordsDataReady && loadingWordJudged) {
      setWordsLoading(false);
    }
  }, [wordsDataReady, loadingWordJudged, wordsError]);

  const handleLoadingWordJudged = useCallback(() => {
    setLoadingWordJudged(true);
  }, []);

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
    }, appMode);
  }, [activeListId, activeTab, reviewShuffle, listProgress, bookPractices, bookPracticePaused, wordsLoading, appMode]);

  const handleListChange = useCallback(
    async (listId) => {
      if (listId === activeListId) return;

      const nextProgress = patchListProgress(listProgress, activeListId, listIndex);
      setListProgress(nextProgress);

      try {
        const { meta, words } = await fetchWordList(listId, appMode, wordlistVersionRef.current);
        const savedIndex = getSavedIndex(nextProgress, listId);
        applyList(listId, words, meta, savedIndex);
        saveProgress({
          activeListId: listId,
          activeTab,
          reviewShuffle,
          listProgress: nextProgress,
          bookPractices,
          bookPracticePaused,
        }, appMode);
      } catch (err) {
        setWordsError(err.message || "词库切换失败");
      }
    },
    [activeListId, activeTab, appMode, applyList, bookPracticePaused, bookPractices, listIndex, listProgress, reviewShuffle]
  );

  const handleExamModeSwitch = useCallback(
    (targetMode) => {
      const nextMode = normalizeAppMode(targetMode);
      if (nextMode === appMode || modeTransition) return;
      setModeTransition({ from: appMode, to: nextMode });
    },
    [appMode, modeTransition]
  );

  const completeModeTransition = useCallback(() => {
    if (!modeTransition) return;

    saveProgress(
      {
        activeListId,
        activeTab,
        reviewShuffle,
        listProgress,
        bookPractices,
        bookPracticePaused,
      },
      appMode
    );

    const { to } = modeTransition;
    setWordsLoading(true);
    setWordsDataReady(false);
    setLoadingWordJudged(false);
    setWordsError(null);
    setAppMode(to);
    setStorageAppMode(to);

    const progress = loadProgress(to);
    savedRef.current = progress;
    const practices = loadBookPractices(progress);

    setRecognized(loadRecognized(to));
    setUnrecognized(loadUnrecognized(to));
    setListProgress(progress.listProgress || {});
    setBookPractices(practices);
    setBookPracticePaused(loadBookPracticePaused(progress, practices));
    setActiveTab(normalizeActiveTabForMode(progress.activeTab || "practice", to));
    setActiveListId(progress.activeListId ?? null);
    setReviewShuffle(progress.reviewShuffle ?? false);
    setUnrecognizedReviewListIds([]);
    setRecognizedReviewListIds([]);
    setModeTransition(null);
  }, [
    activeListId,
    activeTab,
    appMode,
    bookPracticePaused,
    bookPractices,
    listProgress,
    modeTransition,
    reviewShuffle,
    setAppMode,
  ]);

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
        }, appMode);
        return next;
      });
    },
    [activeListId, appMode, bookPracticePaused, bookPractices, listIndex, reviewShuffle]
  );

  const listWord = useMemo(() => {
    const item = wordList[listIndex];
    if (!item) return null;
    return activeListId ? { ...item, sourceListId: activeListId } : item;
  }, [wordList, listIndex, activeListId]);
  const unrecognizedSession = bookPractices.unrecognized;
  const recognizedSession = bookPractices.recognized;
  const bankSession = bookPractices.bank;
  const unrecognizedWord = unrecognizedSession?.queue[unrecognizedSession.index] ?? null;
  const recognizedWord = recognizedSession?.queue[recognizedSession.index] ?? null;
  const bankWord = bankSession?.queue[bankSession.index] ?? null;

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
            if ((record.wrongCount ?? 0) >= 1) {
              setBookPractices((prevBp) => {
                if (!prevBp.recognized) return prevBp;
                if (
                  !matchesBookPracticeListId(
                    prevBp.recognized,
                    record,
                    wordListIndexRef.current
                  )
                ) {
                  return prevBp;
                }
                return {
                  ...prevBp,
                  recognized: appendToBookQueue(prevBp.recognized, record),
                };
              });
            }
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
          setBookPractices((prevBp) => {
            let nextBp = prevBp;
            if (
              prevBp.unrecognized &&
              matchesBookPracticeListId(
                prevBp.unrecognized,
                wrongRecord,
                wordListIndexRef.current
              )
            ) {
              nextBp = {
                ...nextBp,
                unrecognized: appendToBookQueue(prevBp.unrecognized, wrongRecord),
              };
            }
            if (prevBp.bank) {
              nextBp = {
                ...nextBp,
                bank: appendToBookQueue(prevBp.bank, wrongRecord),
              };
            }
            return nextBp;
          });
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
      }, appMode);
      return next;
    });
  }, [activeListId, activeTab, appMode, bookPracticePaused, bookPractices, listProgress]);

  const startReview = useCallback(
    (listIds) => {
      const targetListIds = listIds ?? unrecognizedReviewListIds;
      if (!targetListIds?.length) return;

      const pool = filterWordsByListIds(unrecognized, targetListIds, wordListIndex);
      if (pool.length === 0) return;

      setBookPracticePaused((p) => ({ ...p, unrecognized: false }));
      setBookPractices((prev) => {
        if (
          prev.unrecognized &&
          sameListIdSet(getSessionListIds(prev.unrecognized), targetListIds)
        ) {
          return prev;
        }

        const reviewWords = (reviewShuffle ? shuffleArray : sortByWrongCount)(pool).map((item) => ({
          word: item.word,
          definitions: item.definitions,
          ...(item.sourceListId ? { sourceListId: item.sourceListId } : {}),
        }));

        return {
          ...prev,
          unrecognized: { queue: reviewWords, index: 0, listIds: targetListIds },
        };
      });
    },
    [unrecognized, unrecognizedReviewListIds, reviewShuffle, wordListIndex]
  );

  const startRecognizedReview = useCallback(
    (listIds) => {
      const targetListIds = listIds ?? recognizedReviewListIds;
      if (!targetListIds?.length) return;

      const pool = filterPastWrongByListIds(recognized, targetListIds, wordListIndex);
      if (pool.length === 0) return;

      setBookPracticePaused((p) => ({ ...p, recognized: false }));
      setBookPractices((prev) => {
        if (
          prev.recognized &&
          sameListIdSet(getSessionListIds(prev.recognized), targetListIds)
        ) {
          return prev;
        }

        const reviewWords = (reviewShuffle ? shuffleArray : sortByWrongCount)(pool).map((item) => ({
          word: item.word,
          definitions: item.definitions,
          ...(item.sourceListId ? { sourceListId: item.sourceListId } : {}),
        }));

        return {
          ...prev,
          recognized: { queue: reviewWords, index: 0, listIds: targetListIds },
        };
      });
    },
    [recognized, recognizedReviewListIds, reviewShuffle, wordListIndex]
  );

  const exitBookPractice = useCallback((bookType, save) => {
    if (save) {
      setBookPracticePaused((p) => ({ ...p, [bookType]: true }));
      return;
    }
    setBookPractices((prev) => ({ ...prev, [bookType]: null }));
    setBookPracticePaused((p) => ({ ...p, [bookType]: false }));
  }, []);

  const handleReturnFromBookPractice = useCallback(
    (bookType) => {
      const save = window.confirm(
        "是否保存当前练习进度？\n\n确定：保存并返回列表\n取消：不保存并返回列表"
      );
      exitBookPractice(bookType, save);
    },
    [exitBookPractice]
  );

  const pauseUnrecognizedPractice = useCallback(() => {
    handleReturnFromBookPractice("unrecognized");
  }, [handleReturnFromBookPractice]);

  const pauseRecognizedPractice = useCallback(() => {
    handleReturnFromBookPractice("recognized");
  }, [handleReturnFromBookPractice]);

  const pauseBankPractice = useCallback(() => {
    handleReturnFromBookPractice("bank");
  }, [handleReturnFromBookPractice]);

  const startBankPractice = useCallback(
    (displayedWords) => {
      if (!displayedWords?.length) return;

      setBookPracticePaused((p) => ({ ...p, bank: false }));
      setBookPractices((prev) => {
        const reviewWords = (reviewShuffle ? shuffleArray : (items) => items)(displayedWords).map(
          (item) => ({
            word: item.word,
            definitions: item.definitions,
            ...(item.sourceListId ? { sourceListId: item.sourceListId } : {}),
          })
        );

        return {
          ...prev,
          bank: { queue: reviewWords, index: 0 },
        };
      });
    },
    [reviewShuffle]
  );

  const resumeBankPractice = useCallback(
    (displayedWords) => {
      if (bookPractices.bank && bookPracticePaused.bank) {
        setBookPracticePaused((p) => ({ ...p, bank: false }));
        return;
      }
      startBankPractice(displayedWords);
    },
    [bookPractices.bank, bookPracticePaused.bank, startBankPractice]
  );

  const resumeUnrecognizedPractice = useCallback(() => {
    if (bookPractices.unrecognized && bookPracticePaused.unrecognized) {
      setBookPracticePaused((p) => ({ ...p, unrecognized: false }));
      return;
    }
    if (unrecognizedReviewListIds.length === 0) return;
    startReview(unrecognizedReviewListIds);
  }, [bookPractices.unrecognized, bookPracticePaused.unrecognized, unrecognizedReviewListIds, startReview]);

  const resumeRecognizedPractice = useCallback(() => {
    if (bookPractices.recognized && bookPracticePaused.recognized) {
      setBookPracticePaused((p) => ({ ...p, recognized: false }));
      return;
    }
    if (recognizedReviewListIds.length === 0) return;
    startRecognizedReview(recognizedReviewListIds);
  }, [bookPractices.recognized, bookPracticePaused.recognized, recognizedReviewListIds, startRecognizedReview]);

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
  const bankPracticeActive = Boolean(bankSession) && !bookPracticePaused.bank;

  const assistantWord =
    activeTab === "practice"
      ? listWord
      : activeTab === "bank" && bankPracticeActive
        ? bankWord
        : activeTab === "unrecognized" && unrecognizedPracticeActive
          ? unrecognizedWord
          : activeTab === "recognized" && recognizedPracticeActive
            ? recognizedWord
            : null;

  const unrecognizedPracticeTitle = useMemo(() => {
    const listIds = getSessionListIds(unrecognizedSession).length
      ? getSessionListIds(unrecognizedSession)
      : unrecognizedReviewListIds;
    const label = getListReviewScopeLabel(listIds, availableLists);
    return reviewShuffle ? `${label} · 乱序` : `${label} · 针对性强化练习`;
  }, [unrecognizedSession, unrecognizedReviewListIds, availableLists, reviewShuffle]);

  const recognizedPracticeTitle = useMemo(() => {
    const listIds = getSessionListIds(recognizedSession).length
      ? getSessionListIds(recognizedSession)
      : recognizedReviewListIds;
    const label = getListReviewScopeLabel(listIds, availableLists);
    return reviewShuffle ? `${label} · 乱序` : `${label} · 曾错题巩固`;
  }, [recognizedSession, recognizedReviewListIds, availableLists, reviewShuffle]);

  const bankPracticeTitle = reviewShuffle ? "词库 · 乱序" : "词库练习";

  const recognizedWordSet = useMemo(
    () => new Set(recognized.map((item) => item.word)),
    [recognized]
  );
  const unrecognizedWordSet = useMemo(
    () => new Set(unrecognized.map((item) => item.word)),
    [unrecognized]
  );
  const wordBankMap = useMemo(() => buildWordBankMap(allBankWords), [allBankWords]);
  const sortedUnrecognizedWords = useMemo(() => sortByWrongCount(unrecognized), [unrecognized]);

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

  const unrecognizedCountByListId = useMemo(
    () => countWordsByListId(unrecognized, wordListIndex),
    [unrecognized, wordListIndex]
  );

  const pastWrongCountByListId = useMemo(
    () => countPastWrongByListId(recognized, wordListIndex),
    [recognized, wordListIndex]
  );

  const selectedUnrecognizedCount = countWordsInListIds(
    unrecognizedCountByListId,
    unrecognizedReviewListIds
  );

  const selectedPastWrongCount = countWordsInListIds(
    pastWrongCountByListId,
    recognizedReviewListIds
  );

  const levelNumbersWithUnrecognized = useMemo(
    () =>
      levelNumbers.filter((level) =>
        (listsByLevel.get(level) ?? []).some(
          (item) => (unrecognizedCountByListId.get(item.id) || 0) > 0
        )
      ),
    [levelNumbers, listsByLevel, unrecognizedCountByListId]
  );

  const levelNumbersWithPastWrong = useMemo(
    () =>
      levelNumbers.filter((level) =>
        (listsByLevel.get(level) ?? []).some(
          (item) => (pastWrongCountByListId.get(item.id) || 0) > 0
        )
      ),
    [levelNumbers, listsByLevel, pastWrongCountByListId]
  );

  const uncategorizedUnrecognizedCount =
    unrecognizedCountByListId.get(UNCategorized_LIST_ID) || 0;
  const uncategorizedPastWrongCount = pastWrongCountByListId.get(UNCategorized_LIST_ID) || 0;

  useEffect(() => {
    if (unrecognized.length === 0) {
      setUnrecognizedReviewListIds([]);
      return;
    }
    setUnrecognizedReviewListIds((prev) =>
      prev.filter((id) => (unrecognizedCountByListId.get(id) || 0) > 0)
    );
  }, [unrecognized.length, unrecognizedCountByListId]);

  useEffect(() => {
    if (recognizedPastWrong.length === 0) {
      setRecognizedReviewListIds([]);
      return;
    }
    setRecognizedReviewListIds((prev) =>
      prev.filter((id) => (pastWrongCountByListId.get(id) || 0) > 0)
    );
  }, [recognizedPastWrong.length, pastWrongCountByListId]);

  // 每个标签页的内容都缓存为稳定的元素树：切换 activeTab 不在这些依赖列表中，
  // 因此切换标签时不会重新渲染 / 重新计算未激活标签页（尤其是词格、阅读词汇、
  // 生熟词本这类渲染量较大的页面），从根本上消除切换卡顿。
  const practicePanel = useMemo(
    () => (
      <PracticeSession
        tabId="practice"
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
        wordBankMap={wordBankMap}
        micGranted={mic.isGranted}
        onResult={handleListResult}
        onMemoryTrickGenerated={handleMemoryTrickGenerated}
        onNext={handleListNext}
        onPrev={handleListPrev}
        sessionKey={`list-${listWord?.word ?? "empty"}-${listIndex}`}
      />
    ),
    [
      listMeta,
      availableLists,
      levelNumbers,
      activeLevel,
      handleLevelChange,
      listsInActiveLevel,
      activeListId,
      handleListChange,
      recognized.length,
      unrecognized.length,
      wordList.length,
      listIndex,
      listWord,
      getWordStats,
      wordBankMap,
      mic.isGranted,
      handleListResult,
      handleMemoryTrickGenerated,
      handleListNext,
      handleListPrev,
    ]
  );

  const bankPanel = useMemo(
    () =>
      bankPracticeActive ? (
        <PracticeSession
          tabId="bank"
          title={bankPracticeTitle}
          toolbarExtra={
            <button type="button" className="btn btn--ghost btn--sm" onClick={pauseBankPractice}>
              返回列表
            </button>
          }
          queueLength={bankSession.queue.length}
          currentIndex={bankSession.index}
          currentWord={bankWord}
          wordStats={getWordStats(bankWord)}
          wordBankMap={wordBankMap}
          micGranted={mic.isGranted}
          onResult={handleListResult}
          onMemoryTrickGenerated={handleMemoryTrickGenerated}
          onNext={() => handleBookNext("bank")}
          onPrev={() => handleBookPrev("bank")}
          sessionKey={`bank-${bankWord?.word ?? "empty"}-${bankSession.index}`}
          emptyMessage="本轮词库练习已完成！"
        />
      ) : (
        <VocabularyBank
          words={allBankWords}
          availableLists={availableLists}
          wordListIndex={wordListIndex}
          recognizedSet={recognizedWordSet}
          unrecognizedSet={unrecognizedWordSet}
          bankSession={bankSession}
          bankPracticePaused={bookPracticePaused.bank}
          onResumePractice={resumeBankPractice}
          reviewShuffle={reviewShuffle}
          onToggleShuffle={toggleReviewShuffle}
        />
      ),
    [
      bankPracticeActive,
      bankPracticeTitle,
      pauseBankPractice,
      bankSession,
      bankWord,
      getWordStats,
      wordBankMap,
      mic.isGranted,
      handleListResult,
      handleMemoryTrickGenerated,
      handleBookNext,
      handleBookPrev,
      allBankWords,
      availableLists,
      wordListIndex,
      recognizedWordSet,
      unrecognizedWordSet,
      bookPracticePaused.bank,
      resumeBankPractice,
      reviewShuffle,
      toggleReviewShuffle,
    ]
  );

  const lexGridPanel = useMemo(
    () => <LexGridGame words={allBankWords} availableLists={availableLists} tabId="lexgrid" />,
    [allBankWords, availableLists]
  );

  const readingVocabPanel = useMemo(
    () => <ReadingVocabMatch words={allBankWords} />,
    [allBankWords]
  );

  const readingFillPanel = useMemo(() => <ReadingFillBlank />, []);

  const unrecognizedPanel = useMemo(
    () =>
      unrecognizedPracticeActive ? (
        <PracticeSession
          tabId="unrecognized"
          title={unrecognizedPracticeTitle}
          toolbarExtra={
            <button type="button" className="btn btn--ghost btn--sm" onClick={pauseUnrecognizedPractice}>
              返回列表
            </button>
          }
          queueLength={unrecognizedSession.queue.length}
          currentIndex={unrecognizedSession.index}
          currentWord={unrecognizedWord}
          wordStats={getWordStats(unrecognizedWord)}
          wordBankMap={wordBankMap}
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
          words={sortedUnrecognizedWords}
          emptyText="太棒了！目前没有生词，继续保持。"
          showWrongCount
          groupByList
          availableLists={availableLists}
          wordListIndex={wordListIndex}
          reviewBar={
            unrecognized.length > 0 ? (
              <BookReviewScopeBar
                title="针对性强化练习"
                description={`按 Level · List 多选复习范围（共 ${unrecognized.length} 个生词）`}
                levelNumbers={levelNumbersWithUnrecognized}
                listsByLevel={listsByLevel}
                countByListId={unrecognizedCountByListId}
                selectedListIds={unrecognizedReviewListIds}
                onSelectedListIdsChange={setUnrecognizedReviewListIds}
                uncategorizedCount={uncategorizedUnrecognizedCount}
                reviewShuffle={reviewShuffle}
                onToggleShuffle={toggleReviewShuffle}
                primaryLabel={
                  unrecognizedSession && bookPracticePaused.unrecognized
                    ? `继续强化（${unrecognizedSession.index + 1}/${unrecognizedSession.queue.length}）`
                    : unrecognizedReviewListIds.length === 0
                      ? "开始强化"
                      : `开始强化（${selectedUnrecognizedCount}）`
                }
                onPrimary={resumeUnrecognizedPractice}
                primaryDisabled={
                  !(unrecognizedSession && bookPracticePaused.unrecognized) &&
                  unrecognizedReviewListIds.length === 0
                }
              />
            ) : null
          }
        />
      ),
    [
      unrecognizedPracticeActive,
      unrecognizedPracticeTitle,
      pauseUnrecognizedPractice,
      unrecognizedSession,
      unrecognizedWord,
      getWordStats,
      wordBankMap,
      mic.isGranted,
      handleUnrecognizedBookResult,
      handleMemoryTrickGenerated,
      handleBookNext,
      handleBookPrev,
      reviewShuffle,
      unrecognized.length,
      sortedUnrecognizedWords,
      availableLists,
      wordListIndex,
      levelNumbersWithUnrecognized,
      listsByLevel,
      unrecognizedCountByListId,
      unrecognizedReviewListIds,
      uncategorizedUnrecognizedCount,
      toggleReviewShuffle,
      bookPracticePaused.unrecognized,
      selectedUnrecognizedCount,
      resumeUnrecognizedPractice,
    ]
  );

  const recognizedPanel = useMemo(
    () =>
      recognizedPracticeActive ? (
        <PracticeSession
          tabId="recognized"
          title={recognizedPracticeTitle}
          toolbarExtra={
            <button type="button" className="btn btn--ghost btn--sm" onClick={pauseRecognizedPractice}>
              返回列表
            </button>
          }
          queueLength={recognizedSession.queue.length}
          currentIndex={recognizedSession.index}
          currentWord={recognizedWord}
          wordStats={getWordStats(recognizedWord)}
          wordBankMap={wordBankMap}
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
            <BookReviewScopeBar
              title="曾错题巩固"
              description={
                recognizedPastWrong.length > 0
                  ? `按 Level · List 多选巩固范围（共 ${recognizedPastWrong.length} 个曾错题）`
                  : "暂无曾错题。答错后进熟词本的词会带「曾错 N 次」标记，即可在此巩固"
              }
              levelNumbers={levelNumbersWithPastWrong}
              listsByLevel={listsByLevel}
              countByListId={pastWrongCountByListId}
              selectedListIds={recognizedReviewListIds}
              onSelectedListIdsChange={setRecognizedReviewListIds}
              uncategorizedCount={uncategorizedPastWrongCount}
              reviewShuffle={reviewShuffle}
              onToggleShuffle={toggleReviewShuffle}
              primaryLabel={
                recognizedSession && bookPracticePaused.recognized
                  ? `继续巩固（${recognizedSession.index + 1}/${recognizedSession.queue.length}）`
                  : recognizedReviewListIds.length === 0
                    ? "开始巩固"
                    : `开始巩固（${selectedPastWrongCount}）`
              }
              onPrimary={resumeRecognizedPractice}
              primaryDisabled={
                !(recognizedSession && bookPracticePaused.recognized) &&
                recognizedReviewListIds.length === 0
              }
            />
          }
        />
      ),
    [
      recognizedPracticeActive,
      recognizedPracticeTitle,
      pauseRecognizedPractice,
      recognizedSession,
      recognizedWord,
      getWordStats,
      wordBankMap,
      mic.isGranted,
      handleRecognizedBookResult,
      handleMemoryTrickGenerated,
      handleBookNext,
      handleBookPrev,
      recognizedPastWrong,
      recognized,
      handleRemoveRecognized,
      handleClearRecognized,
      availableLists,
      wordListIndex,
      handleRecognizedMemoryTrick,
      levelNumbersWithPastWrong,
      listsByLevel,
      pastWrongCountByListId,
      recognizedReviewListIds,
      uncategorizedPastWrongCount,
      reviewShuffle,
      toggleReviewShuffle,
      bookPracticePaused.recognized,
      selectedPastWrongCount,
      resumeRecognizedPractice,
    ]
  );

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
      {modeTransition ? (
        <div className="app-loading-overlay app-loading-overlay--transition">
          <ExamModeTransition
            fromMode={modeTransition.from}
            toMode={modeTransition.to}
            onComplete={completeModeTransition}
          />
        </div>
      ) : null}
      {wordsLoading ? (
        <div className="app-loading-overlay">
          <VocabLoadingScreen dataReady={wordsDataReady} onWordJudged={handleLoadingWordJudged} />
        </div>
      ) : null}
      <div className="app-shell" inert={settingsOpen || wordsLoading || Boolean(modeTransition)}>
        <Navbar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          counts={{ recognized: recognized.length, unrecognized: unrecognized.length }}
          streak={streakData}
          onStreakClick={() => {
            setStreakData(recordVisit());
            setStreakOpen(true);
          }}
          onExamModeSwitch={handleExamModeSwitch}
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

        <main className={`main${activeTab === "reading-fill" ? " main--rfill" : ""}`}>
        <ActiveTabProvider value={activeTab}>
          <TabPanel tabId="practice" activeTab={activeTab}>
            {practicePanel}
          </TabPanel>

          <TabPanel tabId="bank" activeTab={activeTab}>
            {bankPanel}
          </TabPanel>

          {appMode === "toefl" ? (
            <TabPanel tabId="reading-vocab" activeTab={activeTab}>
              {readingVocabPanel}
            </TabPanel>
          ) : null}

          <TabPanel tabId="lexgrid" activeTab={activeTab}>
            {lexGridPanel}
          </TabPanel>

          <TabPanel tabId="unrecognized" activeTab={activeTab}>
            {unrecognizedPanel}
          </TabPanel>

          <TabPanel tabId="recognized" activeTab={activeTab}>
            {recognizedPanel}
          </TabPanel>

          {appMode === "toefl" ? (
            <TabPanel tabId="reading-fill" activeTab={activeTab}>
              {readingFillPanel}
            </TabPanel>
          ) : null}
        </ActiveTabProvider>
      </main>

      <VocabAssistant
        currentWord={assistantWord}
        micGranted={mic.isGranted}
      />

      {activeTab !== "reading-fill" ? <MottoFooter /> : null}
      </div>

      <SettingsPanel />
    </div>
  );
}
