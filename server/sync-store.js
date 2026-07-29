import { Redis } from "@upstash/redis";
import { SYNC_MAX_BYTES } from "../src/shared/sync.js";

const TTL_SEC = 365 * 24 * 3600;
const MAX_BYTES = SYNC_MAX_BYTES;

const memory = globalThis.__toefl666SyncStore ?? new Map();
globalThis.__toefl666SyncStore = memory;

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function storageKey(userId) {
  return `toefl666:user:${String(userId).trim()}`;
}

function normalizeUserId(userId) {
  const id = String(userId || "").trim();
  if (!id) throw createError("无效的用户 ID", 400);
  return id;
}

export async function saveSyncEntry(userId, entry) {
  const normalized = normalizeUserId(userId);

  const serialized = JSON.stringify(entry);
  if (serialized.length > MAX_BYTES) {
    throw createError("同步数据过大，请减少生词/对话记录后重试", 413);
  }

  const redis = getRedis();
  if (!redis && process.env.VERCEL) {
    throw createError(
      "服务端未配置 Redis，无法云端同步。请在 Vercel 添加 UPSTASH_REDIS_REST_URL 与 UPSTASH_REDIS_REST_TOKEN 后重新部署。",
      503
    );
  }

  if (redis) {
    await redis.set(storageKey(normalized), entry, { ex: TTL_SEC });
    return { backend: "redis" };
  }

  memory.set(storageKey(normalized), entry);
  return { backend: "memory" };
}

export async function loadSyncEntry(userId) {
  const normalized = normalizeUserId(userId);

  const redis = getRedis();
  if (redis) {
    const entry = await redis.get(storageKey(normalized));
    if (!entry) throw createError("云端暂无进度", 404);
    return { entry, backend: "redis" };
  }

  const entry = memory.get(storageKey(normalized));
  if (!entry) throw createError("云端暂无进度", 404);
  return { entry, backend: "memory" };
}

function createError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}
