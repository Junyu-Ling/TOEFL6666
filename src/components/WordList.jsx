import { useMemo, useState } from "react";

const SORT_OPTIONS = [
  { value: "default", label: "默认顺序" },
  { value: "wrong-desc", label: "错误次数 ↓" },
  { value: "wrong-asc", label: "错误次数 ↑" },
  { value: "alpha-asc", label: "字母 A→Z" },
  { value: "alpha-desc", label: "字母 Z→A" },
];

function sortWords(words, sortMode) {
  const list = [...words];
  switch (sortMode) {
    case "wrong-desc":
      return list.sort((a, b) => (b.wrongCount ?? 0) - (a.wrongCount ?? 0));
    case "wrong-asc":
      return list.sort((a, b) => (a.wrongCount ?? 0) - (b.wrongCount ?? 0));
    case "alpha-asc":
      return list.sort((a, b) => a.word.localeCompare(b.word, "en"));
    case "alpha-desc":
      return list.sort((a, b) => b.word.localeCompare(a.word, "en"));
    default:
      return list;
  }
}

function filterWords(words, query) {
  const q = query.trim().toLowerCase();
  if (!q) return words;
  return words.filter(
    (item) =>
      item.word.toLowerCase().includes(q) ||
      item.definitions?.some((def) => def.toLowerCase().includes(q)) ||
      item.ai_feedback?.toLowerCase().includes(q)
  );
}

function WordItem({ item, variant, onRemove, showWrongCount, wrongCountPast = false }) {
  const wrongCount = item.wrongCount ?? 0;
  const showBadge = showWrongCount && wrongCount > 0;

  return (
    <article className={`word-item word-item--${variant}`}>
      <div className="word-item__main">
        <div className="word-item__left">
          <div className="word-item__title-row">
            <h3 className="word-item__word">{item.word}</h3>
            {showBadge && (
              <span
                className={`word-item__wrong-count ${wrongCountPast ? "word-item__wrong-count--past" : ""}`}
              >
                {wrongCountPast ? `曾错 ${wrongCount} 次` : `错 ${wrongCount} 次`}
              </span>
            )}
          </div>
          <p className="word-item__defs">{item.definitions?.join(" · ")}</p>
          {item.ai_feedback && <p className="word-item__feedback">{item.ai_feedback}</p>}
        </div>
        <div className="word-item__actions">
          {onRemove && (
            <button
              type="button"
              className="word-item__remove"
              onClick={() => onRemove(item.word)}
              aria-label={`移除 ${item.word}`}
            >
              移除
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function WordList({
  title,
  subtitle,
  words,
  emptyText,
  headerAction,
  onRemoveWord,
  onClearAll,
  clearLabel = "清空",
  showWrongCount = false,
  wrongCountPast = false,
  withToolbar = false,
  reviewBar = null,
}) {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState("default");

  const displayedWords = useMemo(() => {
    const filtered = filterWords(words, query);
    return sortWords(filtered, sortMode);
  }, [words, query, sortMode]);

  const isFiltering = query.trim().length > 0;
  const showEmpty = words.length === 0;
  const showNoResults = !showEmpty && displayedWords.length === 0;

  return (
    <div className="word-list-view">
      <header className="word-list-view__header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div className="word-list-view__header-actions">
          {onClearAll && words.length > 0 && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={onClearAll}>
              {clearLabel}
            </button>
          )}
          {headerAction}
        </div>
      </header>

      {withToolbar && words.length > 0 && (
        <div className="word-list-view__toolbar">
          <input
            className="word-list-view__search"
            type="search"
            placeholder="搜索单词或释义…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="搜索单词"
          />
          <select
            className="word-list-view__sort"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
            aria-label="排序方式"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {withToolbar && words.length > 0 && (
        <p className="word-list-view__meta">
          {isFiltering || sortMode !== "default"
            ? `显示 ${displayedWords.length} / ${words.length} 个`
            : `共 ${words.length} 个`}
        </p>
      )}

      {reviewBar && words.length > 0 && (
        <div className="word-list-view__review-bar">{reviewBar}</div>
      )}

      {showEmpty ? (
        <div className="word-list-view__empty">
          <span className="empty-icon">📭</span>
          <p>{emptyText}</p>
        </div>
      ) : showNoResults ? (
        <div className="word-list-view__empty">
          <span className="empty-icon">🔍</span>
          <p>没有匹配的单词</p>
        </div>
      ) : (
        <div className="word-list">
          {displayedWords.map((item) => (
            <WordItem
              key={item.word}
              item={item}
              variant={title.includes("不认识") ? "unknown" : "known"}
              onRemove={onRemoveWord}
              showWrongCount={showWrongCount}
              wrongCountPast={wrongCountPast}
            />
          ))}
        </div>
      )}
    </div>
  );
}
