const PROGRESS_KEY = "toefl666_sat_vocab_progress";
export const SAT_VOCAB_PROGRESS_EVENT = "satVocabProgressChange";

function defaultProgress() {
  return { masteredIds: [], reviewIds: [], index: 0, shuffle: true };
}

export function loadSatVocabProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw);
    return {
      masteredIds: Array.isArray(parsed.masteredIds) ? parsed.masteredIds : [],
      reviewIds: Array.isArray(parsed.reviewIds) ? parsed.reviewIds : [],
      index: typeof parsed.index === "number" ? parsed.index : 0,
      shuffle: parsed.shuffle !== false,
    };
  } catch {
    return defaultProgress();
  }
}

function save(progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  window.dispatchEvent(new CustomEvent(SAT_VOCAB_PROGRESS_EVENT));
}

export function patchSatVocabProgress(patch) {
  const current = loadSatVocabProgress();
  save({ ...current, ...patch });
}

export function markSatVocabMastered(id) {
  const p = loadSatVocabProgress();
  save({
    ...p,
    masteredIds: p.masteredIds.includes(id) ? p.masteredIds : [...p.masteredIds, id],
    reviewIds: p.reviewIds.filter((x) => x !== id),
  });
}

export function markSatVocabReview(id) {
  const p = loadSatVocabProgress();
  save({
    ...p,
    reviewIds: p.reviewIds.includes(id) ? p.reviewIds : [...p.reviewIds, id],
    masteredIds: p.masteredIds.filter((x) => x !== id),
  });
}
