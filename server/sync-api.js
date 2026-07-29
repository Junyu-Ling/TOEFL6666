import { mergeSyncBundles, SYNC_VERSION } from "../src/shared/sync.js";
import { loadSyncEntry, saveSyncEntry } from "./sync-store.js";

function createError(message, status = 500) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function validatePayload(payload) {
  if (!payload || payload.version !== SYNC_VERSION || !payload.data || typeof payload.data !== "object") {
    throw createError("同步数据格式无效", 400);
  }
  if (!payload.exportedAt || typeof payload.exportedAt !== "number") {
    throw createError("同步数据缺少时间戳", 400);
  }
}

export async function handleSyncPush(body = {}, { userId }) {
  const payload = body.payload;
  validatePayload(payload);
  if (!userId) throw createError("请先登录 Google 账号", 401);

  let mergedPayload = payload;
  try {
    const { entry } = await loadSyncEntry(userId);
    if (entry?.payload) {
      mergedPayload = mergeSyncBundles(entry.payload, payload);
    }
  } catch (err) {
    if (err.status !== 404) throw err;
  }

  const updatedAt = Date.now();
  const { backend } = await saveSyncEntry(userId, {
    payload: mergedPayload,
    updatedAt,
  });

  return { updatedAt, backend };
}

export async function handleSyncPull(_body = {}, { userId }) {
  if (!userId) throw createError("请先登录 Google 账号", 401);

  const { entry, backend } = await loadSyncEntry(userId);
  return {
    payload: entry.payload,
    exportedAt: entry.payload.exportedAt,
    updatedAt: entry.updatedAt || entry.payload.exportedAt,
    backend,
  };
}
