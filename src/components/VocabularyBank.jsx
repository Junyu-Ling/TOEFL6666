import { useMemo, useState } from "react";
import {
  BANK_SORT_OPTIONS,
  filterBankWords,
  sortBankWords,
  groupBankWords,
  getBankWordLabel,
} from "../utils/vocabularyBank";
import PronunciationAlert from "./PronunciationAlert";
import { getPronunciationAlert } from "../utils/pronunciationAlert";

function BankWordItem({ item, availableLists, bookStatus }) {
  const listLabel = getBankWordLabel(item, availableLists);
  const pronunciationAlert = getPronunciationAlert(item.word);

  return (
    <article className="word-item word-item--bank">
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
          <PronunciationAlert alert={pronunciationAlert} className="word-item__pronunciation-alert" />
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

export default function VocabularyBank({
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
  const [sortMode, setSortMode] = useState("level-list");

  const bookStatusByWord = useMemo(() => {
    const map = new Map();
    for (const word of unrecognizedSet) map.set(word, "unrecognized");
    for (const word of recognizedSet) {
      if (!map.has(word)) map.set(word, "recognized");
    }
    return map;
  }, [recognizedSet, unrecognizedSet]);

  const displayedWords = useMemo(() => {
    const filtered = filterBankWords(words, query);
    return sortBankWords(filtered, sortMode, availableLists);
  }, [words, query, sortMode, availableLists]);

  const groupedWords = useMemo(
    () => groupBankWords(displayedWords, sortMode, availableLists, wordListIndex),
    [displayedWords, sortMode, availableLists, wordListIndex]
  );

  const isFiltering = query.trim().length > 0;
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
            {isFiltering || sortMode !== "level-list"
              ? `显示 ${displayedWords.length} / ${words.length} 个`
              : `共 ${words.length} 个单词 · 网站全部词书`}
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
          {BANK_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {displayedWords.length === 0 ? (
        <div className="word-list-view__empty">
          <span className="empty-icon">🔍</span>
          <p>没有匹配的单词</p>
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
