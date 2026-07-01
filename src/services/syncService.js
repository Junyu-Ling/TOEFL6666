import {
  clearPairingSession,
  exportLocalData,
  formatPairingCode,
  importLocalData,
  loadPairingSession,
  mergeSyncBundles,
  normalizePairingCode,
  savePairingSession,
} from "../shared/sync";
import { pullSyncPayload, pushSyncPayload } from "./syncApi";

export const SYNC_APPLIED_EVENT = "toefl666-sync-applied";
export const SYNC_STATUS_EVENT = "toefl666-sync-status";

const POLL_MS = 5000;
const PUSH_DEBOUNCE_MS = 2000;

let pollTimer = null;
let pushTimer = null;
let dirty = false;
let suppressDirty = false;
let syncing = false;
let started = false;
let lastStatus = { state: "idle", message: "" };

function emitStatus(patch) {
  lastStatus = { ...lastStatus, ...patch };
  window.dispatchEvent(new CustomEvent(SYNC_STATUS_EVENT, { detail: lastStatus }));
}

function emitApplied() {
  window.dispatchEvent(new CustomEvent(SYNC_APPLIED_EVENT));
}

function getSession() {
  return loadPairingSession();
}

function updateSession(patch) {
  const current = getSession();
  if (!current) return null;
  const next = { ...current, ...patch };
  savePairingSession(next);
  return next;
}

async function applyRemotePayload(result) {
  const session = getSession();
  if (!session) return false;

  const remoteUpdatedAt = result.updatedAt || result.payload?.exportedAt || 0;
  if (remoteUpdatedAt <= session.lastRemoteUpdatedAt) return false;

  const localBundle = exportLocalData();
  const merged = mergeSyncBundles(localBundle, result.payload);
  const changed = JSON.stringify(merged.data) !== JSON.stringify(localBundle.data);

  suppressDirty = true;
  importLocalData(merged);
  suppressDirty = false;

  updateSession({ lastRemoteUpdatedAt: remoteUpdatedAt });
  return changed;
}

async function pullAndMerge({ throwOnError = false } = {}) {
  const session = getSession();
  if (!session || syncing) return false;

  syncing = true;
  emitStatus({ state: "pulling", message: "正在同步云端进度…" });
  try {
    const result = await pullSyncPayload(session.code);
    const changed = await applyRemotePayload(result);

    emitStatus({
      state: "paired",
      message: `实时同步中 · ${formatPairingCode(session.code)}`,
      code: formatPairingCode(session.code),
    });
    if (changed) emitApplied();
    return changed;
  } catch (err) {
    emitStatus({ state: "error", message: err.message || "同步失败" });
    if (throwOnError) throw err;
    return false;
  } finally {
    syncing = false;
  }
}

async function pushNow() {
  const session = getSession();
  if (!session || syncing) return;

  syncing = true;
  emitStatus({ state: "pushing", message: "正在上传进度…" });
  try {
    try {
      const result = await pullSyncPayload(session.code);
      const changed = await applyRemotePayload(result);
      if (changed) emitApplied();
    } catch {
      // 上传前拉取失败时仍尝试推送本机进度
    }

    const payload = exportLocalData();
    const result = await pushSyncPayload(payload, session.code);
    updateSession({
      lastPushedAt: Date.now(),
      lastRemoteUpdatedAt: result.updatedAt || Date.now(),
    });
    dirty = false;
    emitStatus({
      state: "paired",
      message: `实时同步中 · ${formatPairingCode(session.code)}`,
      code: formatPairingCode(session.code),
    });
  } catch (err) {
    emitStatus({ state: "error", message: err.message || "上传失败" });
  } finally {
    syncing = false;
  }
}

function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    if (dirty) pushNow();
  }, PUSH_DEBOUNCE_MS);
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    pullAndMerge();
  }, POLL_MS);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
}

export const syncService = {
  getStatus() {
    return lastStatus;
  },

  getPairingCode() {
    const session = getSession();
    return session ? formatPairingCode(session.code) : "";
  },

  isPaired() {
    return Boolean(getSession());
  },

  markDirty() {
    if (suppressDirty || !getSession()) return;
    dirty = true;
    schedulePush();
  },

  async establishHost(code, { push = true, remoteUpdatedAt = 0 } = {}) {
    const normalized = normalizePairingCode(code);
    savePairingSession({
      code: normalized,
      role: "host",
      linkedAt: Date.now(),
      lastPushedAt: push ? 0 : Date.now(),
      lastRemoteUpdatedAt: remoteUpdatedAt || 0,
    });
    emitStatus({
      state: "paired",
      message: `实时同步中 · ${formatPairingCode(normalized)}`,
      code: formatPairingCode(normalized),
    });
    if (push) {
      await pushNow();
    }
    startPolling();
  },

  async linkDevice(code) {
    const normalized = normalizePairingCode(code);
    savePairingSession({
      code: normalized,
      role: "linked",
      linkedAt: Date.now(),
      lastPushedAt: 0,
      lastRemoteUpdatedAt: 0,
    });

    try {
      const changed = await pullAndMerge({ throwOnError: true });
      if (!changed) {
        await pushNow();
      }
      startPolling();
      return changed;
    } catch (err) {
      clearPairingSession();
      throw err;
    }
  },

  unlink() {
    dirty = false;
    stopPolling();
    clearPairingSession();
    emitStatus({ state: "idle", message: "", code: "" });
  },

  start() {
    if (started) return;
    started = true;

    const session = getSession();
    if (session) {
      emitStatus({
        state: "paired",
        message: `实时同步中 · ${formatPairingCode(session.code)}`,
        code: formatPairingCode(session.code),
      });
      startPolling();
      pullAndMerge();
    }

    const onFocus = () => {
      if (getSession()) pullAndMerge();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible" && getSession()) pullAndMerge();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  },

  stop() {
    stopPolling();
    started = false;
  },
};
