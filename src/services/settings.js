import { normalizeCorrectSoundId, normalizeWrongSoundId } from "../utils/answerSounds.js";

const SETTINGS_KEY = "toefl666_settings";

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
};

export function normalizePracticeStyle(value) {
  return value === "recall" ? "recall" : "type";
}

export function clampDelaySec(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.autoAdvanceDelaySec;
  return Math.min(60, Math.max(0, Math.round(n)));
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
  saveSettings(next);
  return next;
}
