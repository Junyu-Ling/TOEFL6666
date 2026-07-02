import { UNCategorized_LIST_ID } from "../utils/wordListGrouping";

function toggleListId(selectedListIds, listId) {
  if (selectedListIds.includes(listId)) {
    return selectedListIds.filter((id) => id !== listId);
  }
  return [...selectedListIds, listId];
}

export default function BookReviewScopeBar({
  title,
  description,
  levelNumbers = [],
  listsByLevel,
  countByListId,
  selectedListIds = [],
  onSelectedListIdsChange,
  uncategorizedCount = 0,
  reviewShuffle,
  onToggleShuffle,
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
}) {
  function toggleLevel(level) {
    const lists = (listsByLevel?.get(level) ?? []).filter(
      (item) => (countByListId.get(item.id) || 0) > 0
    );
    const ids = lists.map((item) => item.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedListIds.includes(id));
    if (allSelected) {
      onSelectedListIdsChange(selectedListIds.filter((id) => !ids.includes(id)));
      return;
    }
    onSelectedListIdsChange([...new Set([...selectedListIds, ...ids])]);
  }

  return (
    <div className="word-list-review-bar word-list-review-bar--multi">
      <div className="word-list-review-bar__header">
        <div className="word-list-review-bar__text">
          <strong>{title}</strong>
          <p>{description}</p>
        </div>
        <span className="word-list-review-bar__badge">已选 {selectedListIds.length} 个列表</span>
      </div>

      <div className="word-list-review-scope">
        {levelNumbers.map((level) => {
          const lists = (listsByLevel?.get(level) ?? []).filter(
            (item) => (countByListId.get(item.id) || 0) > 0
          );
          if (lists.length === 0) return null;

          const levelIds = lists.map((item) => item.id);
          const allLevelSelected = levelIds.every((id) => selectedListIds.includes(id));
          const someLevelSelected =
            !allLevelSelected && levelIds.some((id) => selectedListIds.includes(id));

          return (
            <section key={level} className="word-list-review-scope__level">
              <label className="word-list-review-scope__level-label">
                <input
                  type="checkbox"
                  checked={allLevelSelected}
                  ref={(node) => {
                    if (node) node.indeterminate = someLevelSelected;
                  }}
                  onChange={() => toggleLevel(level)}
                />
                <span>Level {level}</span>
              </label>
              <div className="word-list-review-scope__lists">
                {lists.map((item) => (
                  <label key={item.id} className="word-list-review-scope__list-option">
                    <input
                      type="checkbox"
                      checked={selectedListIds.includes(item.id)}
                      onChange={() =>
                        onSelectedListIdsChange(toggleListId(selectedListIds, item.id))
                      }
                    />
                    <span>
                      List {item.list}（{countByListId.get(item.id) || 0}）
                    </span>
                  </label>
                ))}
              </div>
            </section>
          );
        })}

        {uncategorizedCount > 0 && (
          <label className="word-list-review-scope__uncategorized">
            <input
              type="checkbox"
              checked={selectedListIds.includes(UNCategorized_LIST_ID)}
              onChange={() =>
                onSelectedListIdsChange(toggleListId(selectedListIds, UNCategorized_LIST_ID))
              }
            />
            <span>未归类（{uncategorizedCount}）</span>
          </label>
        )}
      </div>

      <div className="word-list-review-bar__actions">
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
