export function normalizeAppMode(value) {
  return value === "sat" ? "sat" : "toefl";
}

export const APP_MODE_LABELS = {
  toefl: "TOEFL 6·6·6·6",
  sat: "SAT 800·800",
};

export const APP_MODE_TITLES = {
  toefl: "☀ TOEFL 6·6·6·6",
  sat: "🌙 SAT 800·800",
};

export function getAlternateAppMode(mode) {
  return mode === "sat" ? "toefl" : "sat";
}
