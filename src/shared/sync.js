import { AI_CHAT_HISTORY_KEY } from "../services/aiChatHistory.js";

export const SYNC_PREFIX = "toefl666_";
export const SYNC_VERSION = 1;
export const PAIRING_CODE_LENGTH = 8;
export const PAIRING_STORAGE_KEY = "toefl666_pairing";

/** 不参与云端同步的本地键 */
export const SYNC_EXCLUDED_KEYS = new Set([
  PAIRING_STORAGE_KEY,
  "toefl666_last_sync",
  AI_CHAT_HISTORY_KEY,
]);

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizePairingCode(input = "") {
  return String(input).replace(/[\s-]/g, "").toUpperCase();
}

export function formatPairingCode(input = "") {
  const code = normalizePairingCode(input);
  if (code.length !== PAIRING_CODE_LENGTH) return code;
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function isValidPairingCode(input = "") {
  const code = normalizePairingCode(input);
  return code.length === PAIRING_CODE_LENGTH && /^[A-Z0-9]+$/.test(code);
}

export function generatePairingCode() {
  let raw = "";
  for (let i = 0; i < PAIRING_CODE_LENGTH; i++) {
    raw += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return formatPairingCode(raw);
}

export function exportLocalData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(SYNC_PREFIX) && !SYNC_EXCLUDED_KEYS.has(key)) {
      data[key] = localStorage.getItem(key);
    }
  }
  return {
    version: SYNC_VERSION,
    exportedAt: Date.now(),
    data,
  };
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function mergeWordEntry(a, b) {
  const aTime = a.savedAt || 0;
  const bTime = b.savedAt || 0;
  const primary = aTime >= bTime ? a : b;
  const secondary = primary === a ? b : a;
  return {
    ...primary,
    wrongCount: Math.max(a.wrongCount || 0, b.wrongCount || 0),
    memory_trick: primary.memory_trick || secondary.memory_trick,
    definitions: primary.definitions?.length ? primary.definitions : secondary.definitions,
    ai_feedback: primary.ai_feedback || secondary.ai_feedback,
  };
}

function mergeWordLists(localList, remoteList) {
  const map = new Map();
  for (const item of localList) map.set(item.word, item);
  for (const item of remoteList) {
    const existing = map.get(item.word);
    map.set(item.word, existing ? mergeWordEntry(existing, item) : item);
  }
  return [...map.values()];
}

function mergeBookSession(localSession, remoteSession) {
  if (!localSession) return remoteSession || null;
  if (!remoteSession) return localSession;

  const sameQueue =
    localSession.queue.length === remoteSession.queue.length &&
    localSession.queue.every((item, index) => item.word === remoteSession.queue[index]?.word);

  if (sameQueue) {
    return {
      queue: localSession.queue,
      index: Math.max(localSession.index || 0, remoteSession.index || 0),
    };
  }

  const localRatio = localSession.queue.length
    ? (localSession.index || 0) / localSession.queue.length
    : 0;
  const remoteRatio = remoteSession.queue.length
    ? (remoteSession.index || 0) / remoteSession.queue.length
    : 0;
  return localRatio >= remoteRatio ? localSession : remoteSession;
}

function mergeProgressObject(local, remote) {
  const merged = { ...local };
  merged.listProgress = { ...(local.listProgress || {}) };

  for (const [listId, entry] of Object.entries(remote.listProgress || {})) {
    const localEntry = merged.listProgress[listId];
    if (!localEntry || (entry.updatedAt || 0) > (localEntry.updatedAt || 0)) {
      merged.listProgress[listId] = entry;
    }
  }

  const localBooks = local.bookPractices || {};
  const remoteBooks = remote.bookPractices || {};
  merged.bookPractices = {
    unrecognized: mergeBookSession(localBooks.unrecognized, remoteBooks.unrecognized),
    recognized: mergeBookSession(localBooks.recognized, remoteBooks.recognized),
    bank: mergeBookSession(localBooks.bank, remoteBooks.bank),
  };

  const localPaused = local.bookPracticePaused || {};
  const remotePaused = remote.bookPracticePaused || {};
  merged.bookPracticePaused = {
    unrecognized: Boolean(localPaused.unrecognized && remotePaused.unrecognized),
    recognized: Boolean(localPaused.recognized && remotePaused.recognized),
    bank: Boolean(localPaused.bank && remotePaused.bank),
  };

  if ((remote.updatedAt || 0) > (local.updatedAt || 0)) {
    if (remote.activeListId) merged.activeListId = remote.activeListId;
    if (remote.activeTab) merged.activeTab = remote.activeTab;
    if (typeof remote.reviewShuffle === "boolean") merged.reviewShuffle = remote.reviewShuffle;
  }

  return merged;
}

function mergeStreakObject(local, remote) {
  const loginDates = [...new Set([...(local.loginDates || []), ...(remote.loginDates || [])])].sort();
  const marks = new Map();
  for (const mark of [...(local.examMarks || []), ...(remote.examMarks || [])]) {
    if (!mark?.id) continue;
    const existing = marks.get(mark.id);
    if (!existing || String(mark.dateKey) > String(existing.dateKey)) {
      marks.set(mark.id, mark);
    }
  }
  return {
    ...local,
    ...remote,
    loginDates,
    longestStreak: Math.max(local.longestStreak || 0, remote.longestStreak || 0),
    examMarks: [...marks.values()],
  };
}

function mergeSettingsValue(localStr, remoteStr) {
  const local = parseJson(localStr, {});
  const remote = parseJson(remoteStr, {});
  const merged = { ...local, ...remote };
  delete merged.aiApiKey;
  return JSON.stringify(merged);
}

/** 双向合并两台设备的同步包，保留双方学习增量。 */
export function mergeSyncBundles(localBundle, remoteBundle) {
  if (!remoteBundle?.data) return localBundle;
  if (!localBundle?.data) return remoteBundle;

  const mergedData = { ...localBundle.data };
  const remoteData = remoteBundle.data;

  for (const [key, remoteValue] of Object.entries(remoteData)) {
    if (!key.startsWith(SYNC_PREFIX) || SYNC_EXCLUDED_KEYS.has(key)) continue;
    const localValue = mergedData[key];

    if (key === "toefl666_recognized" || key === "toefl666_unrecognized") {
      mergedData[key] = JSON.stringify(
        mergeWordLists(parseJson(localValue, []), parseJson(remoteValue, []))
      );
      continue;
    }

    if (key === "toefl666_progress") {
      mergedData[key] = JSON.stringify(
        mergeProgressObject(parseJson(localValue, {}), parseJson(remoteValue, {}))
      );
      continue;
    }

    if (key === "toefl666_streak") {
      mergedData[key] = JSON.stringify(
        mergeStreakObject(parseJson(localValue, {}), parseJson(remoteValue, {}))
      );
      continue;
    }

    if (key === "toefl666_settings") {
      mergedData[key] = mergeSettingsValue(localValue, remoteValue);
      continue;
    }

    if (!localValue) {
      mergedData[key] = remoteValue;
      continue;
    }

    mergedData[key] = remoteBundle.exportedAt >= localBundle.exportedAt ? remoteValue : localValue;
  }

  return {
    version: SYNC_VERSION,
    exportedAt: Math.max(localBundle.exportedAt || 0, remoteBundle.exportedAt || 0),
    data: mergedData,
  };
}

export function loadPairingSession() {
  try {
    const raw = localStorage.getItem(PAIRING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const code = normalizePairingCode(parsed.code || "");
    if (!isValidPairingCode(code)) return null;
    return {
      code,
      role: parsed.role === "host" ? "host" : "linked",
      linkedAt: parsed.linkedAt || Date.now(),
      lastPushedAt: parsed.lastPushedAt || 0,
      lastRemoteUpdatedAt: parsed.lastRemoteUpdatedAt || 0,
    };
  } catch {
    return null;
  }
}

export function savePairingSession(session) {
  if (!session?.code || !isValidPairingCode(session.code)) {
    localStorage.removeItem(PAIRING_STORAGE_KEY);
    return;
  }
  localStorage.setItem(
    PAIRING_STORAGE_KEY,
    JSON.stringify({
      code: normalizePairingCode(session.code),
      role: session.role === "host" ? "host" : "linked",
      linkedAt: session.linkedAt || Date.now(),
      lastPushedAt: session.lastPushedAt || 0,
      lastRemoteUpdatedAt: session.lastRemoteUpdatedAt || 0,
    })
  );
}

export function clearPairingSession() {
  localStorage.removeItem(PAIRING_STORAGE_KEY);
}

export function importLocalData(bundle) {
  if (!bundle || bundle.version !== SYNC_VERSION || !bundle.data) {
    throw new Error("同步数据格式无效");
  }

  try {
    const raw = localStorage.getItem("toefl666_settings");
    if (raw) {
      const settings = JSON.parse(raw);
      if (settings.aiApiKey) {
        delete settings.aiApiKey;
        localStorage.setItem("toefl666_settings", JSON.stringify(settings));
      }
    }
  } catch {
    // ignore
  }

  const preserved = {};
  for (const key of SYNC_EXCLUDED_KEYS) {
    const value = localStorage.getItem(key);
    if (value != null) preserved[key] = value;
  }

  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(SYNC_PREFIX) && !SYNC_EXCLUDED_KEYS.has(key)) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }

  for (const [key, value] of Object.entries(bundle.data)) {
    if (!key.startsWith(SYNC_PREFIX) || typeof value !== "string") continue;
    if (SYNC_EXCLUDED_KEYS.has(key)) continue;
    if (key === "toefl666_settings") {
      try {
        const settings = JSON.parse(value);
        delete settings.aiApiKey;
        localStorage.setItem(key, JSON.stringify(settings));
        continue;
      } catch {
        // fall through
      }
    }
    localStorage.setItem(key, value);
  }

  for (const [key, value] of Object.entries(preserved)) {
    localStorage.setItem(key, value);
  }
}

export function getSyncSummary() {
  try {
    const recognized = JSON.parse(localStorage.getItem("toefl666_recognized") || "[]");
    const unrecognized = JSON.parse(localStorage.getItem("toefl666_unrecognized") || "[]");
    const progress = JSON.parse(localStorage.getItem("toefl666_progress") || "{}");
    const listCount = Object.keys(progress.listProgress || {}).length;
    return {
      recognized: Array.isArray(recognized) ? recognized.length : 0,
      unrecognized: Array.isArray(unrecognized) ? unrecognized.length : 0,
      listCount,
    };
  } catch {
    return { recognized: 0, unrecognized: 0, listCount: 0 };
  }
}
