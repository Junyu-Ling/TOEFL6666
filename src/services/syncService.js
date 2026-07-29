import {
  clearLegacyPairingSession,
  clearSyncMeta,
  exportLocalData,
  importLocalData,
  loadSyncMeta,
  mergeSyncBundles,
  saveSyncMeta,
  SYNC_EXCLUDED_KEYS,
  SYNC_PREFIX,
} from "../shared/sync";
import { isCloudEmptyError, pullSyncPayload, pushSyncPayload } from "./syncApi";

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
let accessToken = "";
let userId = "";
let userEmail = "";
let lastStatus = { state: "idle", message: "" };

function emitStatus(patch) {
  lastStatus = { ...lastStatus, ...patch };
  window.dispatchEvent(new CustomEvent(SYNC_STATUS_EVENT, { detail: lastStatus }));
}

function emitApplied() {
  window.dispatchEvent(new CustomEvent(SYNC_APPLIED_EVENT));
}

function isSignedIn() {
  return Boolean(accessToken && userId);
}

function schedulePush() {
  if (!isSignedIn()) return;
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
  if (!isSignedIn()) return false;

  const meta = loadSyncMeta();
  const remoteUpdatedAt = result.updatedAt || result.payload?.exportedAt || 0;
  if (remoteUpdatedAt <= meta.lastRemoteUpdatedAt) return false;

  const localBundle = exportLocalData();
  const merged = mergeSyncBundles(localBundle, result.payload);
  const changed = JSON.stringify(merged.data) !== JSON.stringify(localBundle.data);

  suppressDirty = true;
  importLocalData(merged);
  suppressDirty = false;

  saveSyncMeta({ userId, lastRemoteUpdatedAt: remoteUpdatedAt });
  if (changed) schedulePush();
  return changed;
}

async function pullAndMerge({ throwOnError = false } = {}) {
  if (!isSignedIn() || syncing) return false;

  syncing = true;
  emitStatus({ state: "pulling", message: "正在同步云端进度…", email: userEmail });
  try {
    const result = await pullSyncPayload(accessToken);
    const changed = await applyRemotePayload(result);

    emitStatus({
      state: "signed_in",
      message: `进度已同步 · ${userEmail}`,
      email: userEmail,
    });
    if (changed) emitApplied();
    return changed;
  } catch (err) {
    if (isCloudEmptyError(err)) {
      emitStatus({
        state: "signed_in",
        message: `已登录 · ${userEmail}`,
        email: userEmail,
      });
      return false;
    }
    emitStatus({ state: "error", message: err.message || "同步失败", email: userEmail });
    if (throwOnError) throw err;
    return false;
  } finally {
    syncing = false;
  }
}

async function pushNow() {
  if (!isSignedIn() || syncing) return;

  syncing = true;
  emitStatus({ state: "pushing", message: "正在上传进度…", email: userEmail });
  try {
    try {
      const result = await pullSyncPayload(accessToken);
      const changed = await applyRemotePayload(result);
      if (changed) emitApplied();
    } catch (err) {
      if (!isCloudEmptyError(err)) {
        // 上传前拉取失败时仍尝试推送本机进度
      }
    }

    const result = await pushSyncPayload(exportLocalData(), accessToken);
    saveSyncMeta({
      userId,
      lastRemoteUpdatedAt: result.updatedAt || Date.now(),
    });
    dirty = false;
    emitStatus({
      state: "signed_in",
      message: `进度已同步 · ${userEmail}`,
      email: userEmail,
    });
  } catch (err) {
    emitStatus({
      state: "error",
      message: err.message || "上传失败，将自动重试",
      email: userEmail,
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

async function mergeLocalIntoAccount() {
  emitStatus({ state: "syncing", message: "正在将本机进度合并到账号…", email: userEmail });

  let cloudPayload = null;
  let remoteUpdatedAt = 0;
  try {
    const result = await pullSyncPayload(accessToken);
    cloudPayload = result.payload;
    remoteUpdatedAt = result.updatedAt || result.payload?.exportedAt || 0;
  } catch (err) {
    if (!isCloudEmptyError(err)) throw err;
  }

  const localBundle = exportLocalData();
  const merged = cloudPayload ? mergeSyncBundles(localBundle, cloudPayload) : localBundle;
  const changed =
    !cloudPayload || JSON.stringify(merged.data) !== JSON.stringify(localBundle.data);

  suppressDirty = true;
  importLocalData(merged);
  suppressDirty = false;

  if (changed) emitApplied();

  await pushSyncPayload(merged, accessToken);
  saveSyncMeta({
    userId,
    lastRemoteUpdatedAt: Math.max(remoteUpdatedAt, Date.now()),
  });
  dirty = false;
}

export const syncService = {
  getStatus() {
    return lastStatus;
  },

  isSignedIn() {
    return isSignedIn();
  },

  markDirty() {
    if (suppressDirty || !isSignedIn()) return;
    schedulePush();
  },

  updateAccessToken(session) {
    if (!session?.access_token || !session.user?.id) return;
    if (userId && session.user.id !== userId) return;
    accessToken = session.access_token;
    userId = session.user.id;
    userEmail = session.user.email || session.user.user_metadata?.full_name || userEmail;
  },

  async bindUser(session, { mergeLocal = false } = {}) {
    if (!session?.user?.id || !session.access_token) return;

    const nextUserId = session.user.id;
    const nextEmail =
      session.user.email || session.user.user_metadata?.full_name || "Google 账号";
    const switchingAccount = userId && userId !== nextUserId;

    accessToken = session.access_token;
    userId = nextUserId;
    userEmail = nextEmail;
    clearLegacyPairingSession();

    if (switchingAccount || mergeLocal) {
      saveSyncMeta({ userId, lastRemoteUpdatedAt: 0 });
      await mergeLocalIntoAccount();
    } else {
      const meta = loadSyncMeta();
      if (meta.userId !== userId) {
        saveSyncMeta({ userId, lastRemoteUpdatedAt: 0 });
        await mergeLocalIntoAccount();
      }
    }

    startPolling();
    emitStatus({
      state: "signed_in",
      message: `已登录 · ${userEmail}`,
      email: userEmail,
    });
    await pullAndMerge();
  },

  unbindUser() {
    dirty = false;
    stopPolling();
    accessToken = "";
    userId = "";
    userEmail = "";
    clearSyncMeta();
    emitStatus({ state: "idle", message: "", email: "" });
  },

  start() {
    if (started) return;
    started = true;
    installStorageHook();

    const onFocus = () => {
      if (isSignedIn()) pullAndMerge();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible" && isSignedIn()) pullAndMerge();
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
