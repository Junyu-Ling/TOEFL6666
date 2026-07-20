export function normalizeAppMode(value) {
  return value === "sat" ? "sat" : "toefl";
}

export const APP_MODE_LABELS = {
  toefl: "TOEFL 6·6·6·6",
  sat: "SAT 800·800",
};

export const APP_MODE_TITLES = {
  toefl: "☀️ TOEFL 6·6·6·6",
  sat: "🌙 SAT 800·800",
};

export function getAlternateAppMode(mode) {
  return mode === "sat" ? "toefl" : "sat";
}

const TOEFL_ONLY_TABS = new Set(["reading-vocab"]);

export function isTabAvailableInMode(tabId, appMode = "toefl") {
  if (normalizeAppMode(appMode) === "sat" && TOEFL_ONLY_TABS.has(tabId)) return false;
  return true;
}

export function normalizeActiveTabForMode(tabId, appMode = "toefl") {
  const fallback = "practice";
  if (!tabId || !isTabAvailableInMode(tabId, appMode)) return fallback;
  return tabId;
}
