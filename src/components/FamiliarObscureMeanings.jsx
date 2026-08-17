import { memo, useCallback, useMemo, useState, useEffect, useLayoutEffect, useRef } from "react";
import {
  buildFamiliarObscureWordData,
  filterEntriesByQuizScope,
  filterFamiliarObscureEntries,
  getFamiliarObscureEntries,
  getFamiliarObscureIdBounds,
  getFamiliarObscureTitle,
} from "../utils/familiarObscureMeanings";
import {
  applyFamiliarObscureQuizResult,
  buildQuizScopeKey,
  buildBrowseScopeKey,
  buildShuffledOrder,
  FOBS_PROGRESS_EVENT,
  resolveBrowseSessionState,
  isFamiliarObscureReviewEntry,
  loadFamiliarObscureProgress,
  patchBrowseSession,
  patchFamiliarObscureProgress,
} from "../services/familiarObscureProgress";
import { useIsActiveTab } from "../context/ActiveTabContext";
import PracticeSession from "./PracticeSession";

function clampScopeId(value, min, max) {
  const n = Number.parseInt(String(value).trim(), 10);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function createInitialFobsUiState(entries) {
  const saved = loadFamiliarObscureProgress();
  let panelMode = saved.panelMode === "quiz" ? "quiz" : "practice";
  const query = saved.browseQuery || "";
  const listFilter = saved.browseListFilter === "review" ? "review" : "all";
  const shuffle = Boolean(saved.browseShuffle);
  let quizScope = saved.lastScope;
  let quizEntries = [];

  if (panelMode === "quiz") {
    quizEntries = filterEntriesByQuizScope(entries, quizScope, saved);
    if (!quizEntries.length) {
      panelMode = "practice";
      quizEntries = [];
    }
  }

  return { panelMode, query, listFilter, shuffle, quizScope, quizEntries };
}

function FamiliarObscureQuizSetup({ entries, onBack, onStart }) {
  const idBounds = useMemo(() => getFamiliarObscureIdBounds(entries), [entries]);
  const saved = useMemo(() => loadFamiliarObscureProgress(), []);
  const [fromId, setFromId] = useState(String(saved.lastScope.fromId || idBounds.min));
  const [toId, setToId] = useState(String(saved.lastScope.toId || idBounds.max));
  const [onlyReview, setOnlyReview] = useState(Boolean(saved.lastScope.onlyReview));
  const [onlyUnmastered, setOnlyUnmastered] = useState(Boolean(saved.lastScope.onlyUnmastered));
  const [error, setError] = useState("");

  const scope = useMemo(
    () => ({
      fromId: clampScopeId(fromId, idBounds.min, idBounds.max),
      toId: clampScopeId(toId, idBounds.min, idBounds.max),
      onlyReview,
      onlyUnmastered,
    }),
    [fromId, toId, onlyReview, onlyUnmastered, idBounds.min, idBounds.max]
  );

  const previewEntries = useMemo(
    () => filterEntriesByQuizScope(entries, scope, saved),
    [entries, scope, saved]
  );

  const reviewCount = saved.unknownIds.length;
  const unmasteredCount = entries.length - saved.masteredIds.length;

  function handleStart() {
    if (previewEntries.length === 0) {
      setError("当前范围内没有可测词条，请调整编号或筛选条件");
      return;
    }
    patchFamiliarObscureProgress({ lastScope: scope });
    onStart(scope, previewEntries);
  }

  return (
    <div className="fobs fobs--setup">
      <div className="fobs__setup-hero">
        <button type="button" className="btn btn--ghost btn--sm fobs__setup-back" onClick={onBack}>
          ← 返回练习
        </button>
        <div className="fobs__setup-hero-text">
          <h2 className="fobs__title">范围测试</h2>
          <p className="fobs__subtitle">
            编号 #{idBounds.min}–#{idBounds.max} · 本次 {previewEntries.length} 词
          </p>
        </div>
      </div>

      <div className="fobs__setup-body">
        <section className="fobs__setup-card">
          <h3 className="fobs__setup-label">编号范围</h3>
          <div className="fobs__setup-range">
            <label className="fobs__setup-field">
              <span>从</span>
              <input
                type="number"
                min={idBounds.min}
                max={idBounds.max}
                value={fromId}
                onChange={(event) => {
                  setError("");
                  setFromId(event.target.value);
                }}
              />
            </label>
            <span className="fobs__setup-range-sep">—</span>
            <label className="fobs__setup-field">
              <span>到</span>
              <input
                type="number"
                min={idBounds.min}
                max={idBounds.max}
                value={toId}
                onChange={(event) => {
                  setError("");
                  setToId(event.target.value);
                }}
              />
            </label>
          </div>
          <div className="fobs__setup-presets">
            <button
              type="button"
              className={`fobs__setup-preset${!onlyReview && !onlyUnmastered ? " fobs__setup-preset--active" : ""}`}
              onClick={() => {
                setFromId(String(idBounds.min));
                setToId(String(idBounds.max));
                setOnlyReview(false);
                setOnlyUnmastered(false);
                setError("");
              }}
            >
              全部
            </button>
            <button
              type="button"
              className={`fobs__setup-preset${onlyUnmastered && !onlyReview ? " fobs__setup-preset--active" : ""}`}
              onClick={() => {
                setFromId(String(idBounds.min));
                setToId(String(idBounds.max));
                setOnlyReview(false);
                setOnlyUnmastered(true);
                setError("");
              }}
            >
              仅未掌握
            </button>
            <button
              type="button"
              className={`fobs__setup-preset${onlyReview && !onlyUnmastered ? " fobs__setup-preset--active" : ""}`}
              onClick={() => {
                setFromId(String(idBounds.min));
                setToId(String(idBounds.max));
                setOnlyReview(true);
                setOnlyUnmastered(false);
                setError("");
              }}
            >
              仅待复习
            </button>
          </div>
        </section>

        <section className="fobs__setup-card">
          <h3 className="fobs__setup-label">筛选条件</h3>
          <div className="fobs__setup-checks">
            <label className="fobs__setup-check">
              <input
                type="checkbox"
                checked={onlyUnmastered}
                onChange={(event) => {
                  setError("");
                  setOnlyUnmastered(event.target.checked);
                }}
              />
              <span>排除已掌握词（{unmasteredCount} 词可选）</span>
            </label>
            <label className="fobs__setup-check">
              <input
                type="checkbox"
                checked={onlyReview}
                onChange={(event) => {
                  setError("");
                  setOnlyReview(event.target.checked);
                }}
              />
              <span>仅测待复习词（{reviewCount} 词已标记）</span>
            </label>
          </div>
          <p className="fobs__setup-hint">
            答错或标记「不认识」会自动打上「待复习」；答对后移除。
          </p>
        </section>
      </div>

      {error ? <p className="fobs__setup-error">{error}</p> : null}

      <button type="button" className="btn btn--primary fobs__setup-start" onClick={handleStart}>
        开始测试 · {previewEntries.length} 词
      </button>
    </div>
  );
}

function removeEntryAtOrderIndex(entries, order, atIndex) {
  const removeIdx = order[atIndex];
  return {
    entries: entries.filter((_, i) => i !== removeIdx),
    order: order.filter((i) => i !== removeIdx).map((i) => (i > removeIdx ? i - 1 : i)),
  };
}

function FamiliarObscurePractice({
  entries,
  title,
  stats,
  scopeKey,
  scope,
  sessionType = "quiz",
  deferReviewRemoval = false,
  onProgressChange,
  onExit,
  wordBankMap,
  micGranted,
  toolbarExtra,
  shuffle,
  onToggleShuffle,
  emptyMessage = "没有可练习的词条",
}) {
  const isBrowse = sessionType === "browse";
  const savedQuiz = useMemo(() => loadFamiliarObscureProgress(), []);
  const [localEntries, setLocalEntries] = useState(() => entries);
  const pendingResultRef = useRef(null);
  const activeEntries = deferReviewRemoval ? localEntries : entries;

  function resolveInitialBrowseSession() {
    return resolveBrowseSessionState(scopeKey, activeEntries.length, shuffle);
  }

  function resolveInitialQuizSession() {
    if (
      savedQuiz.quizScopeKey === scopeKey &&
      savedQuiz.quizOrder.length === activeEntries.length
    ) {
      return {
        index: Math.max(0, Math.min(savedQuiz.quizIndex ?? 0, Math.max(activeEntries.length - 1, 0))),
        order: savedQuiz.quizOrder,
      };
    }
    return {
      index: 0,
      order: shuffle ? buildShuffledOrder(activeEntries.length) : activeEntries.map((_, index) => index),
    };
  }

  const initialSession = isBrowse ? resolveInitialBrowseSession() : resolveInitialQuizSession();

  const [order, setOrder] = useState(() => initialSession.order);
  const [index, setIndex] = useState(() => initialSession.index);
  const [complete, setComplete] = useState(false);
  const prevShuffleRef = useRef(shuffle);

  useLayoutEffect(() => {
    if (!isBrowse || prevShuffleRef.current === shuffle) return;
    prevShuffleRef.current = shuffle;
    const session = resolveBrowseSessionState(scopeKey, activeEntries.length, shuffle);
    setOrder(session.order);
    setIndex(session.index);
    setComplete(false);
  }, [isBrowse, shuffle, scopeKey, activeEntries.length]);

  useEffect(() => {
    return () => {
      const pending = pendingResultRef.current;
      if (!pending) return;
      applyFamiliarObscureQuizResult(pending.entryId, pending.aiResult);
    };
  }, []);

  useEffect(() => {
    if (!isBrowse && scope) {
      patchFamiliarObscureProgress({ quizScopeKey: scopeKey, lastScope: scope, panelMode: "quiz" });
    }
  }, [isBrowse, scope, scopeKey]);

  useEffect(() => {
    if (complete) return;
    if (isBrowse) {
      patchBrowseSession(scopeKey, { index, order, shuffle });
      return;
    }
    patchFamiliarObscureProgress({ quizIndex: index, quizOrder: order, quizScopeKey: scopeKey });
  }, [complete, index, order, isBrowse, scopeKey, shuffle]);

  const entry = activeEntries[order[index]] ?? null;
  const currentWord = entry ? buildFamiliarObscureWordData(entry) : null;
  const total = activeEntries.length;

  const handleResult = useCallback(
    (_wordData, aiResult) => {
      const entryId = _wordData?.familiarObscure?.entryId;
      if (!entryId) return;
      if (deferReviewRemoval && aiResult.is_correct) {
        pendingResultRef.current = { entryId, aiResult };
        return;
      }
      applyFamiliarObscureQuizResult(entryId, aiResult);
      onProgressChange?.();
    },
    [deferReviewRemoval, onProgressChange]
  );

  const restart = useCallback(() => {
    pendingResultRef.current = null;
    const baseEntries = deferReviewRemoval ? entries : activeEntries;
    if (deferReviewRemoval) {
      setLocalEntries(entries);
    }
    const nextOrder = shuffle ? buildShuffledOrder(baseEntries.length) : baseEntries.map((_, i) => i);
    setOrder(nextOrder);
    setIndex(0);
    setComplete(false);
    if (isBrowse) {
      patchBrowseSession(scopeKey, { index: 0, order: nextOrder, shuffle });
    } else {
      patchFamiliarObscureProgress({ quizIndex: 0, quizOrder: nextOrder, quizScopeKey: scopeKey });
    }
  }, [activeEntries, deferReviewRemoval, entries, isBrowse, scopeKey, shuffle]);

  const handleNext = useCallback(() => {
    const pending = pendingResultRef.current;
    const currentEntryId = entry?.id;

    if (pending && pending.entryId === currentEntryId) {
      applyFamiliarObscureQuizResult(pending.entryId, pending.aiResult);
      pendingResultRef.current = null;
      onProgressChange?.();

      if (deferReviewRemoval && pending.aiResult.is_correct) {
        const { entries: nextEntries, order: nextOrder } = removeEntryAtOrderIndex(
          activeEntries,
          order,
          index
        );
        setLocalEntries(nextEntries);
        setOrder(nextOrder);
        if (nextEntries.length === 0 || index >= nextEntries.length) {
          setComplete(true);
        }
        if (isBrowse) {
          patchBrowseSession(scopeKey, {
            index: Math.min(index, Math.max(nextEntries.length - 1, 0)),
            order: nextOrder,
            shuffle,
          });
        }
        return;
      }
    }

    if (index >= total - 1) {
      setComplete(true);
      return;
    }
    setIndex((prev) => prev + 1);
  }, [
    activeEntries,
    deferReviewRemoval,
    entry?.id,
    index,
    isBrowse,
    onProgressChange,
    order,
    scopeKey,
    shuffle,
    total,
  ]);

  const handlePrev = useCallback(() => {
    if (index > 0) setIndex((prev) => prev - 1);
  }, [index]);

  if (activeEntries.length === 0) {
    return (
      <div className="word-list-view__empty fobs__practice-empty">
        <span className="empty-icon">📭</span>
        <p>{emptyMessage}</p>
        {onExit ? (
          <button type="button" className="btn btn--ghost" onClick={onExit}>
            返回
          </button>
        ) : null}
      </div>
    );
  }

  if (complete) {
    return (
      <section className="practice-view">
        <div className="practice-toolbar">
          <div className="practice-toolbar__left">
            <span className="practice-toolbar__title">{title}</span>
          </div>
        </div>
        <div className="word-list-view__empty">
          <span className="empty-icon">🎉</span>
          <p>本轮练习完成，共 {total} 词。不认识的词已标记「待复习」。</p>
          <div className="fobs__quiz-actions">
            <button type="button" className="btn btn--primary" onClick={restart}>
              再来一轮
            </button>
            {onExit ? (
              <button type="button" className="btn btn--ghost" onClick={onExit}>
                返回
              </button>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  const shuffleButton = (
    <button
      type="button"
      className={`btn btn--ghost btn--sm${shuffle ? " btn--toggle-on" : ""}`}
      onClick={onToggleShuffle}
      aria-pressed={shuffle}
    >
      {shuffle ? "乱序" : "顺序"}
    </button>
  );

  return (
    <PracticeSession
      tabId="familiar-obscure"
      disableAutoRead
      title={isBrowse ? "" : title}
      stats={stats}
      toolbarExtra={
        <>
          {shuffleButton}
          {toolbarExtra}
        </>
      }
      queueLength={total}
      currentIndex={index}
      currentWord={currentWord}
      wordStats={null}
      wordBankMap={wordBankMap}
      micGranted={micGranted}
      onResult={handleResult}
      onMemoryTrickGenerated={() => {}}
      onNext={handleNext}
      onPrev={handlePrev}
      sessionKey={`fobs-${scopeKey}-${entry?.id ?? "empty"}-${index}`}
      emptyMessage="本轮练习完成"
    />
  );
}

function FamiliarObscureMeanings({ wordBankMap, micGranted }) {
  const isTabActive = useIsActiveTab("familiar-obscure");
  const entries = useMemo(() => getFamiliarObscureEntries(), []);
  const idBounds = useMemo(() => getFamiliarObscureIdBounds(entries), [entries]);
  const initialUi = useMemo(() => createInitialFobsUiState(entries), [entries]);
  const [panelMode, setPanelMode] = useState(initialUi.panelMode);
  const [query, setQuery] = useState(initialUi.query);
  const [listFilter, setListFilter] = useState(initialUi.listFilter);
  const [quizScope, setQuizScope] = useState(initialUi.quizScope);
  const [quizEntries, setQuizEntries] = useState(initialUi.quizEntries);
  const [progress, setProgress] = useState(() => loadFamiliarObscureProgress());
  const [shuffle, setShuffle] = useState(initialUi.shuffle);

  const refreshProgress = useCallback(() => {
    setProgress(loadFamiliarObscureProgress());
  }, []);

  const reviewCount = progress.unknownIds.length;
  const filtered = useMemo(() => filterFamiliarObscureEntries(entries, query), [entries, query]);
  const practiceEntries = useMemo(() => {
    if (listFilter !== "review") return filtered;
    return filtered.filter((entry) => isFamiliarObscureReviewEntry(entry.id, progress));
  }, [filtered, listFilter, progress]);

  const practiceScopeKey = useMemo(
    () => buildBrowseScopeKey(listFilter, query, practiceEntries.length),
    [listFilter, query, practiceEntries.length]
  );

  useEffect(() => {
    patchFamiliarObscureProgress({
      browseQuery: query,
      browseListFilter: listFilter,
      browseShuffle: shuffle,
    });
  }, [query, listFilter, shuffle]);

  const setPanelModePersisted = useCallback((mode) => {
    setPanelMode(mode);
    if (mode === "practice") {
      patchFamiliarObscureProgress({ panelMode: "practice" });
    }
  }, []);

  useEffect(() => {
    function onProgressChange() {
      refreshProgress();
    }
    window.addEventListener(FOBS_PROGRESS_EVENT, onProgressChange);
    return () => window.removeEventListener(FOBS_PROGRESS_EVENT, onProgressChange);
  }, [refreshProgress]);

  useEffect(() => {
    if (isTabActive && panelMode === "practice") {
      refreshProgress();
    }
  }, [isTabActive, panelMode, refreshProgress]);

  const startQuiz = useCallback((scope, scopedEntries) => {
    setQuizScope(scope);
    setQuizEntries(scopedEntries);
    setPanelMode("quiz");
    patchFamiliarObscureProgress({ panelMode: "quiz", lastScope: scope });
  }, []);

  if (panelMode === "quiz-setup") {
    return (
      <FamiliarObscureQuizSetup
        entries={entries}
        onBack={() => setPanelModePersisted("practice")}
        onStart={startQuiz}
      />
    );
  }

  if (panelMode === "quiz") {
    const scopeKey = buildQuizScopeKey(quizScope, quizEntries.length);
    const scopeLabel = `#${Math.min(quizScope.fromId, quizScope.toId)}–#${Math.max(quizScope.fromId, quizScope.toId)}`;
    return (
      <FamiliarObscurePractice
        entries={quizEntries}
        title={`范围测试 · ${scopeLabel}`}
        scopeKey={scopeKey}
        scope={quizScope}
        sessionType="quiz"
        shuffle={shuffle}
        onToggleShuffle={() => setShuffle((value) => !value)}
        wordBankMap={wordBankMap}
        micGranted={micGranted}
        onProgressChange={refreshProgress}
        onExit={() => {
          refreshProgress();
          setPanelModePersisted("practice");
        }}
        toolbarExtra={
          <>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPanelMode("quiz-setup")}>
              换范围
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPanelModePersisted("practice")}>
              返回练习
            </button>
          </>
        }
      />
    );
  }

  return (
    <div className="fobs fobs--practice">
      <div className="fobs__control-bar">
        <div className="fobs__control-top">
          <div className="fobs__control-heading">
            <h2 className="fobs__title">{getFamiliarObscureTitle()}</h2>
            <p className="fobs__subtitle">
              #{idBounds.min}–#{idBounds.max} · 共 {entries.length} 词
            </p>
          </div>
          <div className="fobs__mode-tabs" role="tablist" aria-label="熟词僻义模式">
            <button type="button" className="fobs__mode-tab fobs__mode-tab--active" role="tab" aria-selected>
              练习
            </button>
            <button
              type="button"
              className="fobs__mode-tab"
              role="tab"
              aria-selected={false}
              onClick={() => setPanelMode("quiz-setup")}
            >
              范围测试
            </button>
          </div>
        </div>

        <div className="fobs__control-row">
          <input
            type="search"
            className="fobs__search fobs__search--inline"
            placeholder="搜索单词或释义…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="搜索熟词僻义"
          />
          <div className="fobs__list-filters fobs__list-filters--inline" role="tablist" aria-label="练习筛选">
            <button
              type="button"
              className={`fobs__list-filter${listFilter === "all" ? " fobs__list-filter--active" : ""}`}
              onClick={() => setListFilter("all")}
            >
              全部
            </button>
            <button
              type="button"
              className={`fobs__list-filter${listFilter === "review" ? " fobs__list-filter--active" : ""}`}
              onClick={() => setListFilter("review")}
            >
              待复习{reviewCount > 0 ? ` ${reviewCount}` : ""}
            </button>
          </div>
          <div className="fobs__control-stats">
            <span className="stat-pill stat-pill--ok">已掌握 {progress.masteredIds.length}</span>
            <span className="stat-pill stat-pill--fail">待复习 {reviewCount}</span>
          </div>
        </div>
      </div>

      <FamiliarObscurePractice
        key={practiceScopeKey}
        entries={practiceEntries}
        scopeKey={practiceScopeKey}
        sessionType="browse"
        deferReviewRemoval={listFilter === "review"}
        shuffle={shuffle}
        onToggleShuffle={() => setShuffle((value) => !value)}
        wordBankMap={wordBankMap}
        micGranted={micGranted}
        onProgressChange={refreshProgress}
        emptyMessage={
          listFilter === "review" ? "暂无待复习词条，答错会自动标记" : "没有匹配的词条，请调整搜索"
        }
      />
    </div>
  );
}

export default memo(FamiliarObscureMeanings);
