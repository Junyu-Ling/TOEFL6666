export const TOEFL_SECTIONS = [
  { key: "reading", label: "阅读" },
  { key: "listening", label: "听力" },
  { key: "speaking", label: "口语" },
  { key: "writing", label: "写作" },
];

export const SAT_SECTIONS = [
  { key: "readingWriting", label: "阅读与文法" },
  { key: "math", label: "数学" },
];

export function normalizeToeflSectionScore(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const clamped = Math.min(6, Math.max(1, n));
  return Math.round(clamped * 2) / 2;
}

export function calcToeflTotal(scores = {}) {
  const values = TOEFL_SECTIONS.map(({ key }) => normalizeToeflSectionScore(scores[key]));
  if (values.some((v) => v == null)) return null;
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.round(avg * 2) / 2;
}

export function normalizeToeflTargetTotal(value) {
  return normalizeToeflSectionScore(value);
}

export function normalizeSatSectionScore(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const clamped = Math.min(800, Math.max(200, Math.round(n)));
  return Math.round(clamped / 10) * 10;
}

export function calcSatTotal(scores = {}) {
  const rw = normalizeSatSectionScore(scores.readingWriting);
  const math = normalizeSatSectionScore(scores.math);
  if (rw == null || math == null) return null;
  return rw + math;
}

export function normalizeSatTargetTotal(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const clamped = Math.min(1600, Math.max(400, Math.round(n)));
  return Math.round(clamped / 10) * 10;
}

export function normalizeTargetExam(value) {
  return value === "sat" ? "sat" : "toefl";
}

export function normalizeExamScores(examType, scores = {}) {
  if (examType === "sat") {
    const readingWriting = normalizeSatSectionScore(scores.readingWriting);
    const math = normalizeSatSectionScore(scores.math);
    return {
      readingWriting,
      math,
      total: readingWriting != null && math != null ? readingWriting + math : null,
    };
  }

  const next = {};
  for (const { key } of TOEFL_SECTIONS) {
    next[key] = normalizeToeflSectionScore(scores[key]);
  }
  next.total = calcToeflTotal(next);
  return next;
}

export function formatToeflScore(value) {
  if (value == null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatSatScore(value) {
  if (value == null) return "—";
  return String(value);
}
