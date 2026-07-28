import { memo, useMemo, useState } from "react";
import { useSettings } from "../context/SettingsContext";
import {
  filterFamiliarObscureEntries,
  getFamiliarObscureEntries,
  getFamiliarObscureTitle,
} from "../utils/familiarObscureMeanings";

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
        <p className="fobs__section-body">{entry.obscureMeaning || entry.commonMeaning || "—"}</p>
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

function FamiliarObscureMeanings() {
  const { speakWord } = useSettings();
  const entries = useMemo(() => getFamiliarObscureEntries(), []);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const filtered = useMemo(() => filterFamiliarObscureEntries(entries, query), [entries, query]);
  const selected = useMemo(
    () => entries.find((entry) => entry.id === selectedId) ?? null,
    [entries, selectedId]
  );

  if (selected) {
    return (
      <EntryDetail
        entry={selected}
        onBack={() => setSelectedId(null)}
        onSpeak={speakWord}
      />
    );
  }

  return (
    <div className="fobs">
      <header className="fobs__header">
        <div>
          <h2 className="fobs__title">{getFamiliarObscureTitle()}</h2>
          <p className="fobs__subtitle">共 {entries.length} 词 · 点击卡片查看僻义与记忆方法</p>
        </div>
        <input
          type="search"
          className="fobs__search"
          placeholder="搜索单词或释义..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="搜索熟词僻义"
        />
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
              onClick={() => setSelectedId(entry.id)}
            >
              <span className="fobs__card-id">#{entry.id}</span>
              <strong className="fobs__card-word">{entry.word}</strong>
              <p className="fobs__card-common">{entry.commonMeaning || "—"}</p>
              <p className="fobs__card-obscure">
                <span className="fobs__card-obscure-label">僻义</span>
                {entry.obscureMeaning || entry.commonMeaning || "—"}
              </p>
              <MemoryTipBlock text={entry.memoryTip} compact />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(FamiliarObscureMeanings);
