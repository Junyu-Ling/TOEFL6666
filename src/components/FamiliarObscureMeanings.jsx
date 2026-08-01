import { memo, useCallback, useMemo, useState, useEffect } from "react";
import {
  buildFamiliarObscureWordData,
  createDefaultQuizScope,
  filterEntriesByQuizScope,
  filterFamiliarObscureEntries,
  getFamiliarObscureEntries,
  getFamiliarObscureIdBounds,
  getFamiliarObscureTitle,
} from "../utils/familiarObscureMeanings";
import {
  applyFamiliarObscureQuizResult,
  buildQuizScopeKey,
  buildShuffledOrder,
  FOBS_PROGRESS_EVENT,
  isFamiliarObscureReviewEntry,
  loadFamiliarObscureProgress,
  patchFamiliarObscureProgress,
} from "../services/familiarObscureProgress";
import { useIsActiveTab } from "../context/ActiveTabContext";
import PracticeSession from "./PracticeSession";

function clampScopeId(value, min, max) {
  const n = Number.parseInt(String(value).trim(), 10);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
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
      <header className="fobs__header">
        <div>
          <h2 className="fobs__title">僻义测试 · 选择范围</h2>
          <p className="fobs__subtitle">
            编号 #{idBounds.min}–#{idBounds.max} · 本次将测 {previewEntries.length} 词
          </p>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onBack}>
          返回练习
        </button>
      </header>

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
          <span className="fobs__setup-range-sep">至</span>
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
            className="fobs__setup-preset"
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
            className="fobs__setup-preset"
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
            className="fobs__setup-preset"
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
        <p className="fobs__setup-hint">
          测试中答错或标记「不认识」的词，会自动在词表打上「待复习」标签；答对后会移除。
        </p>
      </section>

      {error ? <p className="fobs__setup-error">{error}</p> : null}

      <button type="button" className="btn btn--primary fobs__setup-start" onClick={handleStart}>
        开始测试（{previewEntries.length} 词）
      </button>
    </div>
  );
}

function FamiliarObscurePractice({
  entries,
  title,
  stats,
  scopeKey,
  scope,
  persistProgress = false,
  onProgressChange,
  onExit,
  wordBankMap,
  micGranted,
  toolbarExtra,
  shuffle,
  onToggleShuffle,
  emptyMessage = "没有可练习的词条",
}) {
  const saved = useMemo(() => loadFamiliarObscureProgress(), []);
  const [order, setOrder] = useState(() => {
    if (persistProgress && saved.quizScopeKey === scopeKey && saved.quizOrder.length === entries.length) {
      return saved.quizOrder;
    }
    return shuffle ? buildShuffledOrder(entries.length) : entries.map((_, index) => index);
  });
  const [index, setIndex] = useState(() => {
    if (!persistProgress) return 0;
    if (saved.quizScopeKey !== scopeKey) return 0;
    return Math.max(0, Math.min(saved.quizIndex ?? 0, Math.max(entries.length - 1, 0)));
  });
  const [complete, setComplete] = useState(false);

  const queueKey = `${scopeKey}:${entries.length}:${shuffle ? 1 : 0}`;

  useEffect(() => {
    setOrder(shuffle ? buildShuffledOrder(entries.length) : entries.map((_, i) => i));
    setIndex(0);
    setComplete(false);
  }, [queueKey, entries.length, shuffle]);

  useEffect(() => {
    if (persistProgress && scope) {
      patchFamiliarObscureProgress({ quizScopeKey: scopeKey, lastScope: scope });
    }
  }, [persistProgress, scope, scopeKey]);

  useEffect(() => {
    if (!persistProgress || complete) return;
    patchFamiliarObscureProgress({ quizIndex: index, quizOrder: order, quizScopeKey: scopeKey });
  }, [complete, index, order, persistProgress, scopeKey]);

  const entry = entries[order[index]] ?? null;
  const currentWord = entry ? buildFamiliarObscureWordData(entry) : null;
  const total = entries.length;

  const handleResult = useCallback(
    (_wordData, aiResult) => {
      const entryId = _wordData?.familiarObscure?.entryId;
      if (!entryId) return;
      applyFamiliarObscureQuizResult(entryId, aiResult);
      onProgressChange?.();
    },
    [onProgressChange]
  );

  const restart = useCallback(() => {
    const nextOrder = shuffle ? buildShuffledOrder(entries.length) : entries.map((_, i) => i);
    setOrder(nextOrder);
    setIndex(0);
    setComplete(false);
    if (persistProgress) {
      patchFamiliarObscureProgress({ quizIndex: 0, quizOrder: nextOrder, quizScopeKey: scopeKey });
    }
  }, [entries.length, persistProgress, scopeKey, shuffle]);

  const handleNext = useCallback(() => {
    if (index >= total - 1) {
      setComplete(true);
      return;
    }
    setIndex((prev) => prev + 1);
  }, [index, total]);

  const handlePrev = useCallback(() => {
    if (index > 0) setIndex((prev) => prev - 1);
  }, [index]);

  if (entries.length === 0) {
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
      title={title}
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
  const [panelMode, setPanelMode] = useState("practice");
  const [query, setQuery] = useState("");
  const [listFilter, setListFilter] = useState("all");
  const [quizScope, setQuizScope] = useState(() => createDefaultQuizScope(entries));
  const [quizEntries, setQuizEntries] = useState([]);
  const [progress, setProgress] = useState(() => loadFamiliarObscureProgress());
  const [shuffle, setShuffle] = useState(false);

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
    () => `browse-${listFilter}-${query.trim().toLowerCase()}-${practiceEntries.length}`,
    [listFilter, query, practiceEntries.length]
  );

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
  }, []);

  if (panelMode === "quiz-setup") {
    return (
      <FamiliarObscureQuizSetup
        entries={entries}
        onBack={() => setPanelMode("practice")}
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
        title={`僻义测试 · ${scopeLabel}`}
        scopeKey={scopeKey}
        scope={quizScope}
        persistProgress
        shuffle={shuffle}
        onToggleShuffle={() => setShuffle((value) => !value)}
        wordBankMap={wordBankMap}
        micGranted={micGranted}
        onProgressChange={refreshProgress}
        onExit={() => {
          refreshProgress();
          setPanelMode("practice");
        }}
        toolbarExtra={
          <>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPanelMode("quiz-setup")}>
              换范围
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPanelMode("practice")}>
              返回练习
            </button>
          </>
        }
      />
    );
  }

  return (
    <div className="fobs fobs--practice">
      <header className="fobs__header fobs__header--compact">
        <div className="fobs__header-actions fobs__header-actions--full">
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
          <input
            type="search"
            className="fobs__search"
            placeholder="搜索单词或释义..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="搜索熟词僻义"
          />
        </div>
      </header>

      <div className="fobs__list-filters" role="tablist" aria-label="练习筛选">
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
          待复习{reviewCount > 0 ? ` (${reviewCount})` : ""}
        </button>
      </div>

      <FamiliarObscurePractice
        entries={practiceEntries}
        title={getFamiliarObscureTitle()}
        stats={
          <>
            <span className="stat-pill stat-pill--ok">已掌握 {progress.masteredIds.length}</span>
            <span className="stat-pill stat-pill--fail">待复习 {reviewCount}</span>
          </>
        }
        scopeKey={practiceScopeKey}
        shuffle={shuffle}
        onToggleShuffle={() => setShuffle((value) => !value)}
        wordBankMap={wordBankMap}
        micGranted={micGranted}
        onProgressChange={refreshProgress}
        emptyMessage={
          listFilter === "review" ? "暂无待复习词条，答错会自动标记" : "没有匹配的词条，请调整搜索"
        }
      />

      <p className="fobs__footnote">
        编号 #{idBounds.min}–#{idBounds.max} · 用中文写出 SAT 僻义，Enter 提交 AI 批改
      </p>
    </div>
  );
}

export default memo(FamiliarObscureMeanings);
