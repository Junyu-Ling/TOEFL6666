export function normalizeAppMode(value) {
  return value === "sat" ? "sat" : "toefl";
}

export const APP_MODE_LABELS = {
  toefl: "TOEFL 6·6·6·6",
  sat: "SAT 800·800",
};

export const APP_MODE_TITLES = {
  toefl: "TOEFL 6·6·6·6",
  sat: "SAT 800·800",
};

export function getAlternateAppMode(mode) {
  return mode === "sat" ? "toefl" : "sat";
}

const TOEFL_ONLY_TABS = new Set(["reading-vocab", "reading-fill"]);
const SAT_ONLY_TABS = new Set(["transition-words", "familiar-obscure"]);

export function isTabAvailableInMode(tabId, appMode = "toefl") {
  const mode = normalizeAppMode(appMode);
  if (mode === "sat" && TOEFL_ONLY_TABS.has(tabId)) return false;
  if (mode === "toefl" && SAT_ONLY_TABS.has(tabId)) return false;
  return true;
}

export function normalizeActiveTabForMode(tabId, appMode = "toefl") {
  const fallback = "practice";
  if (!tabId || !isTabAvailableInMode(tabId, appMode)) return fallback;
  return tabId;
}
