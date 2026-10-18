import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchReadingFillDrill } from "../services/access";
import { usePassageContentProtection } from "../hooks/usePassageContentProtection";
import { useEnglishImeLock } from "../hooks/useEnglishImeLock";
import { useIsActiveTab } from "../context/ActiveTabContext";
import { useAuth } from "../context/AuthContext";
import {
  dismissImeComposition,
  latinLetterFromText,
  letterFromKeyboardEvent,
} from "../utils/englishIme";
import BlindWatermarkLayer from "./BlindWatermarkLayer";

const ORDER_ALPHA = "alpha";
const ORDER_RANDOM = "random";
const STORAGE_KEY = "toefl666_rfill_drill_v1";

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitSentence(sentence, answer) {
  const text = String(sentence || "");
  const word = String(answer || "");
  if (!text || !word) return { before: text, after: "", matched: false };
  const re = new RegExp(`\\b(${escapeRegExp(word)})\\b`);
  const match = text.match(re);
  if (!match || match.index == null) {
    return { before: text, after: "", matched: false };
  }
  const start = match.index;
  const end = start + match[1].length;
  return {
    before: text.slice(0, start),
    after: text.slice(end),
    matched: true,
  };
}

function compareAlpha(a, b) {
  const la = String(a.letter || a.prefix || a.answer || "").toLowerCase();
  const lb = String(b.letter || b.prefix || b.answer || "").toLowerCase();
  if (la !== lb) return la.localeCompare(lb);
  const wa = String(a.answer || "").toLowerCase();
  const wb = String(b.answer || "").toLowerCase();
  if (wa !== wb) return wa.localeCompare(wb);
  return String(a.id).localeCompare(String(b.id));
}

function shuffleList(list) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSaved(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function DrillBlank({ prefix, restLen, letters, checked, isCorrect, onChange, onEnter }) {
  const refs = useRef([]);

  const commitLetter = (index, char) => {
    if (!char) return;
    const next = [...letters];
    next[index] = char;
    onChange(next);
    if (index < letters.length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "Enter") {
      event.preventDefault();
      onEnter?.();
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      const next = [...letters];
      if (letters[index]) {
        next[index] = "";
        onChange(next);
        return;
      }
      if (index > 0) {
        refs.current[index - 1]?.focus();
        next[index - 1] = "";
        onChange(next);
      }
      return;
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
      return;
    }
    if (event.key === "ArrowRight" && index < letters.length - 1) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
      return;
    }
    const letter = letterFromKeyboardEvent(event);
    if (!letter) return;
    event.preventDefault();
    if (event.key === "Process" || event.keyCode === 229) {
      dismissImeComposition(event.currentTarget);
    }
    commitLetter(index, letter);
  };

  const stateClass = checked ? (isCorrect ? "rfill-blank--correct" : "rfill-blank--wrong") : "";

  return (
    <span className={`rfill-blank ${stateClass}`} aria-label="填空">
      {prefix ? <span className="rfill-blank__prefix">{prefix}</span> : null}
      {Array.from({ length: restLen }, (_, index) => (
        <input
          key={`drill-${index}`}
          ref={(node) => {
            refs.current[index] = node;
          }}
          type="text"
          lang="en"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={1}
          className="rfill-blank__box"
          value={letters[index] || ""}
          placeholder="_"
          aria-label={`第 ${index + 1} 个字母`}
          onChange={(e) => {
            const char = latinLetterFromText(e.target.value);
            if (char) commitLetter(index, char);
          }}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onBeforeInput={(e) => {
            const type = e.nativeEvent?.inputType ?? e.inputType;
            if (type === "insertCompositionText" || type === "insertFromComposition") {
              e.preventDefault();
              return;
            }
            if (type !== "insertText") return;
            const letter = latinLetterFromText(e.data);
            e.preventDefault();
            if (letter) commitLetter(index, letter);
          }}
          onCompositionStart={(e) => dismissImeComposition(e.currentTarget)}
        />
      ))}
    </span>
  );
}

function ReadingFillDrill() {
  const { user } = useAuth();
  const isTabActive = useIsActiveTab("reading-fill");
  useEnglishImeLock(isTabActive);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderMode, setOrderMode] = useState(() => loadSaved()?.orderMode || ORDER_ALPHA);
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [letters, setLetters] = useState([]);
  const [checked, setChecked] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const protectRootRef = useRef(null);

  const {
    obscured,
    hardLock,
    recordingLock,
    devtoolsLock,
    captureHint,
    watermark,
    watermarkIp,
  } = usePassageContentProtection(protectRootRef, {
    enabled: isTabActive && Boolean(queue.length),
    user,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchReadingFillDrill();
        if (cancelled) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (err) {
        if (!cancelled) setError(err?.message || "加载专项强化失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!items.length) {
      setQueue([]);
      return;
    }
    const next =
      orderMode === ORDER_RANDOM ? shuffleList(items) : [...items].sort(compareAlpha);
    setQueue(next);
    const saved = loadSaved();
    const start =
      saved?.orderMode === orderMode && Number.isFinite(saved?.index)
        ? Math.min(Math.max(0, saved.index), next.length - 1)
        : 0;
    setIndex(start);
    setChecked(false);
  }, [items, orderMode, shuffleSeed]);

  const current = queue[index] || null;

  useEffect(() => {
    if (!current) {
      setLetters([]);
      setChecked(false);
      return;
    }
    setLetters(Array.from({ length: current.restLen }, () => ""));
    setChecked(false);
    saveSaved({ orderMode, index });
  }, [current, orderMode, index]);

  const parts = useMemo(
    () => (current ? splitSentence(current.sentence, current.answer) : null),
    [current]
  );

  const userRest = letters.join("");
  const expectedRest = current ? String(current.answer).slice(String(current.prefix).length) : "";
  const isCorrect =
    checked &&
    userRest.toLowerCase() === expectedRest.toLowerCase() &&
    userRest.length === expectedRest.length;

  const handleCheck = useCallback(() => {
    setChecked(true);
  }, []);

  const handleClear = useCallback(() => {
    if (!current) return;
    setLetters(Array.from({ length: current.restLen }, () => ""));
    setChecked(false);
  }, [current]);

  const go = useCallback(
    (delta) => {
      setIndex((prev) => Math.min(Math.max(0, prev + delta), Math.max(queue.length - 1, 0)));
    },
    [queue.length]
  );

  if (loading) {
    return <p className="rfill__empty">专项强化加载中…</p>;
  }
  if (error) {
    return <p className="rfill__empty">{error}</p>;
  }
  if (!current) {
    return <p className="rfill__empty">暂无专项强化题目</p>;
  }

  return (
    <>
      <header className="rfill__header">
        <div className="rfill__header-left">
          <h1 className="rfill__title">专项强化</h1>
          <div className="rfill__header-home-row">
            <button type="button" className="rfill__clear-btn" onClick={handleClear}>
              Clear
            </button>
          </div>
        </div>
        <div className="rfill__header-actions">
          <button type="button" className="rfill__nav-btn" onClick={() => go(-1)} disabled={index <= 0}>
            ‹ Prev
          </button>
          <button
            type="button"
            className="rfill__next-btn"
            onClick={() => go(1)}
            disabled={index >= queue.length - 1}
          >
            Next ›
          </button>
        </div>
      </header>

      <div className="rfill__subbar rfill__subbar--drill">
        <div className="rfill__subbar-left">
          <strong>Drill</strong>
          <span>
            {index + 1} / {queue.length}
          </span>
        </div>
        <div className="rfill__drill-order" role="group" aria-label="排序方式">
          <button
            type="button"
            className={`rfill__drill-order-btn${orderMode === ORDER_ALPHA ? " is-active" : ""}`}
            onClick={() => setOrderMode(ORDER_ALPHA)}
          >
            按首字母
          </button>
          <button
            type="button"
            className={`rfill__drill-order-btn${orderMode === ORDER_RANDOM ? " is-active" : ""}`}
            onClick={() => {
              setOrderMode(ORDER_RANDOM);
              setShuffleSeed((n) => n + 1);
            }}
          >
            随机打乱
          </button>
        </div>
      </div>

      <div
        ref={protectRootRef}
        className={`rfill__body rfill__body--protected${obscured || hardLock ? " rfill__body--obscured" : ""}`}
      >
        {captureHint && !obscured && !hardLock ? (
          <p className="rfill__protect-toast" role="status">
            {captureHint}
          </p>
        ) : null}

        <BlindWatermarkLayer userLabel={watermark} ip={watermarkIp || ""} />

        <div className="rfill__protect-content">
          <p className="rfill__instruction">根据首字母补全句子中的词</p>
          <p className="rfill__drill-hint">
            加粗为已给首字母，横线处填写剩余字母。例句来自真题语境。
          </p>

          <p className="rfill__passage rfill__passage--drill">
            {parts?.matched ? (
              <>
                <span className="rfill__text">{parts.before}</span>
                <DrillBlank
                  prefix={current.prefix}
                  restLen={current.restLen}
                  letters={letters}
                  checked={checked}
                  isCorrect={isCorrect}
                  onChange={setLetters}
                  onEnter={handleCheck}
                />
                <span className="rfill__text">{parts.after}</span>
              </>
            ) : (
              <>
                <span className="rfill__text">{current.sentence}</span>
                <span className="rfill__drill-inline-blank">
                  {" "}
                  (
                  <DrillBlank
                    prefix={current.prefix}
                    restLen={current.restLen}
                    letters={letters}
                    checked={checked}
                    isCorrect={isCorrect}
                    onChange={setLetters}
                    onEnter={handleCheck}
                  />
                  )
                </span>
              </>
            )}
          </p>

          <div className="rfill__footer">
            <button type="button" className="rfill__check-btn" onClick={handleCheck}>
              核对答案
            </button>
            {checked ? (
              <button
                type="button"
                className="rfill__nav-btn rfill__drill-next-inline"
                onClick={() => go(1)}
                disabled={index >= queue.length - 1}
              >
                下一题 ›
              </button>
            ) : null}
          </div>

          {checked ? (
            <div className="rfill__result">
              <p className="rfill__result-score">
                {isCorrect ? (
                  <>
                    正确：<strong>{current.answer}</strong>
                  </>
                ) : (
                  <>
                    标准答案：<strong>{current.answer}</strong>
                    <span className="rfill__result-answer">
                      {" "}
                      · 你的作答：{current.prefix}
                      {userRest || "—"}
                    </span>
                  </>
                )}
              </p>
              {current.gloss ? <p className="rfill__drill-gloss">{current.gloss}</p> : null}
            </div>
          ) : null}
        </div>

        {hardLock ? (
          <div className="rfill__obscure rfill__obscure--lock" role="alertdialog" aria-modal="true">
            <p>
              {devtoolsLock
                ? "因开发者工具已打开，题目已锁定"
                : recordingLock
                  ? "因检测到录屏，题目已锁定"
                  : "题目已锁定"}
            </p>
            <span>
              {captureHint ||
                (devtoolsLock
                  ? "请关闭开发者工具，识别到关闭后会自动恢复。"
                  : "请彻底关闭录屏。系统会持续检测，确认已停止后才会自动恢复。")}
            </span>
          </div>
        ) : obscured ? (
          <div className="rfill__obscure" role="status">
            <p>题目已暂时遮盖</p>
            <span>{captureHint || "请稍候…"}</span>
          </div>
        ) : null}
      </div>
    </>
  );
}

export default memo(ReadingFillDrill);
