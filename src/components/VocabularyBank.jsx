import { memo, useMemo, useState, useDeferredValue, useEffect, useRef, useCallback } from "react";
import {
  BANK_SORT_OPTIONS,
  BANK_VIEW_OPTIONS,
  filterBankWords,
  filterBankFamilyWords,
  sortBankWords,
  groupBankWords,
  groupBankFamilyWords,
  getBankWordLabel,
  getWordFamilyStats,
  isEnglishWordQuery,
  isWordInBank,
} from "../utils/vocabularyBank";
import PronunciationAlert from "./PronunciationAlert";
import { getPronunciationAlert, getIrregularPronunciationStats } from "../utils/pronunciationAlert";
import { lookupWordDefinitions } from "../services/wordLookup";

function BankWordItem({ item, availableLists, bookStatus, compact = false }) {
  const listLabel = compact ? "" : getBankWordLabel(item, availableLists);
  const pronunciationAlert = getPronunciationAlert(item.word);

  return (
    <article className={`word-item word-item--bank${compact ? " word-item--bank-compact" : ""}`}>
      <div className="word-item__main">
        <div className="word-item__left">
          <div className="word-item__title-row">
            <h3 className="word-item__word">{item.word}</h3>
            {listLabel && <span className="word-item__list-badge">{listLabel}</span>}
            {bookStatus === "unrecognized" && (
              <span className="word-item__wrong-count">生词</span>
            )}
            {bookStatus === "recognized" && (
              <span className="word-item__wrong-count word-item__wrong-count--past">熟词</span>
            )}
          </div>
          <p className="word-item__defs">{item.definitions?.join(" · ")}</p>
          {!compact && (
            <PronunciationAlert alert={pronunciationAlert} className="word-item__pronunciation-alert" />
          )}
        </div>
      </div>
    </article>
  );
}

function BankGroupSection({ group, availableLists, bookStatusByWord }) {
  const [open, setOpen] = useState(true);

  return (
    <section className="word-list-group">
      <button
        type="button"
        className="word-list-group__header"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="word-list-group__title">{group.label}</span>
        <span className="word-list-group__meta">{group.words.length} 词</span>
        <span className="word-list-group__chevron" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <div className="word-list-group__items">
          {group.words.map((item) => (
            <BankWordItem
              key={item.word}
              item={item}
              availableLists={availableLists}
              bookStatus={bookStatusByWord.get(item.word)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function BankFamilySection({ group, availableLists, bookStatusByWord }) {
  const [open, setOpen] = useState(true);

  return (
    <section className="word-list-group word-list-group--family">
      <button
        type="button"
        className="word-list-group__header"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="word-list-group__title">
          <span className="word-list-group__family-root">{group.root}</span>
          <span className="word-list-group__family-forms">{group.label}</span>
        </span>
        <span className="word-list-group__meta">{group.words.length} 词</span>
        <span className="word-list-group__chevron" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <div className="word-list-group__items">
          {group.words.map((item) => (
            <BankWordItem
              key={item.word}
              item={item}
              availableLists={availableLists}
              bookStatus={bookStatusByWord.get(item.word)}
              compact
            />
          ))}
        </div>
      )}
    </section>
  );
}

function VocabularyBank({
  words,
  availableLists,
  wordListIndex,
  recognizedSet,
  unrecognizedSet,
  bankSession,
  bankPracticePaused,
  onResumePractice,
  reviewShuffle,
  onToggleShuffle,
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [sortMode, setSortMode] = useState("level-list");
  const [viewMode, setViewMode] = useState("all");
  const [aiLookup, setAiLookup] = useState(null);
  const [aiLookupLoading, setAiLookupLoading] = useState(false);
  const [aiLookupError, setAiLookupError] = useState(null);
  const lookupAbortRef = useRef(null);
  const isSearchPending = query !== deferredQuery;

  const irregularStats = useMemo(() => getIrregularPronunciationStats(), []);
  const familyStats = useMemo(() => getWordFamilyStats(), []);

  const bookStatusByWord = useMemo(() => {
    const map = new Map();
    for (const word of unrecognizedSet) map.set(word, "unrecognized");
    for (const word of recognizedSet) {
      if (!map.has(word)) map.set(word, "recognized");
    }
    return map;
  }, [recognizedSet, unrecognizedSet]);

  const displayedWords = useMemo(() => {
    let filtered = words;
    if (viewMode === "irregular-pronunciation") {
      filtered = words.filter((item) => getPronunciationAlert(item.word));
    } else if (viewMode === "word-family") {
      filtered = filterBankFamilyWords(words);
    }
    filtered = filterBankWords(filtered, deferredQuery);
    return sortBankWords(filtered, sortMode, availableLists);
  }, [words, deferredQuery, sortMode, viewMode, availableLists]);

  const groupedWords = useMemo(
    () => groupBankWords(displayedWords, sortMode, availableLists, wordListIndex),
    [displayedWords, sortMode, availableLists, wordListIndex]
  );

  const familyGroups = useMemo(() => {
    if (viewMode !== "word-family") return null;
    return groupBankFamilyWords(displayedWords);
  }, [displayedWords, viewMode]);

  const isFiltering = query.trim().length > 0;
  const searchTerm = deferredQuery.trim();
  const canAiLookup =
    isFiltering &&
    displayedWords.length === 0 &&
    isEnglishWordQuery(searchTerm) &&
    !isWordInBank(words, searchTerm);
  const isSpecialView = viewMode === "irregular-pronunciation";
  const isFamilyView = viewMode === "word-family";

  useEffect(() => {
    lookupAbortRef.current?.abort();
    lookupAbortRef.current = null;
    setAiLookup(null);
    setAiLookupError(null);
    setAiLookupLoading(false);
  }, [searchTerm, viewMode]);

  const handleAiLookup = useCallback(async () => {
    if (!canAiLookup || aiLookupLoading) return;

    lookupAbortRef.current?.abort();
    const controller = new AbortController();
    lookupAbortRef.current = controller;

    setAiLookupLoading(true);
    setAiLookupError(null);
    setAiLookup(null);

    try {
      const result = await lookupWordDefinitions(searchTerm, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setAiLookup(result);
    } catch (err) {
      if (err?.name === "AbortError" || controller.signal.aborted) return;
      setAiLookupError(err.message || "AI 查词失败，请稍后重试");
    } finally {
      if (lookupAbortRef.current === controller) {
        lookupAbortRef.current = null;
      }
      if (!controller.signal.aborted) {
        setAiLookupLoading(false);
      }
    }
  }, [aiLookupLoading, canAiLookup, searchTerm]);
  const practiceLabel =
    bankSession && bankPracticePaused
      ? `继续练习（${bankSession.index + 1}/${bankSession.queue.length}）`
      : `开始练习（${displayedWords.length}）`;

  return (
    <div className="word-list-view vocabulary-bank">
      <header className="word-list-view__header">
        <div>
          <h2>词库</h2>
          <p>
            {isFamilyView
              ? `词族 ${familyGroups?.length ?? 0} 组 · 显示 ${displayedWords.length} 词（全库 ${familyStats.familyCount} 组 / ${familyStats.memberCount} 词）`
              : isSpecialView
                ? `特殊发音 ${displayedWords.length} 个（已扫描词库 ${irregularStats.totalWords} 词）`
                : isFiltering || sortMode !== "level-list"
                  ? `显示 ${displayedWords.length} / ${words.length} 个`
                  : `共 ${words.length} 个单词 · 网站全部词书 · 特殊发音 ${irregularStats.count} 个 · 词族 ${familyStats.familyCount} 组`}
          </p>
        </div>
        <div className="word-list-view__header-actions">
          <button
            type="button"
            className={`btn btn--ghost btn--sm ${reviewShuffle ? "btn--toggle-on" : ""}`}
            onClick={onToggleShuffle}
            aria-pressed={reviewShuffle}
          >
            {reviewShuffle ? "乱序" : "顺序"}
          </button>
          <button
            type="button"
            className="btn btn--accent"
            onClick={() => onResumePractice(displayedWords)}
            disabled={displayedWords.length === 0}
          >
            {practiceLabel}
          </button>
        </div>
      </header>

      <div className="word-list-view__toolbar vocabulary-bank__toolbar">
        <input
          className={`word-list-view__search${isSearchPending ? " word-list-view__search--pending" : ""}`}
          type="search"
          placeholder={
            isFamilyView
              ? "在词族中搜索单词或释义…"
              : isSpecialView
                ? "在特殊发音列表中搜索…"
                : "搜索单词或释义…"
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="搜索单词"
        />
        <select
          className="word-list-view__sort"
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value)}
          aria-label="词库视图"
        >
          {BANK_VIEW_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className="word-list-view__sort"
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value)}
          aria-label="排序方式"
          disabled={isFamilyView}
        >
          {BANK_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {displayedWords.length === 0 ? (
        <div className="word-list-view__empty vocabulary-bank__empty">
          <span className="empty-icon">{isFamilyView ? "🌿" : isSpecialView ? "🔊" : "🔍"}</span>
          {canAiLookup ? (
            <>
              <p>
                词库中未找到 <strong>{searchTerm}</strong>
              </p>
              {!aiLookup && !aiLookupLoading && (
                <div className="vocabulary-bank__ai-lookup">
                  <p className="vocabulary-bank__ai-lookup-hint">是否使用 AI 查询该词的中文释义？</p>
                  <button
                    type="button"
                    className="btn btn--accent btn--sm"
                    onClick={handleAiLookup}
                  >
                    用 AI 查询
                  </button>
                </div>
              )}
            </>
          ) : (
            <p>
              {isFamilyView
                ? "没有匹配的词族单词"
                : isSpecialView
                  ? "没有匹配的特殊发音单词"
                  : "没有匹配的单词"}
            </p>
          )}
          {aiLookupLoading && (
            <p className="vocabulary-bank__ai-lookup-status">
              <span className="spinner" aria-hidden />
              AI 正在查询释义…
            </p>
          )}
          {aiLookupError && <p className="vocabulary-bank__ai-lookup-error">{aiLookupError}</p>}
          {aiLookup && (
            <article className="word-item word-item--bank word-item--ai-lookup">
              <div className="word-item__main">
                <div className="word-item__left">
                  <div className="word-item__title-row">
                    <h3 className="word-item__word">{aiLookup.word}</h3>
                    <span className="word-item__list-badge word-item__list-badge--ai">AI 释义</span>
                  </div>
                  <p className="word-item__defs">{aiLookup.definitions.join(" · ")}</p>
                  <PronunciationAlert
                    alert={getPronunciationAlert(aiLookup.word)}
                    className="word-item__pronunciation-alert"
                  />
                </div>
              </div>
            </article>
          )}
        </div>
      ) : isFamilyView && familyGroups ? (
        <div className="word-list word-list--grouped word-list--families">
          {familyGroups.map((group) => (
            <BankFamilySection
              key={group.root}
              group={group}
              availableLists={availableLists}
              bookStatusByWord={bookStatusByWord}
            />
          ))}
        </div>
      ) : groupedWords ? (
        <div className="word-list word-list--grouped">
          {groupedWords.map((group) => (
            <BankGroupSection
              key={group.listId}
              group={group}
              availableLists={availableLists}
              bookStatusByWord={bookStatusByWord}
            />
          ))}
        </div>
      ) : (
        <div className="word-list">
          {displayedWords.map((item) => (
            <BankWordItem
              key={item.word}
              item={item}
              availableLists={availableLists}
              bookStatus={bookStatusByWord.get(item.word)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(VocabularyBank);
