import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "../context/SettingsContext";
import { useIsActiveTab } from "../context/ActiveTabContext";
import { playAnswerSound } from "../utils/answerSounds";
import {
  loadSatVocabProgress,
  markSatVocabMastered,
  markSatVocabReview,
  patchSatVocabProgress,
  SAT_VOCAB_PROGRESS_EVENT,
} from "../services/satVocabProgress";
import rawWords from "../data/satVocab.json";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildOrder(words, isShuffled) {
  return isShuffled ? shuffle(words.map((_, i) => i)) : words.map((_, i) => i);
}

function SatVocabCard({ entry, onMastered, onReview, onNext, onPrev, tabId }) {
  const { speakWord, settings } = useSettings();
  const isActive = useIsActiveTab(tabId);
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;
  const [flipped, setFlipped] = useState(false);
  const [answered, setAnswered] = useState(false);
  const answeredRef = useRef(false);

  useEffect(() => {
    setFlipped(false);
    setAnswered(false);
    answeredRef.current = false;
  }, [entry?.id]);

  useEffect(() => {
    if (!settings.autoReadOnNewWord || !entry?.word) return undefined;
    const timer = window.setTimeout(() => {
      if (isActiveRef.current) speakWord(entry.word);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [entry?.word, settings.autoReadOnNewWord, speakWord]);

  useEffect(() => {
    if (!isActive) return undefined;
    function onKey(e) {
      if (e.key === "ArrowUp") { e.preventDefault(); onPrev?.(); return; }
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!flipped) { setFlipped(true); return; }
        if (!answered) return;
        onNext?.();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [isActive, flipped, answered, onNext, onPrev]);

  const handleMastered = useCallback(() => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    setAnswered(true);
    if (settings.answerSounds) {
      playAnswerSound(true, {
        correctId: settings.answerSoundCorrect,
        wrongId: settings.answerSoundWrong,
      });
    }
    onMastered?.(entry.id);
  }, [entry?.id, onMastered, settings]);

  const handleReview = useCallback(() => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    setAnswered(true);
    if (settings.answerSounds) {
      playAnswerSound(false, {
        correctId: settings.answerSoundCorrect,
        wrongId: settings.answerSoundWrong,
      });
    }
    onReview?.(entry.id);
  }, [entry?.id, onReview, settings]);

  if (!entry) return null;

  const colorClass = entry.color === "blue" ? "sv-card__word--blue" : "sv-card__word--black";

  return (
    <div className="sv-card-scene">
      <div className={`sv-card ${flipped ? "sv-card--flipped" : ""}`}>
        <div className="sv-card__front" onClick={() => setFlipped(true)}>
          <div className="sv-card__word-wrap">
            <h2 className={`sv-card__word ${colorClass}`}>{entry.word}</h2>
            <button
              type="button"
              className="flashcard__sound"
              onClick={(e) => { e.stopPropagation(); speakWord(entry.word); }}
              aria-label="播放发音"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            </button>
          </div>
          <p className="sv-card__tap-hint">点击翻转查看释义 · Enter</p>
        </div>

        <div className="sv-card__back">
          <div className="sv-card__word-wrap">
            <h2 className={`sv-card__word ${colorClass}`}>{entry.word}</h2>
            <button
              type="button"
              className="flashcard__sound"
              onClick={() => speakWord(entry.word)}
              aria-label="播放发音"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            </button>
          </div>
          <p className="sv-card__definition">{entry.definition}</p>

          {!answered ? (
            <div className="sv-card__actions">
              <button type="button" className="sv-card__btn sv-card__btn--review" onClick={handleReview}>
                不认识 → 生词本
              </button>
              <button type="button" className="sv-card__btn sv-card__btn--mastered" onClick={handleMastered}>
                认识 → 熟词本
              </button>
            </div>
          ) : (
            <div className="sv-card__answered">
              <button type="button" className="btn btn--primary flashcard__next" onClick={onNext}>
                下一个
              </button>
              <p className="flashcard__footer flashcard__footer--back">Enter 下一个 · ↑↓ 切词</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SatVocab() {
  const isActive = useIsActiveTab("sat-vocab");
  const [progress, setProgress] = useState(() => loadSatVocabProgress());
  const [isShuffle, setIsShuffle] = useState(() => loadSatVocabProgress().shuffle);
  const [listFilter, setListFilter] = useState("all");
  const [query, setQuery] = useState("");

  const refreshProgress = useCallback(() => {
    setProgress(loadSatVocabProgress());
  }, []);

  useEffect(() => {
    window.addEventListener(SAT_VOCAB_PROGRESS_EVENT, refreshProgress);
    return () => window.removeEventListener(SAT_VOCAB_PROGRESS_EVENT, refreshProgress);
  }, [refreshProgress]);

  useEffect(() => {
    if (isActive) refreshProgress();
  }, [isActive, refreshProgress]);

  const filteredWords = useMemo(() => {
    let base = rawWords;
    if (listFilter === "review") {
      base = base.filter((w) => progress.reviewIds.includes(w.id));
    } else if (listFilter === "mastered") {
      base = base.filter((w) => progress.masteredIds.includes(w.id));
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      base = base.filter(
        (w) => w.word.toLowerCase().includes(q) || w.definition.toLowerCase().includes(q)
      );
    }
    return base;
  }, [listFilter, progress, query]);

  const [order, setOrder] = useState(() => buildOrder(filteredWords, isShuffle));
  const [index, setIndex] = useState(0);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    setOrder(buildOrder(filteredWords, isShuffle));
    setIndex(0);
    setComplete(false);
  }, [filteredWords, isShuffle]);

  const entry = filteredWords[order[index]] ?? null;
  const total = filteredWords.length;

  const handleMastered = useCallback((id) => {
    markSatVocabMastered(id);
  }, []);

  const handleReview = useCallback((id) => {
    markSatVocabReview(id);
  }, []);

  const handleNext = useCallback(() => {
    if (index >= total - 1) { setComplete(true); return; }
    setIndex((i) => i + 1);
  }, [index, total]);

  const handlePrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
    setComplete(false);
  }, []);

  const restart = useCallback(() => {
    setOrder(buildOrder(filteredWords, isShuffle));
    setIndex(0);
    setComplete(false);
  }, [filteredWords, isShuffle]);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => {
      patchSatVocabProgress({ shuffle: !prev });
      return !prev;
    });
  }, []);

  const progress_pct = total ? Math.round(((index + 1) / total) * 100) : 0;
  const masteredCount = progress.masteredIds.length;
  const reviewCount = progress.reviewIds.length;

  return (
    <div className="sv">
      <div className="sv__control-bar">
        <div className="sv__control-top">
          <div className="sv__heading">
            <h2 className="sv__title">SAT 词汇题</h2>
            <p className="sv__subtitle">共 {rawWords.length} 词 · 已掌握 {masteredCount} · 待复习 {reviewCount}</p>
          </div>
          <div className="sv__control-actions">
            <input
              type="search"
              className="sv__search"
              placeholder="搜索单词或释义…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="搜索SAT词汇"
            />
            <div className="sv__filter-tabs" role="tablist">
              {[
                { id: "all", label: "全部" },
                { id: "review", label: `生词本 ${reviewCount || ""}` },
                { id: "mastered", label: `熟词本 ${masteredCount || ""}` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={listFilter === tab.id}
                  className={`sv__filter-tab${listFilter === tab.id ? " sv__filter-tab--active" : ""}`}
                  onClick={() => setListFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {complete || total === 0 ? (
        <section className="practice-view">
          <div className="word-list-view__empty">
            <span className="empty-icon">{total === 0 ? "📋" : "🎉"}</span>
            <p>{total === 0 ? "当前筛选无词条" : `本轮练习完成，共 ${total} 词`}</p>
            {total > 0 && (
              <button type="button" className="btn btn--primary" onClick={restart} style={{ marginTop: "0.75rem" }}>
                再来一轮
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className="practice-view">
          <div className="practice-toolbar">
            <div className="practice-toolbar__left">
              <span className="practice-toolbar__title">SAT 词汇题</span>
              <button
                type="button"
                className={`btn btn--ghost btn--sm${isShuffle ? " btn--toggle-on" : ""}`}
                onClick={toggleShuffle}
                aria-pressed={isShuffle}
              >
                {isShuffle ? "乱序" : "顺序"}
              </button>
            </div>
            <span className="practice-toolbar__stat">已掌握 {masteredCount}</span>
            <span className="practice-toolbar__stat practice-toolbar__stat--fail">待复习 {reviewCount}</span>
          </div>

          <div className="progress-track" aria-label="学习进度">
            <div className="progress-track__fill" style={{ width: `${progress_pct}%` }} />
          </div>
          <p className="progress-label">{`${index + 1} / ${total}`}</p>

          <SatVocabCard
            key={`sv-${entry?.id}-${index}`}
            entry={entry}
            tabId="sat-vocab"
            onMastered={handleMastered}
            onReview={handleReview}
            onNext={handleNext}
            onPrev={handlePrev}
          />
        </section>
      )}
    </div>
  );
}

export default memo(SatVocab);
