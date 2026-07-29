import {
  clearLegacySyncMeta,
  clearPairingSession,
  exportLocalData,
  formatPairingCode,
  importLocalData,
  loadPairingSession,
  mergeSyncBundles,
  normalizePairingCode,
  savePairingSession,
  SYNC_EXCLUDED_KEYS,
  SYNC_PREFIX,
} from "../shared/sync";
import { pullSyncPayload, pushSyncPayload } from "./syncApi";

export const SYNC_APPLIED_EVENT = "toefl666-sync-applied";
export const SYNC_STATUS_EVENT = "toefl666-sync-status";

const POLL_MS = 3000;
const PUSH_DEBOUNCE_MS = 1500;

let pollTimer = null;
let pushTimer = null;
let dirty = false;
let suppressDirty = false;
let syncing = false;
let started = false;
let storageHookInstalled = false;
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

function schedulePush() {
  if (!getSession()) return;
  dirty = true;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    if (dirty) pushNow();
  }, PUSH_DEBOUNCE_MS);
}

function installStorageHook() {
  if (storageHookInstalled || typeof window === "undefined" || !window.localStorage) return;
  storageHookInstalled = true;

  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function patchedSetItem(key, value) {
    originalSetItem(key, value);
    if (
      !suppressDirty &&
      typeof key === "string" &&
      key.startsWith(SYNC_PREFIX) &&
      !SYNC_EXCLUDED_KEYS.has(key)
    ) {
      schedulePush();
    }
  };
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
  if (result.expiresAt) updateSession({ expiresAt: result.expiresAt });
  if (changed) schedulePush();
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
    const expired = /无效或已过期/.test(err.message || "");
    emitStatus({
      state: expired ? "expired" : "error",
      message: expired
        ? "配对码已过期，请在本机重新生成并在另一台设备重新连接"
        : err.message || "同步失败",
    });
    if (throwOnError) throw err;
    return false;
  } finally {
    syncing = false;
  }
}

async function pushSyncData(code) {
  const payload = exportLocalData();
  return pushSyncPayload(payload, code);
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

    const result = await pushSyncData(session.code);
    updateSession({
      lastPushedAt: Date.now(),
      lastRemoteUpdatedAt: result.updatedAt || Date.now(),
      expiresAt: result.expiresAt || session.expiresAt || 0,
    });
    dirty = false;
    emitStatus({
      state: "paired",
      message: `实时同步中 · ${formatPairingCode(session.code)}`,
      code: formatPairingCode(session.code),
    });
  } catch (err) {
    emitStatus({
      state: "error",
      message: err.message || "上传失败，将自动重试",
      code: formatPairingCode(session.code),
    });
  } finally {
    syncing = false;
    if (dirty) schedulePush();
  }
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(async () => {
    await pullAndMerge();
    if (dirty) await pushNow();
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

export { pushSyncData };

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
    schedulePush();
  },

  async establishHost(code, { push = true, remoteUpdatedAt = 0, expiresAt = 0 } = {}) {
    const normalized = normalizePairingCode(code);
    savePairingSession({
      code: normalized,
      role: "host",
      linkedAt: Date.now(),
      lastPushedAt: push ? 0 : Date.now(),
      lastRemoteUpdatedAt: remoteUpdatedAt || 0,
      expiresAt: expiresAt || 0,
    });
    emitStatus({
      state: "paired",
      message: `实时同步中 · ${formatPairingCode(normalized)}`,
      code: formatPairingCode(normalized),
    });
    startPolling();
    if (push) {
      await pushNow();
    } else {
      await pullAndMerge();
    }
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
      await pullAndMerge({ throwOnError: true });
      await pushNow();
      startPolling();
      return true;
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

  getExpiresAt() {
    return getSession()?.expiresAt || 0;
  },

  start() {
    if (started) return;
    started = true;
    clearLegacySyncMeta();
    installStorageHook();

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
