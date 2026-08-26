import { normalizeCorrectSoundId, normalizeWrongSoundId } from "../utils/answerSounds.js";
import { normalizeAppMode } from "../utils/appMode.js";
import {
  calcSatTotal,
  calcToeflTotal,
  normalizeExamScores,
  normalizeSatTargetTotal,
  normalizeTargetExam,
  normalizeToeflTargetTotal,
} from "../utils/examScores.js";

const SETTINGS_KEY = "toefl666_settings";

const DEFAULT_TOEFL_SCORES = {
  reading: null,
  listening: null,
  speaking: null,
  writing: null,
  total: null,
};

const DEFAULT_SAT_SCORES = {
  readingWriting: null,
  math: null,
  total: null,
};

const DEFAULT_SETTINGS = {
  theme: "light",
  systemVoiceURI: "",
  autoReadOnNewWord: true,
  autoDictateOnNewWord: false,
  autoAdvanceAfterFlip: false,
  autoAdvanceDelaySec: 3,
  practiceStyle: "type",
  hideWordFirst: false,
  answerSounds: true,
  answerSoundCorrect: "default",
  answerSoundWrong: "default",
  appMode: "toefl",
  targetExam: "toefl",
  toeflScores: { ...DEFAULT_TOEFL_SCORES },
  toeflTargetTotal: null,
  satScores: { ...DEFAULT_SAT_SCORES },
  satTargetTotal: null,
  studyPlan: null,
  studyPlans: { toefl: null, sat: null },
  wordsPerRound: 20,
  enableRoundReview: true,
};

function normalizeStudyPlanEntry(value) {
  if (!value || typeof value !== "object") return null;
  const content = typeof value.content === "string" ? value.content.trim() : "";
  const generatedAt = typeof value.generatedAt === "number" ? value.generatedAt : null;
  if (!content) return null;
  return { content, generatedAt };
}

function normalizeStudyPlan(value) {
  if (!value || typeof value !== "object") return null;
  const examType = normalizeTargetExam(value.examType);
  const entry = normalizeStudyPlanEntry(value);
  if (!entry) return null;
  return { examType, ...entry };
}

export function normalizeStudyPlans(parsed) {
  const legacy = normalizeStudyPlan(parsed?.studyPlan);
  const raw = parsed?.studyPlans && typeof parsed.studyPlans === "object" ? parsed.studyPlans : {};
  const toefl =
    normalizeStudyPlanEntry(raw.toefl) ??
    (legacy?.examType === "toefl" ? { content: legacy.content, generatedAt: legacy.generatedAt } : null);
  const sat =
    normalizeStudyPlanEntry(raw.sat) ??
    (legacy?.examType === "sat" ? { content: legacy.content, generatedAt: legacy.generatedAt } : null);
  return { toefl, sat };
}

export function getStudyPlanForExam(settings, examType) {
  const mode = normalizeTargetExam(examType);
  const plans = normalizeStudyPlans(settings);
  return plans[mode];
}

export function normalizePracticeStyle(value) {
  return value === "recall" ? "recall" : "type";
}

export function clampDelaySec(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.autoAdvanceDelaySec;
  return Math.min(60, Math.max(0, Math.round(n)));
}

export function clampWordsPerRound(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_SETTINGS.wordsPerRound;
  return Math.min(100, Math.max(5, Math.round(n)));
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    const next = {
      theme: parsed.theme === "dark" ? "dark" : "light",
      systemVoiceURI: typeof parsed.systemVoiceURI === "string" ? parsed.systemVoiceURI : "",
      autoReadOnNewWord: parsed.autoReadOnNewWord !== false,
      autoDictateOnNewWord: parsed.autoDictateOnNewWord === true,
      autoAdvanceAfterFlip: parsed.autoAdvanceAfterFlip === true,
      autoAdvanceDelaySec: clampDelaySec(parsed.autoAdvanceDelaySec),
      practiceStyle: normalizePracticeStyle(parsed.practiceStyle),
      hideWordFirst: parsed.hideWordFirst === true,
      answerSounds: parsed.answerSounds !== false,
      answerSoundCorrect: normalizeCorrectSoundId(parsed.answerSoundCorrect),
      answerSoundWrong: normalizeWrongSoundId(parsed.answerSoundWrong),
      appMode: normalizeAppMode(parsed.appMode ?? parsed.targetExam),
      targetExam: normalizeTargetExam(parsed.targetExam ?? parsed.appMode),
      toeflScores: normalizeExamScores("toefl", parsed.toeflScores || {}),
      toeflTargetTotal: normalizeToeflTargetTotal(parsed.toeflTargetTotal),
      satScores: normalizeExamScores("sat", parsed.satScores || {}),
      satTargetTotal: normalizeSatTargetTotal(parsed.satTargetTotal),
      studyPlan: null,
      studyPlans: normalizeStudyPlans(parsed),
      wordsPerRound: clampWordsPerRound(parsed.wordsPerRound),
      enableRoundReview: parsed.enableRoundReview !== false,
    };
    if ("aiApiKey" in parsed) {
      saveSettings(next);
    }
    return next;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function patchSettings(patch) {
  const next = { ...loadSettings(), ...patch };
  if ("autoAdvanceDelaySec" in patch) {
    next.autoAdvanceDelaySec = clampDelaySec(next.autoAdvanceDelaySec);
  }
  if ("wordsPerRound" in patch) {
    next.wordsPerRound = clampWordsPerRound(next.wordsPerRound);
  }
  if ("appMode" in patch) {
    next.appMode = normalizeAppMode(next.appMode);
    next.targetExam = next.appMode;
  }
  if ("targetExam" in patch) {
    next.targetExam = normalizeTargetExam(next.targetExam);
  }
  if ("toeflScores" in patch) {
    next.toeflScores = normalizeExamScores("toefl", { ...next.toeflScores, ...patch.toeflScores });
  }
  if ("satScores" in patch) {
    next.satScores = normalizeExamScores("sat", { ...next.satScores, ...patch.satScores });
  }
  if ("toeflTargetTotal" in patch) {
    next.toeflTargetTotal = normalizeToeflTargetTotal(next.toeflTargetTotal);
  }
  if ("satTargetTotal" in patch) {
    next.satTargetTotal = normalizeSatTargetTotal(next.satTargetTotal);
  }
  if ("studyPlan" in patch) {
    const legacy = normalizeStudyPlan(patch.studyPlan);
    if (legacy) {
      next.studyPlans = {
        ...normalizeStudyPlans(next),
        [legacy.examType]: {
          content: legacy.content,
          generatedAt: legacy.generatedAt,
        },
      };
    }
    next.studyPlan = null;
  }
  if ("studyPlans" in patch) {
    next.studyPlans = normalizeStudyPlans({ ...next, studyPlans: patch.studyPlans });
  }
  saveSettings(next);
  return next;
}

export function updateToeflSectionScore(currentScores, key, value) {
  const next = normalizeExamScores("toefl", { ...currentScores, [key]: value });
  return next;
}

export function updateSatSectionScore(currentScores, key, value) {
  const next = normalizeExamScores("sat", { ...currentScores, [key]: value });
  return next;
}

export { DEFAULT_TOEFL_SCORES, DEFAULT_SAT_SCORES, calcToeflTotal, calcSatTotal };
