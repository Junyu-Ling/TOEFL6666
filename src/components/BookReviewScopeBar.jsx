import { UNCategorized_LIST_ID } from "../utils/wordListGrouping";

export default function BookReviewScopeBar({
  title,
  description,
  levelNumbers = [],
  reviewLevel,
  onLevelChange,
  listsInLevel = [],
  countByListId,
  reviewListId,
  onListChange,
  uncategorizedCount = 0,
  reviewShuffle,
  onToggleShuffle,
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
}) {
  return (
    <div className="word-list-review-bar">
      <div className="word-list-review-bar__text">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <div className="word-list-review-bar__actions">
        {levelNumbers.length > 0 && (
          <select
            className="practice-toolbar__select"
            value={reviewLevel ?? ""}
            onChange={(e) => onLevelChange(e.target.value)}
            aria-label="选择 Level"
          >
            {levelNumbers.map((level) => (
              <option key={level} value={level}>
                Level {level}
              </option>
            ))}
          </select>
        )}
        <select
          className="practice-toolbar__select"
          value={reviewListId ?? ""}
          onChange={(e) => onListChange(e.target.value)}
          aria-label="选择 List"
        >
          {listsInLevel.map((item) => (
            <option key={item.id} value={item.id}>
              List {item.list}（{countByListId.get(item.id) || 0}）
            </option>
          ))}
          {uncategorizedCount > 0 && (
            <option value={UNCategorized_LIST_ID}>未归类（{uncategorizedCount}）</option>
          )}
        </select>
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
          onClick={onPrimary}
          disabled={primaryDisabled}
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}
