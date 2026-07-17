const PROGRESS_KEY = "toefl666_lexgrid_progress";

export function loadLexGridRound() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.target?.word || !Array.isArray(parsed.currentGuess)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLexGridRound(round) {
  if (!round) return;
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(round));
  } catch {
    // ignore quota errors
  }
}

export function clearLexGridRound() {
  try {
    localStorage.removeItem(PROGRESS_KEY);
  } catch {
    // ignore
  }
}
