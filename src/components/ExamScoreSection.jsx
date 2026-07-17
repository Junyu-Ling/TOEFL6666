import { useMemo, useRef, useState, useEffect } from "react";
import { useSettings } from "../context/SettingsContext";
import {
  TOEFL_SECTIONS,
  SAT_SECTIONS,
  formatSatScore,
  formatToeflScore,
} from "../utils/examScores";
import { getSyncSummary } from "../shared/sync";
import { loadStreak, daysUntil } from "../services/streak";
import { streamStudyPlan } from "../services/studyPlan";
import RichAiContent from "./RichAiContent";

function scoreInputValue(value) {
  return value == null ? "" : String(value);
}

function examScoreMeta(settings) {
  if (settings.targetExam === "sat") {
    const total = settings.satScores?.total;
    const target = settings.satTargetTotal;
    if (total != null && target != null) return `SAT ${total} → ${target}`;
    if (total != null) return `SAT 总分 ${total}`;
    return "未填写";
  }

  const total = settings.toeflScores?.total;
  const target = settings.toeflTargetTotal;
  if (total != null && target != null) return `托福 ${formatToeflScore(total)} → ${formatToeflScore(target)}`;
  if (total != null) return `托福 ${formatToeflScore(total)}`;
  return "未填写";
}

export default function ExamScoreSection() {
  const {
    settings,
    setTargetExam,
    setToeflSectionScore,
    setSatSectionScore,
    setToeflTargetTotal,
    setSatTargetTotal,
    setStudyPlan,
  } = useSettings();

  const [planDraft, setPlanDraft] = useState(settings.studyPlan?.content || "");
  const [planBusy, setPlanBusy] = useState(false);
  const [planError, setPlanError] = useState("");
  const abortRef = useRef(null);

  useEffect(() => {
    if (!planBusy) {
      setPlanDraft(settings.studyPlan?.content || "");
    }
  }, [settings.studyPlan, planBusy]);

  const isToefl = settings.targetExam !== "sat";
  const examContext = useMemo(() => {
    const streak = loadStreak();
    const examType = settings.targetExam;
    const marks = (streak.examMarks || []).filter((m) => m.type === examType);
    const sorted = [...marks].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    const upcoming = sorted.find((m) => daysUntil(m.dateKey) >= 0);
    return {
      examDates: sorted.map((m) => m.dateKey),
      daysUntilExam: upcoming ? daysUntil(upcoming.dateKey) : null,
    };
  }, [settings.targetExam]);

  const canGenerate = isToefl
    ? settings.toeflScores?.total != null && settings.toeflTargetTotal != null
    : settings.satScores?.total != null && settings.satTargetTotal != null;

  function handleSectionBlur(examType, key, raw) {
    const trimmed = raw.trim();
    if (examType === "toefl") {
      setToeflSectionScore(key, trimmed === "" ? null : trimmed);
      return;
    }
    setSatSectionScore(key, trimmed === "" ? null : trimmed);
  }

  function handleTargetBlur(raw) {
    const trimmed = raw.trim();
    if (isToefl) {
      setToeflTargetTotal(trimmed === "" ? null : trimmed);
      return;
    }
    setSatTargetTotal(trimmed === "" ? null : trimmed);
  }

  async function handleGeneratePlan() {
    if (!canGenerate || planBusy) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPlanBusy(true);
    setPlanError("");
    setPlanDraft("");

    const syncSummary = getSyncSummary();
    const payload = {
      examType: settings.targetExam,
      currentScores: isToefl ? settings.toeflScores : settings.satScores,
      targetTotal: isToefl ? settings.toeflTargetTotal : settings.satTargetTotal,
      vocabProgress: {
        recognized: syncSummary.recognized,
        unrecognized: syncSummary.unrecognized,
      },
      examDates: examContext.examDates,
      daysUntilExam: examContext.daysUntilExam,
    };

    try {
      const plan = await streamStudyPlan({
        payload,
        signal: controller.signal,
        onDelta: (_delta, full) => setPlanDraft(full),
      });

      const saved = {
        examType: settings.targetExam,
        content: plan,
        generatedAt: Date.now(),
      };
      setStudyPlan(saved);
      setPlanDraft(plan);
    } catch (err) {
      if (err.name !== "AbortError") {
        setPlanError(err.message || "生成失败，请稍后重试");
      }
    } finally {
      setPlanBusy(false);
      abortRef.current = null;
    }
  }

  function handleCancelPlan() {
    abortRef.current?.abort();
    setPlanBusy(false);
  }

  const displayedPlan = planDraft || settings.studyPlan?.content || "";
  const planStale =
    settings.studyPlan?.content &&
    settings.studyPlan.examType !== settings.targetExam;

  return (
    <details className="settings-group">
      <summary className="settings-group__summary">
        <span className="settings-group__title">考试分数与提分计划</span>
        <span className="settings-group__meta">{examScoreMeta(settings)}</span>
      </summary>
      <div className="settings-group__body">
        <p className="settings-hint settings-hint--compact">
          填写实考分数与目标分，AI 将分析薄弱科目并生成个性化提分计划。托福采用 2026 新格式（四门各 1–6 分，总分为四科平均）。
        </p>

        <div className="settings-field">
          <span>考试类型</span>
          <div className="theme-toggle">
            <button
              type="button"
              className={`theme-toggle__btn ${isToefl ? "theme-toggle__btn--active" : ""}`}
              onClick={() => setTargetExam("toefl")}
            >
              托福
            </button>
            <button
              type="button"
              className={`theme-toggle__btn ${!isToefl ? "theme-toggle__btn--active" : ""}`}
              onClick={() => setTargetExam("sat")}
            >
              SAT
            </button>
          </div>
        </div>

        {isToefl ? (
          <>
            <div className="settings-score-grid">
              {TOEFL_SECTIONS.map(({ key, label }) => (
                <label key={key} className="settings-field settings-field--score">
                  <span>{label}</span>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    step={0.5}
                    inputMode="decimal"
                    placeholder="1–6"
                    defaultValue={scoreInputValue(settings.toeflScores?.[key])}
                    key={`toefl-${key}-${settings.toeflScores?.[key] ?? "empty"}`}
                    onBlur={(e) => handleSectionBlur("toefl", key, e.target.value)}
                  />
                </label>
              ))}
            </div>
            <div className="settings-score-total">
              <span>实考总分</span>
              <strong>{formatToeflScore(settings.toeflScores?.total)}</strong>
              <small>四科平均分，步长 0.5</small>
            </div>
            <label className="settings-field settings-field--spaced">
              <span>目标总分</span>
              <input
                type="number"
                min={1}
                max={6}
                step={0.5}
                inputMode="decimal"
                placeholder="例如 5.5"
                defaultValue={scoreInputValue(settings.toeflTargetTotal)}
                key={`toefl-target-${settings.toeflTargetTotal ?? "empty"}`}
                onBlur={(e) => handleTargetBlur(e.target.value)}
              />
            </label>
          </>
        ) : (
          <>
            <div className="settings-score-grid settings-score-grid--sat">
              {SAT_SECTIONS.map(({ key, label }) => (
                <label key={key} className="settings-field settings-field--score">
                  <span>{label}</span>
                  <input
                    type="number"
                    min={200}
                    max={800}
                    step={10}
                    inputMode="numeric"
                    placeholder="200–800"
                    defaultValue={scoreInputValue(settings.satScores?.[key])}
                    key={`sat-${key}-${settings.satScores?.[key] ?? "empty"}`}
                    onBlur={(e) => handleSectionBlur("sat", key, e.target.value)}
                  />
                </label>
              ))}
            </div>
            <div className="settings-score-total">
              <span>实考总分</span>
              <strong>{formatSatScore(settings.satScores?.total)}</strong>
              <small>阅读文法 + 数学</small>
            </div>
            <label className="settings-field settings-field--spaced">
              <span>目标总分</span>
              <input
                type="number"
                min={400}
                max={1600}
                step={10}
                inputMode="numeric"
                placeholder="例如 1450"
                defaultValue={scoreInputValue(settings.satTargetTotal)}
                key={`sat-target-${settings.satTargetTotal ?? "empty"}`}
                onBlur={(e) => handleTargetBlur(e.target.value)}
              />
            </label>
          </>
        )}

        <div className="settings-score-actions">
          <button
            type="button"
            className="settings-action-btn settings-action-btn--primary"
            onClick={handleGeneratePlan}
            disabled={!canGenerate || planBusy}
          >
            {planBusy ? "正在生成计划…" : "AI 生成提分计划"}
          </button>
          {planBusy ? (
            <button type="button" className="settings-action-btn" onClick={handleCancelPlan}>
              取消
            </button>
          ) : null}
        </div>

        {!canGenerate ? (
          <p className="settings-hint settings-hint--compact">请先填完整实考分数与目标总分。</p>
        ) : null}

        {planError ? <p className="settings-status settings-status--error">{planError}</p> : null}

        {planStale ? (
          <p className="settings-hint settings-hint--compact">
            当前显示的是另一种考试类型的计划，重新生成可更新。
          </p>
        ) : null}

        {displayedPlan ? (
          <div className="settings-study-plan">
            {settings.studyPlan?.generatedAt && !planBusy ? (
              <p className="settings-study-plan__meta">
                生成于 {new Date(settings.studyPlan.generatedAt).toLocaleString("zh-CN")}
              </p>
            ) : null}
            <RichAiContent content={displayedPlan} />
          </div>
        ) : null}
      </div>
    </details>
  );
}
