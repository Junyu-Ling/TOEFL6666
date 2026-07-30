import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState, useEffect } from "react";
import { useSettings } from "../context/SettingsContext";
import PracticeSession from "./PracticeSession";
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
  loadFamiliarObscureProgress,
  patchFamiliarObscureProgress,
} from "../services/familiarObscureProgress";

function ReviewTag({ compact = false }) {
  return (
    <span className={`fobs__tag fobs__tag--review${compact ? " fobs__tag--compact" : ""}`}>待复习</span>
  );
}

function MemoryTipBlock({ text, compact = false }) {
  if (!text) {
    return <p className="fobs__empty-tip">暂无记忆方法</p>;
  }
  return (
    <div className={`fobs__memory${compact ? " fobs__memory--compact" : ""}`}>
      <span className="fobs__memory-label">记忆方法</span>
      <p className="fobs__memory-text">{text}</p>
    </div>
  );
}

function EntryDetail({ entry, onBack, onSpeak, needsReview }) {
  return (
    <article className="fobs__detail">
      <header className="fobs__detail-header">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onBack}>
          返回列表
        </button>
        <div className="fobs__detail-title-wrap">
          <span className="fobs__detail-id">#{entry.id}</span>
          <button type="button" className="fobs__detail-word" onClick={() => onSpeak?.(entry.word)}>
            {entry.word}
          </button>
          {needsReview ? <ReviewTag /> : null}
        </div>
      </header>

      <section className="fobs__detail-section">
        <h3 className="fobs__section-label">常见释义</h3>
        <p className="fobs__section-body">{entry.commonMeaning || "—"}</p>
      </section>

      <section className="fobs__detail-section fobs__detail-section--accent">
        <h3 className="fobs__section-label">SAT 僻义</h3>
        <p className="fobs__section-body">{entry.obscureMeaning || "—"}</p>
      </section>

      {(entry.exampleEn || entry.exampleZh) && (
        <section className="fobs__detail-section">
          <h3 className="fobs__section-label">例句</h3>
          {entry.exampleEn ? <p className="fobs__example-en">{entry.exampleEn}</p> : null}
          {entry.exampleZh ? <p className="fobs__example-zh">{entry.exampleZh}</p> : null}
        </section>
      )}

      <MemoryTipBlock text={entry.memoryTip} />
    </article>
  );
}

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
          返回词表
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

function FamiliarObscureQuiz({ entries, scope, onExit, onProgressChange, wordBankMap, micGranted }) {
  const scopeKey = useMemo(() => buildQuizScopeKey(scope, entries.length), [scope, entries.length]);
  const saved = useMemo(() => loadFamiliarObscureProgress(), []);
  const [order, setOrder] = useState(() => {
    if (saved.quizScopeKey === scopeKey && saved.quizOrder.length === entries.length) {
      return saved.quizOrder;
    }
    return buildShuffledOrder(entries.length);
  });
  const [index, setIndex] = useState(() => {
    if (saved.quizScopeKey !== scopeKey) return 0;
    return Math.max(0, Math.min(saved.quizIndex ?? 0, Math.max(entries.length - 1, 0)));
  });
  const [complete, setComplete] = useState(false);

  const entry = entries[order[index]] ?? null;
  const currentWord = entry ? buildFamiliarObscureWordData(entry) : null;
  const total = entries.length;

  useEffect(() => {
    patchFamiliarObscureProgress({ quizScopeKey: scopeKey, lastScope: scope });
  }, [scope, scopeKey]);

  useEffect(() => {
    if (!complete) {
      patchFamiliarObscureProgress({ quizIndex: index, quizOrder: order, quizScopeKey: scopeKey });
    }
  }, [complete, index, order, scopeKey]);

  const handleResult = useCallback(
    (_wordData, aiResult) => {
      const entryId = _wordData?.familiarObscure?.entryId;
      if (!entryId) return;
      applyFamiliarObscureQuizResult(entryId, aiResult);
      onProgressChange?.();
    },
    [onProgressChange]
  );

  const restartQuiz = useCallback(() => {
    const nextOrder = buildShuffledOrder(entries.length);
    setOrder(nextOrder);
    setIndex(0);
    setComplete(false);
    patchFamiliarObscureProgress({ quizIndex: 0, quizOrder: nextOrder, quizScopeKey: scopeKey });
  }, [entries.length, scopeKey]);

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

  const scopeLabel = `#${Math.min(scope.fromId, scope.toId)}–#${Math.max(scope.fromId, scope.toId)}`;

  if (complete) {
    return (
      <section className="practice-view">
        <div className="practice-toolbar">
          <div className="practice-toolbar__left">
            <span className="practice-toolbar__title">僻义测试 · {scopeLabel}</span>
          </div>
        </div>
        <div className="word-list-view__empty">
          <span className="empty-icon">🎉</span>
          <p>本轮测试完成，共 {total} 词。不认识的词已在词表标记「待复习」。</p>
          <div className="fobs__quiz-actions">
            <button type="button" className="btn btn--primary" onClick={restartQuiz}>
              重新测试
            </button>
            <button type="button" className="btn btn--ghost" onClick={onExit}>
              返回词表
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <PracticeSession
      tabId="familiar-obscure"
      title={`僻义测试 · ${scopeLabel}`}
      toolbarExtra={
        <>
          <button type="button" className="btn btn--ghost btn--sm" onClick={restartQuiz}>
            打乱重测
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onExit}>
            返回词表
          </button>
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
      sessionKey={`fobs-${entry?.id ?? "empty"}-${index}`}
      emptyMessage="本轮测试完成"
    />
  );
}

function FamiliarObscureMeanings({ wordBankMap, micGranted }) {
  const { speakWord } = useSettings();
  const entries = useMemo(() => getFamiliarObscureEntries(), []);
  const idBounds = useMemo(() => getFamiliarObscureIdBounds(entries), [entries]);
  const [panelMode, setPanelMode] = useState("browse");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [quizScope, setQuizScope] = useState(() => createDefaultQuizScope(entries));
  const [quizEntries, setQuizEntries] = useState([]);
  const [progress, setProgress] = useState(() => loadFamiliarObscureProgress());
  const listScrollY = useRef(0);
  const restoreListScroll = useRef(false);

  const refreshProgress = useCallback(() => {
    setProgress(loadFamiliarObscureProgress());
  }, []);

  const unknownSet = useMemo(() => new Set(progress.unknownIds), [progress.unknownIds]);
  const filtered = useMemo(() => filterFamiliarObscureEntries(entries, query), [entries, query]);
  const selected = useMemo(
    () => entries.find((entry) => entry.id === selectedId) ?? null,
    [entries, selectedId]
  );

  const openEntry = useCallback((id) => {
    listScrollY.current = window.scrollY;
    setSelectedId(id);
  }, []);

  const closeEntry = useCallback(() => {
    restoreListScroll.current = true;
    setSelectedId(null);
  }, []);

  const startQuiz = useCallback((scope, scopedEntries) => {
    setQuizScope(scope);
    setQuizEntries(scopedEntries);
    setPanelMode("quiz");
  }, []);

  useLayoutEffect(() => {
    if (selectedId) {
      window.scrollTo(0, 0);
      return;
    }
    if (panelMode === "browse" && restoreListScroll.current) {
      restoreListScroll.current = false;
      window.scrollTo(0, listScrollY.current);
    }
  }, [selectedId, panelMode]);

  if (panelMode === "quiz-setup") {
    return (
      <FamiliarObscureQuizSetup
        entries={entries}
        onBack={() => {
          restoreListScroll.current = true;
          setPanelMode("browse");
        }}
        onStart={startQuiz}
      />
    );
  }

  if (panelMode === "quiz") {
    return (
      <FamiliarObscureQuiz
        entries={quizEntries}
        scope={quizScope}
        wordBankMap={wordBankMap}
        micGranted={micGranted}
        onProgressChange={refreshProgress}
        onExit={() => {
          refreshProgress();
          restoreListScroll.current = true;
          setPanelMode("browse");
        }}
      />
    );
  }

  if (selected) {
    return (
      <EntryDetail
        entry={selected}
        needsReview={unknownSet.has(selected.id)}
        onBack={closeEntry}
        onSpeak={speakWord}
      />
    );
  }

  return (
    <div className="fobs">
      <header className="fobs__header">
        <div>
          <h2 className="fobs__title">{getFamiliarObscureTitle()}</h2>
          <p className="fobs__subtitle">
            共 {entries.length} 词 · 已掌握 {progress.masteredIds.length} 词 · 待复习{" "}
            {progress.unknownIds.length} 词 · 点击卡片查看详情
          </p>
        </div>
        <div className="fobs__header-actions">
          <div className="fobs__mode-tabs" role="tablist" aria-label="熟词僻义模式">
            <button type="button" className="fobs__mode-tab fobs__mode-tab--active" role="tab" aria-selected>
              词表
            </button>
            <button
              type="button"
              className="fobs__mode-tab"
              role="tab"
              aria-selected={false}
              onClick={() => {
                listScrollY.current = window.scrollY;
                setPanelMode("quiz-setup");
              }}
            >
              僻义测试
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

      {filtered.length === 0 ? (
        <p className="fobs__empty">没有匹配的词条</p>
      ) : (
        <div className="fobs__grid">
          {filtered.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`fobs__card${unknownSet.has(entry.id) ? " fobs__card--review" : ""}`}
              onClick={() => openEntry(entry.id)}
            >
              <div className="fobs__card-top">
                <span className="fobs__card-id">#{entry.id}</span>
                {unknownSet.has(entry.id) ? <ReviewTag compact /> : null}
              </div>
              <strong className="fobs__card-word">{entry.word}</strong>
              <p className="fobs__card-common">{entry.commonMeaning || "—"}</p>
              <p className="fobs__card-hint">点击查看 SAT 僻义与记忆方法</p>
              <MemoryTipBlock text={entry.memoryTip} compact />
            </button>
          ))}
        </div>
      )}

      <p className="fobs__footnote">
        编号范围 #{idBounds.min}–#{idBounds.max} · 测试中不认识的词会自动标记「待复习」
      </p>
    </div>
  );
}

export default memo(FamiliarObscureMeanings);
