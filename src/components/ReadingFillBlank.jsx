import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  getReadingFillBlankArticles,
  getReadingFillBlankQuestionRange,
  getReadingFillBlankReviewRows,
  gradeArticle,
  READING_FILL_BLANK_QUESTION_TOTAL,
  READING_FILL_BLANK_TOTAL,
} from "../utils/readingFillBlank";
import {
  clearReadingFillBlankProgress,
  getArticleInputs,
  loadReadingFillBlankProgress,
  patchArticleChecked,
  patchArticleIndex,
  patchArticleInputs,
} from "../services/readingFillBlankProgress";
import { usePassageContentProtection } from "../hooks/usePassageContentProtection";

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
  const inputRef = useRef(null);
  const value = letters.join("");
  const placeholder = "_ ".repeat(blank.fillLen).trim();

  useImperativeHandle(ref, () => ({
    focusFirst: () => inputRef.current?.focus(),
  }));

  const handleChange = (event) => {
    const raw = event.target.value.replace(/[^a-zA-Z]/g, "").slice(0, blank.fillLen);
    const next = Array.from({ length: blank.fillLen }, (_, index) => raw[index] ?? "");
    onChange(next);
    if (raw.length >= blank.fillLen) {
      onFilled?.();
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onEnter?.();
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
      <span
        className="rfill-blank__line-wrap"
        style={{ "--fill-ch": blank.fillLen }}
        aria-label={`填空：${blank.answer}`}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={blank.fillLen}
          className="rfill-blank__line"
          value={value}
          placeholder={placeholder}
          aria-label={`填写 ${blank.fillLen} 个字母`}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      </span>
    </span>
  );
});

function ReadingFillBlank() {
  const articles = useMemo(() => getReadingFillBlankArticles(), []);
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
  const blankIds = useMemo(
    () => article?.segments.filter((segment) => segment.type === "blank").map((segment) => segment.id) ?? [],
    [article]
  );

  const reviewRows = useMemo(
    () => getReadingFillBlankReviewRows(articles, progress),
    [articles, progress]
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

  usePassageContentProtection(passageRef);

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
    if (!window.confirm("确定清除全部作答记录？此操作不可撤销。")) return;
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

  if (!article) {
    return (
      <div className="rfill">
        <p className="rfill__empty">暂无题目</p>
      </div>
    );
  }

  const gradeMap = new Map(grade?.results?.map((item) => [item.blank.id, item]) ?? []);
  const questionRange = getReadingFillBlankQuestionRange(articles, articleIndex);
  const reviewQuestionRange = getReadingFillBlankQuestionRange(articles, selectedReviewIndex);
  const selectedReviewRow = reviewRows[selectedReviewIndex];

  return (
    <div className="rfill">
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
            of {READING_FILL_BLANK_QUESTION_TOTAL}
          </span>
        </div>
        <div className="rfill__subbar-right">
          共 {READING_FILL_BLANK_TOTAL} 篇 · 当前{" "}
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
        <div className="rfill__body">
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
      )}
    </div>
  );
}

export default memo(ReadingFillBlank);
