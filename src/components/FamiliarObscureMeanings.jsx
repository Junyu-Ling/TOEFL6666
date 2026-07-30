import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "../context/SettingsContext";
import { evaluateAnswer } from "../services/ai";
import {
  buildFamiliarObscureWordData,
  filterFamiliarObscureEntries,
  getFamiliarObscureEntries,
  getFamiliarObscureTitle,
} from "../utils/familiarObscureMeanings";
import {
  buildShuffledOrder,
  loadFamiliarObscureProgress,
  patchFamiliarObscureProgress,
} from "../services/familiarObscureProgress";
import { playAnswerSound } from "../utils/answerSounds";

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
        <p className="fobs__section-body">{entry.obscureMeaning || "—"}</p>
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

function FamiliarObscureQuiz({ entries, onExit, speakWord }) {
  const { settings } = useSettings();
  const saved = useMemo(() => loadFamiliarObscureProgress(), []);
  const [order, setOrder] = useState(() => {
    if (saved.quizOrder.length === entries.length) return saved.quizOrder;
    return buildShuffledOrder(entries.length);
  });
  const [index, setIndex] = useState(() =>
    Math.max(0, Math.min(saved.quizIndex ?? 0, entries.length - 1))
  );
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState("input");
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  const entry = entries[order[index]] ?? entries[0];
  const total = entries.length;

  useEffect(() => {
    patchFamiliarObscureProgress({ quizIndex: index, quizOrder: order });
  }, [index, order]);

  useEffect(() => {
    if (phase === "input") {
      inputRef.current?.focus();
    }
  }, [phase, index]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const notifyResult = useCallback(
    (isCorrect) => {
      if (!settings.answerSounds) return;
      playAnswerSound(isCorrect, {
        correctId: settings.answerSoundCorrect,
        wrongId: settings.answerSoundWrong,
      });
    },
    [settings.answerSoundCorrect, settings.answerSoundWrong, settings.answerSounds]
  );

  const restartQuiz = useCallback(() => {
    const nextOrder = buildShuffledOrder(entries.length);
    setOrder(nextOrder);
    setIndex(0);
    setAnswer("");
    setPhase("input");
    setFeedback(null);
    patchFamiliarObscureProgress({ quizIndex: 0, quizOrder: nextOrder });
  }, [entries.length]);

  const goNext = useCallback(() => {
    if (index >= total - 1) {
      setPhase("complete");
      return;
    }
    setIndex((prev) => prev + 1);
    setAnswer("");
    setPhase("input");
    setFeedback(null);
  }, [index, total]);

  const handleSubmit = useCallback(
    async (event) => {
      event?.preventDefault?.();
      if (!entry || loading || phase !== "input") return;

      const trimmed = answer.trim();
      if (!trimmed) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);

      try {
        const result = await evaluateAnswer(buildFamiliarObscureWordData(entry), trimmed, {
          signal: controller.signal,
        });
        setFeedback(result);
        setPhase("result");
        notifyResult(Boolean(result?.correct));
        if (result?.correct) {
          const savedProgress = loadFamiliarObscureProgress();
          const masteredIds = new Set(savedProgress.masteredIds);
          masteredIds.add(entry.id);
          patchFamiliarObscureProgress({ masteredIds: [...masteredIds] });
        }
      } catch (err) {
        if (err?.name === "AbortError") return;
        setFeedback({
          correct: false,
          message: err?.message || "判题失败，请稍后再试。",
        });
        setPhase("result");
        notifyResult(false);
      } finally {
        setLoading(false);
      }
    },
    [answer, entry, loading, notifyResult, phase]
  );

  if (phase === "complete") {
    return (
      <div className="fobs fobs--quiz">
        <div className="fobs__quiz-complete">
          <h3>本轮测试完成</h3>
          <p>共 {total} 词，已全部过一遍。可重新开始或返回词表复习。</p>
          <div className="fobs__quiz-actions">
            <button type="button" className="btn btn--primary" onClick={restartQuiz}>
              重新测试
            </button>
            <button type="button" className="btn btn--ghost" onClick={onExit}>
              返回词表
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fobs fobs--quiz">
      <header className="fobs__quiz-header">
        <div>
          <h2 className="fobs__title">僻义测试</h2>
          <p className="fobs__subtitle">
            进度 {index + 1}/{total} · 说出或输入该词的 SAT 僻义
          </p>
        </div>
        <div className="fobs__quiz-nav">
          <button type="button" className="btn btn--ghost btn--sm" onClick={restartQuiz}>
            打乱重测
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onExit}>
            返回词表
          </button>
        </div>
      </header>

      <div className="fobs__quiz-progress" aria-hidden>
        <div className="fobs__quiz-progress-bar" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>

      <article className="fobs__quiz-card">
        <div className="fobs__quiz-word-row">
          <span className="fobs__card-id">#{entry.id}</span>
          <button type="button" className="fobs__quiz-word" onClick={() => speakWord?.(entry.word)}>
            {entry.word}
          </button>
        </div>

        <section className="fobs__quiz-section">
          <h3 className="fobs__section-label">常见释义</h3>
          <p className="fobs__section-body">{entry.commonMeaning || "—"}</p>
        </section>

        {phase === "input" ? (
          <form className="fobs__quiz-form" onSubmit={handleSubmit}>
            <label className="fobs__quiz-label" htmlFor="fobs-quiz-answer">
              你的僻义回答
            </label>
            <textarea
              id="fobs-quiz-answer"
              ref={inputRef}
              className="fobs__quiz-input"
              rows={3}
              placeholder="用中文描述该词在 SAT 阅读中的僻义…"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn btn--primary" disabled={loading || !answer.trim()}>
              {loading ? "判题中…" : "提交答案"}
            </button>
          </form>
        ) : (
          <div className="fobs__quiz-result">
            <p
              className={`fobs__quiz-feedback${
                feedback?.correct ? " fobs__quiz-feedback--ok" : " fobs__quiz-feedback--err"
              }`}
            >
              {feedback?.correct ? "回答正确" : feedback?.message || "回答不完全正确"}
            </p>

            <section className="fobs__detail-section fobs__detail-section--accent">
              <h3 className="fobs__section-label">参考答案 · SAT 僻义</h3>
              <p className="fobs__section-body">{entry.obscureMeaning}</p>
            </section>

            <MemoryTipBlock text={entry.memoryTip} />

            <button type="button" className="btn btn--primary fobs__quiz-next" onClick={goNext}>
              {index >= total - 1 ? "完成测试" : "下一词"}
            </button>
          </div>
        )}
      </article>
    </div>
  );
}

function FamiliarObscureMeanings() {
  const { speakWord } = useSettings();
  const entries = useMemo(() => getFamiliarObscureEntries(), []);
  const [panelMode, setPanelMode] = useState("browse");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [masteredCount, setMasteredCount] = useState(
    () => loadFamiliarObscureProgress().masteredIds.length
  );
  const listScrollY = useRef(0);
  const restoreListScroll = useRef(false);

  const filtered = useMemo(() => filterFamiliarObscureEntries(entries, query), [entries, query]);
  const selected = useMemo(
    () => entries.find((entry) => entry.id === selectedId) ?? null,
    [entries, selectedId]
  );

  const openEntry = useCallback((id) => {
    listScrollY.current = window.scrollY;
    setSelectedId(id);
  }, []);

  const closeEntry = useCallback(() => {
    restoreListScroll.current = true;
    setSelectedId(null);
  }, []);

  useLayoutEffect(() => {
    if (selectedId) {
      window.scrollTo(0, 0);
      return;
    }
    if (panelMode === "browse" && restoreListScroll.current) {
      restoreListScroll.current = false;
      window.scrollTo(0, listScrollY.current);
    }
  }, [selectedId, panelMode]);

  if (panelMode === "quiz") {
    return (
      <FamiliarObscureQuiz
        entries={entries}
        speakWord={speakWord}
        onExit={() => {
          setMasteredCount(loadFamiliarObscureProgress().masteredIds.length);
          restoreListScroll.current = true;
          setPanelMode("browse");
        }}
      />
    );
  }

  if (selected) {
    return (
      <EntryDetail
        entry={selected}
        onBack={closeEntry}
        onSpeak={speakWord}
      />
    );
  }

  return (
    <div className="fobs">
      <header className="fobs__header">
        <div>
          <h2 className="fobs__title">{getFamiliarObscureTitle()}</h2>
          <p className="fobs__subtitle">
            共 {entries.length} 词 · 已掌握 {masteredCount} 词 · 点击卡片查看详情
          </p>
        </div>
        <div className="fobs__header-actions">
          <div className="fobs__mode-tabs" role="tablist" aria-label="熟词僻义模式">
            <button type="button" className="fobs__mode-tab fobs__mode-tab--active" role="tab" aria-selected>
              词表
            </button>
            <button
              type="button"
              className="fobs__mode-tab"
              role="tab"
              aria-selected={false}
              onClick={() => {
                listScrollY.current = window.scrollY;
                setPanelMode("quiz");
              }}
            >
              僻义测试
            </button>
          </div>
          <input
            type="search"
            className="fobs__search"
            placeholder="搜索单词或释义..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="搜索熟词僻义"
          />
        </div>
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
              onClick={() => openEntry(entry.id)}
            >
              <span className="fobs__card-id">#{entry.id}</span>
              <strong className="fobs__card-word">{entry.word}</strong>
              <p className="fobs__card-common">{entry.commonMeaning || "—"}</p>
              <p className="fobs__card-hint">点击查看 SAT 僻义与记忆方法</p>
              <MemoryTipBlock text={entry.memoryTip} compact />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(FamiliarObscureMeanings);
