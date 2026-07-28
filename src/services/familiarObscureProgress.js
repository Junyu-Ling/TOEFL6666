const PROGRESS_KEY = "toefl666_familiar_obscure_progress";

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

export function loadFamiliarObscureProgress() {
  const saved = loadRaw();
  return {
    quizIndex: Number.isFinite(saved?.quizIndex) ? saved.quizIndex : 0,
    quizOrder: Array.isArray(saved?.quizOrder) ? saved.quizOrder : [],
    masteredIds: Array.isArray(saved?.masteredIds) ? saved.masteredIds : [],
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
  saveFamiliarObscureProgress(next);
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
