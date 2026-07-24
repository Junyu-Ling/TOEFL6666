import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  getReadingFillBlankArticles,
  getReadingFillBlankQuestionRange,
  gradeArticle,
  READING_FILL_BLANK_TOTAL,
} from "../utils/readingFillBlank";
import {
  extractLatinLetter,
  isBlockedCompositionText,
  shouldBlockBeforeInput,
  shouldWarnImeBlocked,
} from "../utils/latinInputGuard";
import {
  getArticleInputs,
  loadReadingFillBlankProgress,
  patchArticleChecked,
  patchArticleIndex,
  patchArticleInputs,
} from "../services/readingFillBlankProgress";

const BlankInput = forwardRef(function BlankInput(
  { blank, letters, checked, result, onChange, onFilled, onImeBlocked },
  ref
) {
  const refs = useRef([]);
  const composingRef = useRef(false);

  useImperativeHandle(ref, () => ({
    focusFirst: () => refs.current[0]?.focus(),
  }));

  const notifyImeBlocked = useCallback(() => {
    onImeBlocked?.();
  }, [onImeBlocked]);

  const applyLetter = useCallback(
    (index, value) => {
      const raw = String(value).slice(-1);
      const char = extractLatinLetter(raw);
      if (shouldWarnImeBlocked(value)) {
        notifyImeBlocked();
        return;
      }
      if (!char) return;

      const next = [...letters];
      next[index] = char;
      onChange(next);
      if (index < letters.length - 1) {
        refs.current[index + 1]?.focus();
        return;
      }
      onFilled?.();
    },
    [letters, notifyImeBlocked, onChange, onFilled]
  );

  const handleBeforeInput = (index, event) => {
    if (shouldBlockBeforeInput(event)) {
      event.preventDefault();
      notifyImeBlocked();
    }
  };

  const handleCompositionStart = () => {
    composingRef.current = true;
  };

  const handleCompositionUpdate = (event) => {
    if (isBlockedCompositionText(event.data)) {
      notifyImeBlocked();
    }
  };

  const handleCompositionEnd = (index, event) => {
    composingRef.current = false;
    const data = event.data ?? "";
    if (isBlockedCompositionText(data)) {
      event.preventDefault();
      event.target.value = letters[index] ?? "";
      notifyImeBlocked();
      return;
    }
    const char = extractLatinLetter(data);
    if (char) {
      event.preventDefault();
      applyLetter(index, char);
    }
  };

  const handleChange = (index, value) => {
    if (composingRef.current) {
      if (isBlockedCompositionText(value)) {
        notifyImeBlocked();
        return;
      }
      const char = extractLatinLetter(value);
      if (char) {
        applyLetter(index, char);
      }
      return;
    }
    applyLetter(index, value);
  };

  const handlePaste = (index, event) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text");
    if (shouldWarnImeBlocked(text)) {
      notifyImeBlocked();
      return;
    }
    applyLetter(index, text);
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !letters[index] && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
      const next = [...letters];
      next[index - 1] = "";
      onChange(next);
      return;
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < letters.length - 1) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  };

  const stateClass = checked
    ? result?.isCorrect
      ? "rfill-blank--correct"
      : "rfill-blank--wrong"
    : "";

  return (
    <span className={`rfill-blank ${stateClass}`}>
      {blank.prefix ? <span className="rfill-blank__prefix">{blank.prefix}</span> : null}
      <span className="rfill-blank__boxes" aria-label={`填空：${blank.answer}`}>
        {letters.map((letter, index) => (
          <input
            key={`${blank.id}-${index}`}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="text"
            lang="en"
            inputMode="latin"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={1}
            className="rfill-blank__box"
            value={letter}
            aria-label={`第 ${index + 1} 个字母`}
            onBeforeInput={(event) => handleBeforeInput(index, event)}
            onCompositionStart={handleCompositionStart}
            onCompositionUpdate={handleCompositionUpdate}
            onCompositionEnd={(event) => handleCompositionEnd(index, event)}
            onChange={(event) => handleChange(index, event.target.value)}
            onPaste={(event) => handlePaste(index, event)}
            onKeyDown={(event) => handleKeyDown(index, event)}
          />
        ))}
      </span>
    </span>
  );
});

function ReadingFillBlank() {
  const articles = useMemo(() => getReadingFillBlankArticles(), []);
  const [progress, setProgress] = useState(() => loadReadingFillBlankProgress(articles));
  const articleIndex = Math.min(progress.articleIndex, Math.max(articles.length - 1, 0));
  const article = articles[articleIndex];

  const [inputs, setInputs] = useState(() =>
    article ? getArticleInputs(article, progress.inputsByArticle) : {}
  );
  const [checked, setChecked] = useState(() => Boolean(progress.checkedByArticle?.[article?.id]));
  const [grade, setGrade] = useState(null);
  const blankRefs = useRef({});
  const imeWarningTimerRef = useRef(null);
  const [imeWarning, setImeWarning] = useState(false);
  const blankIds = useMemo(
    () => article?.segments.filter((segment) => segment.type === "blank").map((segment) => segment.id) ?? [],
    [article]
  );

  const handleBlankFilled = useCallback(
    (blankId) => {
      const index = blankIds.indexOf(blankId);
      if (index < 0 || index >= blankIds.length - 1) return;
      const nextId = blankIds[index + 1];
      requestAnimationFrame(() => {
        blankRefs.current[nextId]?.focusFirst();
      });
    },
    [blankIds]
  );

  const showImeWarning = useCallback(() => {
    setImeWarning(true);
    if (imeWarningTimerRef.current) {
      clearTimeout(imeWarningTimerRef.current);
    }
    imeWarningTimerRef.current = setTimeout(() => {
      setImeWarning(false);
    }, 4500);
  }, []);

  useEffect(() => {
    return () => {
      if (imeWarningTimerRef.current) {
        clearTimeout(imeWarningTimerRef.current);
      }
    };
  }, []);

  const syncArticle = useCallback(
    (nextIndex) => {
      const nextArticle = articles[nextIndex];
      if (!nextArticle) return;
      const saved = loadReadingFillBlankProgress(articles);
      const nextInputs = getArticleInputs(nextArticle, saved.inputsByArticle);
      const wasChecked = Boolean(saved.checkedByArticle?.[nextArticle.id]);
      setProgress(patchArticleIndex(saved, nextIndex));
      setInputs(nextInputs);
      setChecked(wasChecked);
      setGrade(wasChecked ? gradeArticle(nextArticle, nextInputs) : null);
    },
    [articles]
  );

  const handleInputChange = useCallback(
    (blankId, letters) => {
      if (!article) return;
      const nextInputs = { ...inputs, [blankId]: letters };
      setInputs(nextInputs);
      setChecked(false);
      setGrade(null);
      const saved = loadReadingFillBlankProgress(articles);
      const withInputs = patchArticleInputs(saved, article.id, nextInputs);
      setProgress(patchArticleChecked(withInputs, article.id, false));
    },
    [article, articles, inputs]
  );

  const handleCheck = useCallback(() => {
    if (!article) return;
    const result = gradeArticle(article, inputs);
    setGrade(result);
    setChecked(true);
    const saved = loadReadingFillBlankProgress(articles);
    setProgress(patchArticleChecked(saved, article.id, true));
  }, [article, articles, inputs]);

  const handleHome = () => {
    if (articleIndex !== 0) syncArticle(0);
  };

  const handlePrev = () => {
    if (articleIndex > 0) syncArticle(articleIndex - 1);
  };

  const handleNext = () => {
    if (articleIndex < articles.length - 1) syncArticle(articleIndex + 1);
  };

  if (!article) {
    return (
      <div className="rfill">
        <p className="rfill__empty">暂无题目</p>
      </div>
    );
  }

  const gradeMap = new Map(grade?.results?.map((item) => [item.blank.id, item]) ?? []);
  const questionRange = getReadingFillBlankQuestionRange(articles, articleIndex);

  return (
    <div className="rfill">
      <header className="rfill__header">
        <div className="rfill__header-left">
          <h1 className="rfill__title">
            第 {article.id} 篇：{article.title}
          </h1>
          <button type="button" className="rfill__home-btn" onClick={handleHome}>
            Home
          </button>
        </div>
        <div className="rfill__header-actions">
          <button
            type="button"
            className="rfill__nav-btn"
            onClick={handlePrev}
            disabled={articleIndex <= 0}
          >
            ‹ Prev
          </button>
          <button
            type="button"
            className="rfill__next-btn"
            onClick={handleNext}
            disabled={articleIndex >= articles.length - 1}
          >
            Next ›
          </button>
        </div>
      </header>

      <div className="rfill__subbar">
        <div className="rfill__subbar-left">
          <strong>Reading</strong>
          <span>
            Question {questionRange.start}-{questionRange.end} of {questionRange.total}
          </span>
        </div>
        <div className="rfill__subbar-right">
          共 {READING_FILL_BLANK_TOTAL} 篇 · 当前 {articleIndex + 1}/{articles.length}
        </div>
      </div>

      <div className="rfill__body">
        <p className="rfill__instruction">Fill in the missing letters in the paragraph</p>

        {imeWarning ? (
          <div className="rfill__ime-alert" role="alert">
            检测到中文输入，请切换到英文模式（微软拼音按 Shift）或选择「英语(美国) / 美式键盘」后再填写。
          </div>
        ) : null}

        <p className="rfill__passage">
          {article.segments.map((segment, index) => {
            if (segment.type === "text") {
              return (
                <span key={`text-${index}`} className="rfill__text">
                  {segment.value}
                </span>
              );
            }

            const letters =
              inputs[segment.id] ?? Array.from({ length: segment.fillLen }, () => "");

            return (
              <BlankInput
                key={segment.id}
                ref={(node) => {
                  blankRefs.current[segment.id] = node;
                }}
                blank={segment}
                letters={letters}
                checked={checked}
                result={gradeMap.get(segment.id)}
                onChange={(nextLetters) => handleInputChange(segment.id, nextLetters)}
                onFilled={() => handleBlankFilled(segment.id)}
                onImeBlocked={showImeWarning}
              />
            );
          })}
        </p>

        <div className="rfill__footer">
          <button type="button" className="rfill__check-btn" onClick={handleCheck}>
            核对答案
          </button>
        </div>

        {checked && grade ? (
          <div className="rfill__result">
            <p className="rfill__result-score">
              本篇得分：<strong>{grade.correctCount}</strong> / {grade.total}
            </p>
            <ul className="rfill__result-list">
              {grade.results.map((item, index) => (
                <li
                  key={item.blank.id}
                  className={item.isCorrect ? "rfill__result-item--ok" : "rfill__result-item--bad"}
                >
                  <span className="rfill__result-index">{index + 1}.</span>
                  <span className="rfill__result-word">
                    {item.blank.prefix}
                    <span className="rfill__result-fill">{item.userWord.slice(item.blank.prefix.length) || "—"}</span>
                  </span>
                  {item.isCorrect ? (
                    <span className="rfill__result-tag rfill__result-tag--ok">正确</span>
                  ) : (
                    <>
                      <span className="rfill__result-tag rfill__result-tag--bad">错误</span>
                      <span className="rfill__result-answer">标准答案：{item.expected}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default memo(ReadingFillBlank);
