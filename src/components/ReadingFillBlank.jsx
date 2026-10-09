import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  getReadingFillBlankQuestionRange,
  getReadingFillBlankReviewRows,
  gradeArticle,
  hydrateReadingFillBlankArticles,
} from "../utils/readingFillBlank";
import { fetchReadingFillArticles, solveReadingFillPow } from "../services/access";
import {
  clearReadingFillBlankProgress,
  getArticleInputs,
  loadReadingFillBlankProgress,
  patchArticleChecked,
  patchArticleIndex,
  patchArticleInputs,
} from "../services/readingFillBlankProgress";
import { usePassageContentProtection } from "../hooks/usePassageContentProtection";
import { useEnglishImeLock } from "../hooks/useEnglishImeLock";
import { useIsActiveTab } from "../context/ActiveTabContext";
import { useAuth } from "../context/AuthContext";
import {
  dismissImeComposition,
  latinLetterFromText,
  letterFromKeyboardEvent,
} from "../utils/englishIme";
import RateLimitCaptcha from "./RateLimitCaptcha";

function ReviewBookmarkIcon() {
  return (
    <svg className="rfill__review-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 2h12a1 1 0 0 1 1 1v18l-7-4-7 4V3a1 1 0 0 1 1-1z"
        fill="currentColor"
      />
    </svg>
  );
}

const BlankInput = forwardRef(function BlankInput(
  { blank, letters, checked, result, onChange, onFilled, onEnter },
  ref
) {
  const refs = useRef([]);

  useImperativeHandle(ref, () => ({
    focusFirst: () => refs.current[0]?.focus(),
  }));

  const commitLetter = (index, char) => {
    if (!char) return;
    const next = [...letters];
    next[index] = char;
    onChange(next);
    if (index < letters.length - 1) {
      refs.current[index + 1]?.focus();
    } else {
      onFilled?.();
    }
  };

  const handleChange = (index, value) => {
    const char = latinLetterFromText(value);
    if (!char) return;
    commitLetter(index, char);
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
    event.stopPropagation();
    if (event.key === "Process" || event.keyCode === 229) {
      dismissImeComposition(event.currentTarget);
    }
    commitLetter(index, letter);
  };

  const handleBeforeInput = (index, event) => {
    const type = event.nativeEvent?.inputType ?? event.inputType;
    if (type === "insertCompositionText" || type === "insertFromComposition") {
      event.preventDefault();
      return;
    }
    if (type !== "insertText") return;
    const letter = latinLetterFromText(event.data);
    event.preventDefault();
    if (letter) commitLetter(index, letter);
  };

  const handleCompositionStart = (event) => {
    dismissImeComposition(event.currentTarget);
  };

  const handleCompositionEnd = (index, event) => {
    if (letters[index]) return;
    const letter = latinLetterFromText(event.data);
    if (letter) commitLetter(index, letter);
  };

  const stateClass = checked
    ? result?.isCorrect
      ? "rfill-blank--correct"
      : "rfill-blank--wrong"
    : "";

  return (
    <span className={`rfill-blank ${stateClass}`} aria-label={`填空：${blank.answer}`}>
      {blank.prefix ? <span className="rfill-blank__prefix">{blank.prefix}</span> : null}
      {letters.map((letter, index) => (
        <input
          key={`${blank.id}-${index}`}
          ref={(node) => { refs.current[index] = node; }}
          type="text"
          lang="en"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={1}
          className="rfill-blank__box"
          value={letter}
          placeholder="_"
          aria-label={`第 ${index + 1} 个字母`}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onBeforeInput={(e) => handleBeforeInput(index, e)}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={(e) => handleCompositionEnd(index, e)}
        />
      ))}
    </span>
  );
});

function ReadingFillBlank() {
  const { user, loading: authLoading } = useAuth();
  const isTabActive = useIsActiveTab("reading-fill");
  useEnglishImeLock(isTabActive);
  const [articles, setArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [articlesError, setArticlesError] = useState("");
  const [serverWatermark, setServerWatermark] = useState(null);
  const [captchaPow, setCaptchaPow] = useState(null);
  const [captchaBusy, setCaptchaBusy] = useState(false);
  const [progress, setProgress] = useState(() => loadReadingFillBlankProgress());
  const [viewMode, setViewMode] = useState("practice");
  const [selectedReviewIndex, setSelectedReviewIndex] = useState(0);
  const articleIndex = Math.min(progress.articleIndex, Math.max(articles.length - 1, 0));
  const article = articles[articleIndex];

  const [inputs, setInputs] = useState(() =>
    article ? getArticleInputs(article, progress.inputsByArticle) : {}
  );
  const [checked, setChecked] = useState(() => Boolean(progress.checkedByArticle?.[article?.id]));
  const [grade, setGrade] = useState(null);
  const blankRefs = useRef({});
  const passageRef = useRef(null);
  const protectRootRef = useRef(null);
  const inputsRef = useRef(inputs);
  const wasTabActiveRef = useRef(false);
  inputsRef.current = inputs;
  const blankIds = useMemo(
    () => article?.segments.filter((segment) => segment.type === "blank").map((segment) => segment.id) ?? [],
    [article]
  );

  const reviewRows = useMemo(
    () => getReadingFillBlankReviewRows(articles, progress),
    [articles, progress]
  );

  const loadArticles = useCallback(
    async (extra = {}) => {
      setArticlesLoading(true);
      setArticlesError("");
      try {
        const data = await fetchReadingFillArticles(user?.id, extra);
        setArticles(hydrateReadingFillBlankArticles(data.articles || []));
        setServerWatermark(data.watermark || null);
        setCaptchaPow(null);
      } catch (err) {
        setArticles([]);
        if (err?.needCaptcha && err.pow) {
          setCaptchaPow(err.pow);
          setArticlesError(err.message || "请求过于频繁");
        } else {
          setCaptchaPow(null);
          setArticlesError(err.message || "题目加载失败");
        }
      } finally {
        setArticlesLoading(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    if (authLoading) return undefined;
    if (!user?.id) {
      setArticlesLoading(false);
      setArticlesError("请先登录后再加载题目");
      return undefined;
    }
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadArticles();
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, loadArticles, user?.id]);

  const handleCaptchaPass = useCallback(async () => {
    if (!captchaPow || captchaBusy) return;
    setCaptchaBusy(true);
    try {
      const solved = await solveReadingFillPow(captchaPow);
      await loadArticles(solved);
    } catch (err) {
      setArticlesError(err.message || "校验失败");
    } finally {
      setCaptchaBusy(false);
    }
  }, [captchaBusy, captchaPow, loadArticles]);

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

  const {
    obscured,
    recordingLock,
    devtoolsLock,
    hardLock,
    captureHint,
    watermark,
    suppressBlurCover,
  } = usePassageContentProtection(protectRootRef, {
    enabled: isTabActive && viewMode === "practice",
    user,
    serverWatermark,
  });

  useEffect(() => {
    const becameActive = isTabActive && !wasTabActiveRef.current;
    wasTabActiveRef.current = isTabActive;
    if (!becameActive || viewMode !== "practice") return undefined;
    const currentInputs = inputsRef.current;
    const firstEmptyId =
      blankIds.find((id) => (currentInputs[id] ?? []).some((ch) => !ch)) ?? blankIds[0];
    if (!firstEmptyId) return undefined;
    const frame = window.requestAnimationFrame(() => {
      blankRefs.current[firstEmptyId]?.focusFirst();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isTabActive, viewMode, blankIds]);

  const syncArticle = useCallback(
    (nextIndex) => {
      const nextArticle = articles[nextIndex];
      if (!nextArticle) return;
      const saved = loadReadingFillBlankProgress();
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
      const saved = loadReadingFillBlankProgress();
      const withInputs = patchArticleInputs(saved, article.id, nextInputs);
      setProgress(patchArticleChecked(withInputs, article.id, false));
    },
    [article, inputs]
  );

  const handleCheck = useCallback(() => {
    if (!article) return;
    const result = gradeArticle(article, inputs);
    setGrade(result);
    setChecked(true);
    const saved = loadReadingFillBlankProgress();
    setProgress(patchArticleChecked(saved, article.id, true));
  }, [article, inputs]);

  useEffect(() => {
    const handleDocumentKeyDown = (event) => {
      if (viewMode !== "practice") return;
      if (event.key !== "Enter" || event.defaultPrevented) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if (target instanceof HTMLButtonElement) return;
      event.preventDefault();
      handleCheck();
    };

    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => document.removeEventListener("keydown", handleDocumentKeyDown);
  }, [handleCheck, viewMode]);

  const handleHome = () => {
    if (viewMode === "review") {
      setViewMode("practice");
    }
    if (articleIndex !== 0) syncArticle(0);
  };

  const handleClearAll = () => {
    // confirm 会抢焦点，先抑制失焦遮盖，避免误判为截屏/录屏防护
    suppressBlurCover(3000);
    if (!window.confirm("确定清除全部作答记录？此操作不可撤销。")) {
      suppressBlurCover(800);
      return;
    }
    const currentIndex = articleIndex;
    const cleared = clearReadingFillBlankProgress();
    const withIndex = patchArticleIndex(cleared, currentIndex);
    setProgress(withIndex);
    setViewMode("practice");
    setSelectedReviewIndex(currentIndex);
    const currentArticle = articles[currentIndex];
    if (!currentArticle) return;
    setInputs(getArticleInputs(currentArticle, withIndex.inputsByArticle));
    setChecked(false);
    setGrade(null);
    suppressBlurCover(800);
  };

  const handlePrev = () => {
    if (articleIndex > 0) syncArticle(articleIndex - 1);
  };

  const handleNext = () => {
    if (articleIndex < articles.length - 1) syncArticle(articleIndex + 1);
  };

  const handleOpenReview = () => {
    setSelectedReviewIndex(articleIndex);
    setViewMode("review");
  };

  const handleReturnFromReview = () => {
    setViewMode("practice");
  };

  const handleGoToQuestion = () => {
    if (selectedReviewIndex < 0 || selectedReviewIndex >= articles.length) return;
    syncArticle(selectedReviewIndex);
    setViewMode("practice");
  };

  if (authLoading || articlesLoading) {
    return (
      <div className="rfill" lang="zh-CN">
        <p className="rfill__empty">正在加载题目…</p>
      </div>
    );
  }

  if (articlesError) {
    return (
      <div className="rfill" lang="zh-CN">
        <p className="rfill__empty">{articlesError}</p>
        {captchaPow ? (
          <RateLimitCaptcha
            hint={captchaBusy ? "正在校验，请稍候…" : "拖动滑块后将进行安全校验并重新拉取加密题库"}
            onPass={handleCaptchaPass}
          />
        ) : (
          <button type="button" className="rfill__check-btn" onClick={() => loadArticles()}>
            重新加载
          </button>
        )}
      </div>
    );
  }

  if (!article) {
    return (
      <div className="rfill" lang="en">
        <p className="rfill__empty">暂无题目</p>
      </div>
    );
  }

  const gradeMap = new Map(grade?.results?.map((item) => [item.blank.id, item]) ?? []);
  const questionRange = getReadingFillBlankQuestionRange(articles, articleIndex);
  const reviewQuestionRange = getReadingFillBlankQuestionRange(articles, selectedReviewIndex);
  const selectedReviewRow = reviewRows[selectedReviewIndex];

  return (
    <div className="rfill" lang="en">
      <header className="rfill__header">
        <div className="rfill__header-left">
          <h1 className="rfill__title">
            {viewMode === "review" ? "Review" : `第 ${article.id} 篇：${article.title}`}
          </h1>
          <div className="rfill__header-home-row">
            <button type="button" className="rfill__home-btn" onClick={handleHome}>
              Home
            </button>
            <button type="button" className="rfill__clear-btn" onClick={handleClearAll}>
              Clear all
            </button>
          </div>
        </div>
        <div className="rfill__header-actions">
          {viewMode === "review" ? (
            <>
              <button type="button" className="rfill__nav-btn" onClick={handleReturnFromReview}>
                ‹ Return
              </button>
              <button
                type="button"
                className="rfill__next-btn"
                onClick={handleGoToQuestion}
                disabled={selectedReviewIndex < 0}
              >
                Go To Question
              </button>
            </>
          ) : (
            <>
              <button type="button" className="rfill__review-btn" onClick={handleOpenReview}>
                Review
                <ReviewBookmarkIcon />
              </button>
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
            </>
          )}
        </div>
      </header>

      <div className="rfill__subbar">
        <div className="rfill__subbar-left">
          <strong>Reading</strong>
          <span>
            Question{" "}
            {viewMode === "review"
              ? `${reviewQuestionRange.start}-${reviewQuestionRange.end}`
              : `${questionRange.start}-${questionRange.end}`}{" "}
            of {questionRange.total}
          </span>
        </div>
        <div className="rfill__subbar-right">
          共 {articles.length} 篇 · 当前{" "}
          {viewMode === "review" ? selectedReviewIndex + 1 : articleIndex + 1}/{articles.length}
        </div>
      </div>

      {viewMode === "review" ? (
        <div className="rfill__review">
          <div className="rfill__review-intro">
            <p>下表列出全部篇章。当前浏览的篇章会高亮显示；已选中的篇章可用于跳转。</p>
            <p>点击某一行可选中该篇，再点 Go To Question 直接进入对应题目。</p>
            <p>点击 Return 返回做题界面。</p>
          </div>

          <div className="rfill__review-table-wrap">
            <table className="rfill__review-table">
              <thead>
                <tr>
                  <th scope="col">Number</th>
                  <th scope="col">Type</th>
                  <th scope="col">Description</th>
                  <th scope="col">Your answer</th>
                </tr>
              </thead>
              <tbody>
                {reviewRows.map((row) => {
                  const isSelected = row.index === selectedReviewIndex;
                  const isCurrent = row.index === articleIndex;
                  const rowClass = [
                    isSelected ? "rfill__review-row--selected" : "",
                    !isSelected && isCurrent ? "rfill__review-row--current" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <tr
                      key={row.articleId}
                      className={rowClass}
                      onClick={() => setSelectedReviewIndex(row.index)}
                    >
                      <td>{row.numberLabel}</td>
                      <td>{row.type}</td>
                      <td>{row.description}</td>
                      <td className="rfill__review-answer">
                        {row.userAnswers}
                        {row.scoreLabel ? (
                          <span className="rfill__review-score"> · {row.scoreLabel}</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selectedReviewRow ? (
            <p className="rfill__review-selected">
              已选：{selectedReviewRow.description}
            </p>
          ) : null}
        </div>
      ) : (
        <div
          ref={protectRootRef}
          className={`rfill__body rfill__body--protected${obscured || hardLock ? " rfill__body--obscured" : ""}`}
        >
          {captureHint && !obscured && !hardLock ? (
            <p className="rfill__protect-toast" role="status">
              {captureHint}
            </p>
          ) : null}

          <div className="rfill__watermark" aria-hidden>
            {Array.from({ length: 18 }, (_, i) => (
              <span key={i}>{watermark}</span>
            ))}
          </div>

          <div className="rfill__protect-content">
            <p className="rfill__instruction">Fill in the missing letters in the paragraph</p>

            <p ref={passageRef} className="rfill__passage">
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
                    onEnter={handleCheck}
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
                        <span className="rfill__result-fill">
                          {item.userWord.slice(item.blank.prefix.length) || "—"}
                        </span>
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

          {hardLock ? (
            <div className="rfill__obscure rfill__obscure--lock" role="alertdialog" aria-modal="true" aria-label="内容锁定">
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
                    : "请彻底关闭录屏，识别到结束后会自动恢复。")}
              </span>
            </div>
          ) : obscured ? (
            <div className="rfill__obscure" role="status" aria-live="polite">
              <p>题目已暂时遮盖</p>
              <span>{captureHint || "请稍候…"}</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default memo(ReadingFillBlank);
