import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsActiveTab } from "../context/ActiveTabContext";
import PracticeSession from "./PracticeSession";
import {
  loadSatVocabProgress,
  markSatVocabMastered,
  markSatVocabReview,
  patchSatVocabProgress,
  SAT_VOCAB_PROGRESS_EVENT,
} from "../services/satVocabProgress";
import levelListWords from "../data/satVocab.json";
import jingJingWords from "../data/satVocabJingJing.json";

function buildWordData(entry) {
  return {
    word: entry.word,
    definitions: [entry.definition],
    satVocab: { id: entry.id, color: entry.color || "black" },
  };
}

function shuffleOrder(len) {
  const arr = Array.from({ length: len }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildOrder(words, isShuffled) {
  return isShuffled ? shuffleOrder(words.length) : words.map((_, i) => i);
}

function SatVocab({ wordBankMap, micGranted }) {
  const isActive = useIsActiveTab("sat-vocab");
  const [progress, setProgress] = useState(() => loadSatVocabProgress());
  const [isShuffle, setIsShuffle] = useState(() => loadSatVocabProgress().shuffle);
  const [listFilter, setListFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [dataSource, setDataSource] = useState("level-list");
  const [selectedYear, setSelectedYear] = useState("2023");

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

  const rawWords = useMemo(() => {
    if (dataSource === "level-list") {
      return levelListWords;
    } else {
      return jingJingWords[selectedYear] || [];
    }
  }, [dataSource, selectedYear]);

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
  }, [rawWords, listFilter, progress, query]);

  const [order, setOrder] = useState(() => buildOrder(filteredWords, isShuffle));
  const [index, setIndex] = useState(0);
  const [complete, setComplete] = useState(false);
  const prevFilterKey = useRef(`${listFilter}-${filteredWords.length}`);

  useEffect(() => {
    const key = `${listFilter}-${filteredWords.length}`;
    if (prevFilterKey.current === key) return;
    prevFilterKey.current = key;
    setOrder(buildOrder(filteredWords, isShuffle));
    setIndex(0);
    setComplete(false);
  }, [filteredWords, isShuffle, listFilter]);

  const entry = filteredWords[order[index]] ?? null;
  const currentWord = entry ? buildWordData(entry) : null;
  const total = filteredWords.length;

  const handleResult = useCallback((_wordData, aiResult) => {
    const id = _wordData?.satVocab?.id;
    if (!id) return;
    if (aiResult.is_correct) {
      markSatVocabMastered(id);
    } else {
      markSatVocabReview(id);
    }
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

  const masteredCount = progress.masteredIds.length;
  const reviewCount = progress.reviewIds.length;

  const stats = (
    <>
      <span className="practice-toolbar__stat">待复习 {reviewCount}</span>
      <span className="practice-toolbar__stat practice-toolbar__stat--ok">已掌握 {masteredCount}</span>
    </>
  );

  return (
    <div className="sv">
      <div className="sv__control-bar">
        <div className="sv__control-top">
          <div className="sv__heading">
            <h2 className="sv__title">SAT 词汇题</h2>
            <p className="sv__subtitle">共 {rawWords.length} 词 · 已掌握 {masteredCount} · 待复习 {reviewCount}</p>
          </div>
          <div className="sv__control-actions">
            <div className="sv__data-source-selector">
              <select
                className="sv__select"
                value={dataSource}
                onChange={(e) => setDataSource(e.target.value)}
                aria-label="选择数据源"
              >
                <option value="level-list">Level·List 单词书</option>
                <option value="jing-jing">SAT 鸡精词汇</option>
              </select>
              {dataSource === "jing-jing" && (
                <select
                  className="sv__select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  aria-label="选择年份"
                >
                  <option value="2023">2023年</option>
                  <option value="2024">2024年</option>
                  <option value="2025">2025年</option>
                  <option value="2026">2026年</option>
                </select>
              )}
            </div>
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
                { id: "review", label: `生词本 ${reviewCount || ""}`.trim() },
                { id: "mastered", label: `熟词本 ${masteredCount || ""}`.trim() },
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
        <div className="word-list-view__empty sv__empty">
          <span className="empty-icon">{total === 0 ? "📋" : "🎉"}</span>
          <p>{total === 0 ? "当前筛选无词条" : `本轮练习完成，共 ${total} 词`}</p>
          {total > 0 && (
            <button type="button" className="btn btn--primary" onClick={restart} style={{ marginTop: "0.75rem" }}>
              再来一轮
            </button>
          )}
        </div>
      ) : (
        <PracticeSession
          tabId="sat-vocab"
          title="SAT 词汇题"
          stats={stats}
          toolbarExtra={
            <button
              type="button"
              className={`btn btn--ghost btn--sm${isShuffle ? " btn--toggle-on" : ""}`}
              onClick={toggleShuffle}
              aria-pressed={isShuffle}
            >
              {isShuffle ? "乱序" : "顺序"}
            </button>
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
          sessionKey={`sv-${entry?.id}-${index}`}
          emptyMessage="本轮练习完成"
        />
      )}
    </div>
  );
}

export default memo(SatVocab);
