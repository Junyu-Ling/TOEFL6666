import { getRedis, isDeployedRuntime } from "./sync-store.js";
import { requireAccessUser } from "./access-api.js";

const PROGRESS_PREFIX = "toefl666:account-progress:";
const ALLOWED_KEYS = new Set([
  "toefl666_progress",
  "toefl666_reading_vocab_progress",
  "toefl666_familiar_obscure_progress",
  "toefl666_sat_transition_words",
  "toefl666_reading_fill_blank",
  "toefl666_lexgrid_progress",
  "toefl666_streak",
  "toefl666_settings",
]);

const memory =
  globalThis.__toefl666AccountProgress ?? new Map();
globalThis.__toefl666AccountProgress = memory;

function createError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function storeKey(userId) {
  return `${PROGRESS_PREFIX}${userId}`;
}

function parseItem(raw) {
  if (!raw) return null;
  const item = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!item || typeof item !== "object") return null;
  return {
    value: String(item.value ?? ""),
    updatedAt: Number(item.updatedAt) || 0,
  };
}

async function readItems(userId) {
  const redis = getRedis();
  if (redis) {
    const raw = (await redis.hgetall(storeKey(userId))) || {};
    const items = {};
    for (const [key, value] of Object.entries(raw)) {
      if (!ALLOWED_KEYS.has(key)) continue;
      const item = parseItem(value);
      if (item) items[key] = item;
    }
    return items;
  }
  return { ...(memory.get(userId) || {}) };
}

async function writeItems(userId, items) {
  const redis = getRedis();
  if (redis) {
    const payload = {};
    for (const [key, item] of Object.entries(items)) {
      payload[key] = item;
    }
    if (Object.keys(payload).length) {
      await redis.hset(storeKey(userId), payload);
    }
    return;
  }
  if (isDeployedRuntime()) {
    throw createError("服务端未配置 Redis，无法保存登录数据。", 503);
  }
  memory.set(userId, items);
}

export async function handleAccountProgressPull(req) {
  const user = await requireAccessUser(req);
  return { items: await readItems(user.id) };
}

export async function handleAccountProgressPush(req, body = {}) {
  const user = await requireAccessUser(req);
  const incoming = body.items && typeof body.items === "object" ? body.items : {};
  const current = await readItems(user.id);
  for (const [key, raw] of Object.entries(incoming)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    const item = parseItem(raw);
    if (!item) continue;
    const prev = current[key];
    if (!prev || item.updatedAt >= prev.updatedAt) {
      current[key] = item;
    }
  }
  await writeItems(user.id, current);
  return { ok: true };
}
