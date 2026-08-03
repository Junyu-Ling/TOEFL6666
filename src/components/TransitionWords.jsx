import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  buildTransitionWordChoices,
  buildTransitionWordData,
  buildShuffledTransitionOrder,
  getTransitionWordEntries,
  getTransitionWordsTitle,
} from "../utils/transitionWords";
import {
  applyTransitionWordResult,
  filterTransitionReviewEntries,
  loadTransitionWordsProgress,
  patchTransitionWordsProgress,
  resolveTransitionSession,
  TW_PROGRESS_EVENT,
} from "../services/transitionWordsProgress";
import TransitionWordCard from "./TransitionWordCard";

function TransitionWordsPractice({
  entries,
  shuffle,
  onToggleShuffle,
  listFilter,
  progress,
  onProgressChange,
}) {
  const [localEntries] = useState(() => entries);
  const saved = useMemo(() => loadTransitionWordsProgress(), []);
  const initialSession = useMemo(
    () => resolveTransitionSession(localEntries.length, shuffle, { ...saved, shuffle }),
    [localEntries.length, shuffle, saved]
  );

  const [order, setOrder] = useState(() => initialSession.order);
  const [index, setIndex] = useState(() => initialSession.index);
  const [complete, setComplete] = useState(false);
  const prevShuffleRef = useRef(shuffle);
  const pendingResultRef = useRef(null);

  useLayoutEffect(() => {
    if (prevShuffleRef.current === shuffle) return;
    prevShuffleRef.current = shuffle;
    const nextOrder = shuffle
      ? buildShuffledTransitionOrder(localEntries.length)
      : localEntries.map((_, i) => i);
    setOrder(nextOrder);
    setIndex(0);
    setComplete(false);
    patchTransitionWordsProgress({ order: nextOrder, index: 0, shuffle });
  }, [shuffle, localEntries]);

  useEffect(() => {
    return () => {
      const pending = pendingResultRef.current;
      if (!pending) return;
      applyTransitionWordResult(pending.entryId, pending.aiResult);
    };
  }, []);

  useEffect(() => {
    if (complete) return;
    patchTransitionWordsProgress({ order, index, shuffle });
  }, [complete, index, order, shuffle]);

  const entry = localEntries[order[index]] ?? null;
  const currentWord = entry ? buildTransitionWordData(entry) : null;
  const choices = useMemo(
    () => (entry ? buildTransitionWordChoices(entry) : []),
    [entry]
  );
  const total = localEntries.length;
  const progressPct = total ? Math.round(((index + 1) / total) * 100) : 0;

  const handleResult = useCallback(
    (_wordData, aiResult) => {
      const entryId = _wordData?.transitionWord?.entryId;
      if (!entryId) return;
      pendingResultRef.current = { entryId, aiResult };
      applyTransitionWordResult(entryId, aiResult);
      pendingResultRef.current = null;
      onProgressChange?.();
    },
    [onProgressChange]
  );

  const restart = useCallback(() => {
    const nextOrder = shuffle
      ? buildShuffledTransitionOrder(localEntries.length)
      : localEntries.map((_, i) => i);
    setOrder(nextOrder);
    setIndex(0);
    setComplete(false);
    patchTransitionWordsProgress({ order: nextOrder, index: 0, shuffle });
  }, [localEntries, shuffle]);

  const handleNext = useCallback(() => {
    if (index >= total - 1) {
      setComplete(true);
      return;
    }
    setIndex((prev) => prev + 1);
  }, [index, total]);

  const handlePrev = useCallback(() => {
    setIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const stats = (
    <>
      <span className="practice-toolbar__stat">待复习 {progress.unknownIds.length}</span>
      <span className="practice-toolbar__stat practice-toolbar__stat--ok">
        已掌握 {progress.masteredIds.length}
      </span>
    </>
  );

  if (!total) {
    return (
      <div className="word-list-view__empty tw__empty">
        <span className="empty-icon">📋</span>
        <p>{listFilter === "review" ? "暂无待复习过渡词" : "暂无过渡词数据"}</p>
      </div>
    );
  }

  if (complete) {
    return (
      <section className="practice-view">
        <div className="practice-toolbar">
          <div className="practice-toolbar__left">
            <span className="practice-toolbar__title">{getTransitionWordsTitle()}</span>
          </div>
          {stats}
        </div>
        <div className="word-list-view__empty">
          <span className="empty-icon">🎉</span>
          <p>本轮练习完成，共 {total} 个过渡词。</p>
          <div className="fobs__quiz-actions">
            <button type="button" className="btn btn--primary" onClick={restart}>
              再来一轮
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="practice-view">
      <div className="practice-toolbar">
        <div className="practice-toolbar__left">
          <span className="practice-toolbar__title">{getTransitionWordsTitle()}</span>
          <button
            type="button"
            className={`btn btn--ghost btn--sm${shuffle ? " btn--toggle-on" : ""}`}
            onClick={onToggleShuffle}
            aria-pressed={shuffle}
          >
            {shuffle ? "乱序" : "顺序"}
          </button>
        </div>
        {stats}
      </div>

      <div className="progress-track" aria-label="学习进度">
        <div className="progress-track__fill" style={{ width: `${progressPct}%` }} />
      </div>
      <p className="progress-label">
        {total ? `${index + 1} / ${total}` : "0 / 0"}
      </p>

      {currentWord && choices.length ? (
        <TransitionWordCard
          key={`tw-${entry.id}-${index}`}
          tabId="transition-words"
          wordData={currentWord}
          choices={choices}
          onResult={handleResult}
          onNext={handleNext}
          onPrev={handlePrev}
        />
      ) : (
        <div className="word-list-view__empty">
          <span className="empty-icon">🎉</span>
          <p>本轮练习完成</p>
        </div>
      )}
    </section>
  );
}

function TransitionWords() {
  const entries = useMemo(() => getTransitionWordEntries(), []);
  const saved = useMemo(() => loadTransitionWordsProgress(), []);
  const [shuffle, setShuffle] = useState(saved.shuffle !== false);
  const [listFilter, setListFilter] = useState("all");
  const [progress, setProgress] = useState(() => loadTransitionWordsProgress());

  const refreshProgress = useCallback(() => {
    setProgress(loadTransitionWordsProgress());
  }, []);

  useEffect(() => {
    patchTransitionWordsProgress({ shuffle });
  }, [shuffle]);

  useEffect(() => {
    function onProgressChange() {
      refreshProgress();
    }
    window.addEventListener(TW_PROGRESS_EVENT, onProgressChange);
    return () => window.removeEventListener(TW_PROGRESS_EVENT, onProgressChange);
  }, [refreshProgress]);

  const practiceEntries = useMemo(() => {
    if (listFilter === "review") {
      return filterTransitionReviewEntries(entries, progress);
    }
    return entries;
  }, [entries, listFilter, progress]);

  return (
    <div className="tw">
      <div className="tw__control-bar">
        <div className="tw__control-top">
          <div className="tw__control-heading">
            <h2 className="tw__title">{getTransitionWordsTitle()}</h2>
            <p className="tw__subtitle">
              共 {entries.length} 个 · 四选一判断过渡词的逻辑关系
            </p>
          </div>
          <div className="tw__control-actions">
            <div className="tw__filter-tabs" role="tablist" aria-label="过渡词范围">
              <button
                type="button"
                role="tab"
                aria-selected={listFilter === "all"}
                className={`tw__filter-tab${listFilter === "all" ? " tw__filter-tab--active" : ""}`}
                onClick={() => setListFilter("all")}
              >
                全部
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={listFilter === "review"}
                className={`tw__filter-tab${listFilter === "review" ? " tw__filter-tab--active" : ""}`}
                onClick={() => setListFilter("review")}
              >
                待复习 {progress.unknownIds.length > 0 ? progress.unknownIds.length : ""}
              </button>
            </div>
          </div>
        </div>
      </div>

      <TransitionWordsPractice
        key={`${listFilter}-${practiceEntries.length}`}
        entries={practiceEntries}
        shuffle={shuffle}
        onToggleShuffle={() => setShuffle((prev) => !prev)}
        listFilter={listFilter}
        progress={progress}
        onProgressChange={refreshProgress}
      />
    </div>
  );
}

export default memo(TransitionWords);
