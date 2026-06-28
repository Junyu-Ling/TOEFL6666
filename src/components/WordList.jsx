function WordItem({ item, variant, onRemove }) {
  return (
    <article className={`word-item word-item--${variant}`}>
      <div className="word-item__main">
        <div className="word-item__left">
          <h3 className="word-item__word">{item.word}</h3>
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
}) {
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

      {words.length === 0 ? (
        <div className="word-list-view__empty">
          <span className="empty-icon">📭</span>
          <p>{emptyText}</p>
        </div>
      ) : (
        <div className="word-list">
          {words.map((item) => (
            <WordItem
              key={item.word}
              item={item}
              variant={title.includes("不认识") ? "unknown" : "known"}
              onRemove={onRemoveWord}
            />
          ))}
        </div>
      )}
    </div>
  );
}
