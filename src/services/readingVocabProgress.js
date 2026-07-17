const PROGRESS_KEY = "toefl666_reading_vocab_progress";

function loadRaw() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function loadReadingVocabProgress() {
  return loadRaw();
}

export function saveReadingVocabProgress(progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // ignore quota errors
  }
}

export function getSavedSetProgress(setId) {
  const saved = loadRaw();
  const entry = saved?.sets?.[String(setId)];
  if (!entry || typeof entry !== "object") return null;
  return {
    completedIds: Array.isArray(entry.completedIds) ? entry.completedIds : [],
    leftItemIds: Array.isArray(entry.leftItemIds) ? entry.leftItemIds : [],
    rightItemIds: Array.isArray(entry.rightItemIds) ? entry.rightItemIds : [],
    setComplete: entry.setComplete === true,
  };
}

export function patchSavedSetProgress(setId, patch) {
  const saved = loadRaw() ?? { setIndex: 0, sets: {} };
  const key = String(setId);
  const prev = saved.sets[key] ?? {};
  saved.sets[key] = { ...prev, ...patch };
  saveReadingVocabProgress(saved);
  return saved;
}

export function patchReadingVocabSetIndex(setIndex) {
  const saved = loadRaw() ?? { setIndex: 0, sets: {} };
  saved.setIndex = setIndex;
  saveReadingVocabProgress(saved);
  return saved;
}
