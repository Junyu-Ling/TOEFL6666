import {
  formatPairingCode,
  generatePairingCode,
  isValidPairingCode,
  normalizePairingCode,
  SYNC_VERSION,
} from "../src/shared/sync.js";
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

export async function handleSyncPush(body = {}) {
  const payload = body.payload;
  validatePayload(payload);

  let code = normalizePairingCode(body.code || "");
  if (code && !isValidPairingCode(code)) {
    throw createError("配对码须为 8 位字母或数字", 400);
  }
  if (!code) {
    code = normalizePairingCode(generatePairingCode());
  }

  const expiresAt = Date.now() + 7 * 24 * 3600 * 1000;
  const { backend } = await saveSyncEntry(code, {
    payload,
    expiresAt,
    updatedAt: Date.now(),
  });

  return {
    code: formatPairingCode(code),
    expiresAt,
    updatedAt: Date.now(),
    backend,
  };
}

export async function handleSyncPull(body = {}) {
  const code = normalizePairingCode(body.code || "");
  if (!isValidPairingCode(code)) {
    throw createError("请输入 8 位配对码", 400);
  }

  const { entry, backend } = await loadSyncEntry(code);
  return {
    payload: entry.payload,
    exportedAt: entry.payload.exportedAt,
    updatedAt: entry.updatedAt || entry.payload.exportedAt,
    expiresAt: entry.expiresAt,
    backend,
  };
}
