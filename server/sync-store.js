import { Redis } from "@upstash/redis";
import { isValidPairingCode, normalizePairingCode, SYNC_MAX_BYTES } from "../src/shared/sync.js";

const TTL_SEC = 30 * 24 * 3600;
const MAX_BYTES = SYNC_MAX_BYTES;

const memory =
  globalThis.__toefl666SyncStore ??
  new Map();
globalThis.__toefl666SyncStore = memory;

function getEnv(env) {
  if (env && typeof env === "object") return env;
  if (typeof process !== "undefined" && process.env) return process.env;
  return {};
}

function getRedis(env) {
  const e = getEnv(env);
  const url = e.UPSTASH_REDIS_REST_URL || e.KV_REST_API_URL;
  const token = e.UPSTASH_REDIS_REST_TOKEN || e.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function isDeployedRuntime(env) {
  const e = getEnv(env);
  return Boolean(e.VERCEL || e.CF_WORKER || e.CF_PAGES);
}

function storageKey(code) {
  return `toefl666:sync:${normalizePairingCode(code)}`;
}

function pruneMemory() {
  const now = Date.now();
  for (const [key, entry] of memory.entries()) {
    if (entry.expiresAt <= now) memory.delete(key);
  }
}

export async function saveSyncEntry(code, entry) {
  const normalized = normalizePairingCode(code);
  if (!isValidPairingCode(normalized)) {
    throw createError("配对码格式无效", 400);
  }

  const serialized = JSON.stringify(entry);
  if (serialized.length > MAX_BYTES) {
    throw createError("同步数据过大，请减少生词/对话记录后重试", 413);
  }

  const redis = getRedis();
  if (!redis && isDeployedRuntime()) {
    throw createError(
      "服务端未配置 Redis，无法跨设备同步。请在 Cloudflare Worker Secrets 或 Vercel 环境变量中添加 UPSTASH_REDIS_REST_URL 与 UPSTASH_REDIS_REST_TOKEN 后重新部署。",
      503
    );
  }
  if (redis) {
    await redis.set(storageKey(normalized), entry, { ex: TTL_SEC });
    return { backend: "redis", expiresAt: entry.expiresAt };
  }

  pruneMemory();
  memory.set(normalized, entry);
  return { backend: "memory", expiresAt: entry.expiresAt };
}

export async function loadSyncEntry(code) {
  const normalized = normalizePairingCode(code);
  if (!isValidPairingCode(normalized)) {
    throw createError("配对码格式无效", 400);
  }

  const redis = getRedis();
  if (redis) {
    const entry = await redis.get(storageKey(normalized));
    if (!entry) throw createError("配对码无效或已过期", 404);
    return { entry, backend: "redis" };
  }

  pruneMemory();
  const entry = memory.get(normalized);
  if (!entry || entry.expiresAt <= Date.now()) {
    if (entry) memory.delete(normalized);
    throw createError("配对码无效或已过期", 404);
  }
  return { entry, backend: "memory" };
}

function createError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}
