import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState, useEffect } from "react";
import { useSettings } from "../context/SettingsContext";
import PracticeSession from "./PracticeSession";
import {
  buildFamiliarObscureWordData,
  filterFamiliarObscureEntries,
  getFamiliarObscureEntries,
  getFamiliarObscureTitle,
} from "../utils/familiarObscureMeanings";
import {
  buildShuffledOrder,
  loadFamiliarObscureProgress,
  patchFamiliarObscureProgress,
} from "../services/familiarObscureProgress";

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

function EntryDetail({ entry, onBack, onSpeak }) {
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

function FamiliarObscureQuiz({ entries, onExit, wordBankMap, micGranted }) {
  const saved = useMemo(() => loadFamiliarObscureProgress(), []);
  const [order, setOrder] = useState(() => {
    if (saved.quizOrder.length === entries.length) return saved.quizOrder;
    return buildShuffledOrder(entries.length);
  });
  const [index, setIndex] = useState(() =>
    Math.max(0, Math.min(saved.quizIndex ?? 0, Math.max(entries.length - 1, 0)))
  );
  const [complete, setComplete] = useState(false);

  const entry = entries[order[index]] ?? null;
  const currentWord = entry ? buildFamiliarObscureWordData(entry) : null;
  const total = entries.length;

  useEffect(() => {
    if (!complete) {
      patchFamiliarObscureProgress({ quizIndex: index, quizOrder: order });
    }
  }, [complete, index, order]);

  const handleResult = useCallback((_wordData, aiResult) => {
    if (!aiResult?.is_correct) return;
    const entryId = _wordData?.familiarObscure?.entryId;
    if (!entryId) return;
    const savedProgress = loadFamiliarObscureProgress();
    const masteredIds = new Set(savedProgress.masteredIds);
    masteredIds.add(entryId);
    patchFamiliarObscureProgress({ masteredIds: [...masteredIds] });
  }, []);

  const restartQuiz = useCallback(() => {
    const nextOrder = buildShuffledOrder(entries.length);
    setOrder(nextOrder);
    setIndex(0);
    setComplete(false);
    patchFamiliarObscureProgress({ quizIndex: 0, quizOrder: nextOrder });
  }, [entries.length]);

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

  if (complete) {
    return (
      <section className="practice-view">
        <div className="practice-toolbar">
          <div className="practice-toolbar__left">
            <span className="practice-toolbar__title">僻义测试</span>
          </div>
        </div>
        <div className="word-list-view__empty">
          <span className="empty-icon">🎉</span>
          <p>本轮测试完成，共 {total} 词。</p>
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
      title="僻义测试"
      toolbarExtra={
        <div className="fobs__quiz-toolbar">
          <button type="button" className="btn btn--ghost btn--sm" onClick={restartQuiz}>
            打乱重测
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onExit}>
            返回词表
          </button>
        </div>
      }
      stats={<span className="stat-pill">SAT 僻义</span>}
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
  const [panelMode, setPanelMode] = useState("browse");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [masteredCount, setMasteredCount] = useState(
    () => loadFamiliarObscureProgress().masteredIds.length
  );
  const listScrollY = useRef(0);
  const restoreListScroll = useRef(false);

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

  if (panelMode === "quiz") {
    return (
      <FamiliarObscureQuiz
        entries={entries}
        wordBankMap={wordBankMap}
        micGranted={micGranted}
        onExit={() => {
          setMasteredCount(loadFamiliarObscureProgress().masteredIds.length);
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
            共 {entries.length} 词 · 已掌握 {masteredCount} 词 · 点击卡片查看详情
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
                setPanelMode("quiz");
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
              className="fobs__card"
              onClick={() => openEntry(entry.id)}
            >
              <span className="fobs__card-id">#{entry.id}</span>
              <strong className="fobs__card-word">{entry.word}</strong>
              <p className="fobs__card-common">{entry.commonMeaning || "—"}</p>
              <p className="fobs__card-hint">点击查看 SAT 僻义与记忆方法</p>
              <MemoryTipBlock text={entry.memoryTip} compact />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(FamiliarObscureMeanings);
