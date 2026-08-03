import { buildShuffledTransitionOrder } from "../utils/transitionWords";

const STORAGE_KEY = "toefl666_sat_transition_words";

const DEFAULT_PROGRESS = {
  shuffle: true,
  order: [],
  index: 0,
  unknownIds: [],
  masteredIds: [],
};

export const TW_PROGRESS_EVENT = "toefl666-transition-words-progress";

function emitProgressChange() {
  window.dispatchEvent(new CustomEvent(TW_PROGRESS_EVENT));
}

export function loadTransitionWordsProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PROGRESS,
      shuffle: parsed.shuffle !== false,
      order: Array.isArray(parsed.order) ? parsed.order : [],
      index: typeof parsed.index === "number" ? parsed.index : 0,
      unknownIds: Array.isArray(parsed.unknownIds) ? parsed.unknownIds : [],
      masteredIds: Array.isArray(parsed.masteredIds) ? parsed.masteredIds : [],
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveTransitionWordsProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  emitProgressChange();
}

export function patchTransitionWordsProgress(patch) {
  const next = { ...loadTransitionWordsProgress(), ...patch };
  saveTransitionWordsProgress(next);
  return next;
}

export function resolveTransitionSession(entryCount, shuffle = true, saved = loadTransitionWordsProgress()) {
  if (
    saved.order.length === entryCount &&
    entryCount > 0
  ) {
    return {
      order: saved.order,
      index: Math.max(0, Math.min(saved.index ?? 0, entryCount - 1)),
      shuffle: saved.shuffle !== false,
    };
  }

  return {
    order: shuffle
      ? buildShuffledTransitionOrder(entryCount)
      : Array.from({ length: entryCount }, (_, index) => index),
    index: 0,
    shuffle,
  };
}

export function applyTransitionWordResult(entryIdRaw, aiResult) {
  const entryId = Number(entryIdRaw);
  if (!entryId || !aiResult) return loadTransitionWordsProgress();

  const progress = loadTransitionWordsProgress();
  const unknown = new Set(progress.unknownIds);
  const mastered = new Set(progress.masteredIds);

  if (aiResult.is_correct) {
    unknown.delete(entryId);
    mastered.add(entryId);
  } else {
    unknown.add(entryId);
    mastered.delete(entryId);
  }

  return patchTransitionWordsProgress({
    unknownIds: [...unknown],
    masteredIds: [...mastered],
  });
}

export function isTransitionWordReviewEntry(entryId, progress = loadTransitionWordsProgress()) {
  return progress.unknownIds.includes(entryId);
}

export function filterTransitionReviewEntries(entries, progress = loadTransitionWordsProgress()) {
  const unknown = new Set(progress.unknownIds);
  return entries.filter((entry) => unknown.has(entry.id));
}
