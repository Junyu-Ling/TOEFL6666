const PROGRESS_KEY = "toefl666_familiar_obscure_progress";

export const FOBS_PROGRESS_EVENT = "toefl666-fobs-progress";

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

export function normalizeEntryId(id) {
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

function normalizeIdList(list) {
  if (!Array.isArray(list)) return [];
  const ids = list.map(normalizeEntryId).filter((id) => id != null);
  return [...new Set(ids)];
}

function emitProgressChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(FOBS_PROGRESS_EVENT));
  }
}

export function loadFamiliarObscureProgress() {
  const saved = loadRaw();
  return {
    quizIndex: Number.isFinite(saved?.quizIndex) ? saved.quizIndex : 0,
    quizOrder: Array.isArray(saved?.quizOrder) ? saved.quizOrder : [],
    quizScopeKey: typeof saved?.quizScopeKey === "string" ? saved.quizScopeKey : "",
    masteredIds: normalizeIdList(saved?.masteredIds),
    unknownIds: normalizeIdList(saved?.unknownIds),
    lastScope: normalizeScope(saved?.lastScope),
  };
}

function normalizeScope(scope) {
  if (!scope || typeof scope !== "object") {
    return { fromId: 1, toId: 9999, onlyReview: false, onlyUnmastered: false };
  }
  return {
    fromId: Number.isFinite(scope.fromId) ? scope.fromId : 1,
    toId: Number.isFinite(scope.toId) ? scope.toId : 9999,
    onlyReview: Boolean(scope.onlyReview),
    onlyUnmastered: Boolean(scope.onlyUnmastered),
  };
}

export function saveFamiliarObscureProgress(progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // ignore quota errors
  }
}

export function patchFamiliarObscureProgress(patch) {
  const next = { ...loadFamiliarObscureProgress(), ...patch };
  if ("masteredIds" in patch) next.masteredIds = normalizeIdList(next.masteredIds);
  if ("unknownIds" in patch) next.unknownIds = normalizeIdList(next.unknownIds);
  saveFamiliarObscureProgress(next);
  if ("unknownIds" in patch || "masteredIds" in patch) {
    emitProgressChange();
  }
  return next;
}

export function buildShuffledOrder(total) {
  const order = Array.from({ length: total }, (_, index) => index);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function buildQuizScopeKey(scope, entryCount) {
  const fromId = Math.min(scope.fromId, scope.toId);
  const toId = Math.max(scope.fromId, scope.toId);
  return `${fromId}-${toId}-${scope.onlyReview ? 1 : 0}-${scope.onlyUnmastered ? 1 : 0}-${entryCount}`;
}

export function applyFamiliarObscureQuizResult(entryIdRaw, aiResult) {
  const entryId = normalizeEntryId(entryIdRaw);
  if (!entryId || !aiResult) return loadFamiliarObscureProgress();

  const progress = loadFamiliarObscureProgress();
  const masteredIds = new Set(progress.masteredIds);
  const unknownIds = new Set(progress.unknownIds);

  if (aiResult.is_correct) {
    masteredIds.add(entryId);
    unknownIds.delete(entryId);
  } else {
    unknownIds.add(entryId);
  }

  return patchFamiliarObscureProgress({
    masteredIds: [...masteredIds],
    unknownIds: [...unknownIds],
  });
}

export function isFamiliarObscureReviewEntry(entryId, progress = loadFamiliarObscureProgress()) {
  const id = normalizeEntryId(entryId);
  if (id == null) return false;
  return new Set(progress.unknownIds).has(id);
}
