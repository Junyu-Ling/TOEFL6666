const SETTINGS_KEY = "toefl666_settings";

const DEFAULT_SETTINGS = {
  theme: "light",
  systemVoiceURI: "",
  autoReadOnNewWord: true,
  autoDictateOnNewWord: false,
  autoAdvanceAfterFlip: false,
  autoAdvanceDelaySec: 3,
  useCustomAiApi: false,
  aiApiKey: "",
  aiBaseUrl: "",
  aiModel: "",
  aiProviderId: "",
  practiceStyle: "type",
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
    return {
      theme: parsed.theme === "dark" ? "dark" : "light",
      systemVoiceURI: typeof parsed.systemVoiceURI === "string" ? parsed.systemVoiceURI : "",
      autoReadOnNewWord: parsed.autoReadOnNewWord !== false,
      autoDictateOnNewWord: parsed.autoDictateOnNewWord === true,
      autoAdvanceAfterFlip: parsed.autoAdvanceAfterFlip === true,
      autoAdvanceDelaySec: clampDelaySec(parsed.autoAdvanceDelaySec),
      useCustomAiApi: parsed.useCustomAiApi === true,
      aiApiKey: typeof parsed.aiApiKey === "string" ? parsed.aiApiKey : "",
      aiBaseUrl: typeof parsed.aiBaseUrl === "string" ? parsed.aiBaseUrl : "",
      aiModel: typeof parsed.aiModel === "string" ? parsed.aiModel : "",
      aiProviderId: typeof parsed.aiProviderId === "string" ? parsed.aiProviderId : "",
      practiceStyle: normalizePracticeStyle(parsed.practiceStyle),
    };
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
