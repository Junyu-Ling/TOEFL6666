import { getEnv, getRedis, isDeployedRuntime } from "./sync-store.js";

const USERS_KEY = "toefl666:access:users";
const READING_FILL_KEY = "toefl666:access:reading-fill";
const FEATURE_READING_FILL = "reading-fill";

const memory =
  globalThis.__toefl666AccessStore ??
  ({
    users: new Map(),
    readingFill: new Set(),
  });
globalThis.__toefl666AccessStore = memory;

function createError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function parseList(value) {
  return String(value || "")
    .split(/[,;\s]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

export function isAdminUser(user, env) {
  if (!user?.id) return false;
  const e = getEnv(env);
  const ids = parseList(e.ACCESS_ADMIN_USER_IDS);
  const emails = parseList(e.ACCESS_ADMIN_EMAILS);
  const phones = parseList(e.ACCESS_ADMIN_PHONES).map(normalizePhone);
  if (ids.includes(String(user.id).toLowerCase())) return true;
  if (user.email && emails.includes(String(user.email).toLowerCase())) return true;
  const phone = normalizePhone(user.phone);
  if (phone && phones.some((item) => item && (phone === item || phone.endsWith(item)))) return true;
  return false;
}

function profileFromUser(user) {
  const providers = [];
  const app = user.app_metadata || {};
  if (Array.isArray(app.providers)) providers.push(...app.providers);
  else if (app.provider) providers.push(app.provider);
  const meta = user.user_metadata || {};
  return {
    id: user.id,
    email: user.email || "",
    phone: user.phone || "",
    name: meta.full_name || meta.name || meta.user_name || "",
    providers: [...new Set(providers.map(String))],
    lastSeen: Date.now(),
  };
}

async function readUsers() {
  const redis = getRedis();
  if (redis) {
    const raw = (await redis.hgetall(USERS_KEY)) || {};
    const users = {};
    for (const [id, value] of Object.entries(raw)) {
      if (!value) continue;
      users[id] = typeof value === "string" ? JSON.parse(value) : value;
    }
    return users;
  }
  return Object.fromEntries(memory.users);
}

async function readReadingFillIds() {
  const redis = getRedis();
  if (redis) {
    const members = (await redis.smembers(READING_FILL_KEY)) || [];
    return new Set(members.map(String));
  }
  return new Set(memory.readingFill);
}

export async function upsertAccessUser(user) {
  if (!user?.id) return;
  const profile = profileFromUser(user);
  const redis = getRedis();
  if (redis) {
    await redis.hset(USERS_KEY, { [user.id]: profile });
    return;
  }
  if (isDeployedRuntime()) {
    throw createError("服务端未配置 Redis，无法保存用户权限。", 503);
  }
  memory.users.set(user.id, profile);
}

export async function getAccessSnapshot(user, env) {
  if (!user?.id) {
    return { isAdmin: false, features: { readingFill: false } };
  }
  await upsertAccessUser(user);
  const admin = isAdminUser(user, env);
  if (admin) {
    return { isAdmin: true, features: { readingFill: true } };
  }
  const granted = await readReadingFillIds();
  return {
    isAdmin: false,
    features: { readingFill: granted.has(user.id) },
  };
}

export async function listAccessUsers(env) {
  const users = await readUsers();
  const granted = await readReadingFillIds();
  return Object.values(users)
    .map((profile) => {
      const admin = isAdminUser(profile, env);
      return {
        ...profile,
        isAdmin: admin,
        features: {
          readingFill: admin || granted.has(profile.id),
        },
      };
    })
    .sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
}

export async function setFeatureGrant(userId, feature, enabled) {
  const id = String(userId || "").trim();
  if (!id) throw createError("缺少用户", 400);
  if (feature !== FEATURE_READING_FILL) throw createError("不支持的功能", 400);

  const redis = getRedis();
  if (redis) {
    if (enabled) await redis.sadd(READING_FILL_KEY, id);
    else await redis.srem(READING_FILL_KEY, id);
    return { userId: id, feature, enabled: Boolean(enabled) };
  }
  if (isDeployedRuntime()) {
    throw createError("服务端未配置 Redis，无法保存开通权限。", 503);
  }
  if (enabled) memory.readingFill.add(id);
  else memory.readingFill.delete(id);
  return { userId: id, feature, enabled: Boolean(enabled) };
}

export { FEATURE_READING_FILL };
