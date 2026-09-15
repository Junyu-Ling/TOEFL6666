import { getEnv, getRedis, isDeployedRuntime } from "./sync-store.js";

const USERS_KEY = "toefl666:access:users";
const IDENTITY_KEY = "toefl666:access:identities";
const READING_FILL_KEY = "toefl666:access:reading-fill";
const FEATURE_READING_FILL = "reading-fill";
const HARDCODED_ADMIN_EMAILS = ["jy.ling.cc@gmail.com"];

const memory =
  globalThis.__toefl666AccessStore ??
  ({
    users: new Map(),
    identities: new Map(),
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

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function unique(values) {
  return [...new Set(values.map((item) => String(item || "").trim()).filter(Boolean))];
}

function identityKey(kind, value) {
  if (kind === "email") {
    const email = normalizeEmail(value);
    return email ? `email:${email}` : "";
  }
  if (kind === "phone") {
    const phone = normalizePhone(value);
    return phone ? `phone:${phone}` : "";
  }
  if (kind === "github") {
    const id = String(value || "").trim();
    return id ? `github:${id}` : "";
  }
  return "";
}

function collectEmails(user) {
  return unique([user?.email, ...(user?.emails || [])]).map(normalizeEmail);
}

function collectPhones(user) {
  return unique([user?.phone, ...(user?.phones || [])].map(normalizePhone));
}

export function isAdminUser(user, env) {
  if (!user?.id) return false;
  const e = getEnv(env);
  const ids = parseList(e.ACCESS_ADMIN_USER_IDS);
  const emails = new Set([...HARDCODED_ADMIN_EMAILS, ...parseList(e.ACCESS_ADMIN_EMAILS)]);
  const phones = parseList(e.ACCESS_ADMIN_PHONES).map(normalizePhone);
  if (ids.includes(String(user.id).toLowerCase())) return true;
  if (collectEmails(user).some((email) => emails.has(email))) return true;
  const userPhones = collectPhones(user);
  if (userPhones.some((phone) => phones.some((item) => item && (phone === item || phone.endsWith(item))))) {
    return true;
  }
  return false;
}

function profileFromUser(user) {
  const providers = [];
  const app = user.app_metadata || {};
  if (Array.isArray(app.providers)) providers.push(...app.providers);
  else if (app.provider) providers.push(app.provider);
  if (user.provider) providers.push(user.provider);
  if (Array.isArray(user.providers)) providers.push(...user.providers);
  const meta = user.user_metadata || {};
  const githubId = user.githubId || (String(user.id || "").startsWith("gh_") ? user.id : "");
  return {
    id: user.id,
    email: normalizeEmail(user.email),
    emails: collectEmails(user),
    phone: normalizePhone(user.phone),
    phones: collectPhones(user),
    githubId,
    name: user.name || meta.full_name || meta.name || meta.user_name || user.login || "",
    login: user.login || meta.user_name || "",
    avatar: user.avatar || meta.avatar_url || "",
    providers: unique(providers),
    lastSeen: Date.now(),
  };
}

export function sessionPayloadFromProfile(profile) {
  const providers = unique(profile.providers || []);
  return {
    id: profile.id,
    email: profile.email || "",
    phone: profile.phone || "",
    emails: collectEmails(profile),
    phones: collectPhones(profile),
    githubId: profile.githubId || "",
    name: profile.name || "",
    login: profile.login || "",
    avatar: profile.avatar || "",
    provider: providers[0] || "github",
    providers,
  };
}

export function publicUserFromProfile(profile) {
  if (!profile?.id) return null;
  const providers = unique(profile.providers || []);
  return {
    id: profile.id,
    email: profile.email || "",
    phone: profile.phone || "",
    emails: collectEmails(profile),
    phones: collectPhones(profile),
    name: profile.name || "",
    login: profile.login || "",
    avatar: profile.avatar || "",
    provider: providers[0] || "github",
    providers,
    app_metadata: { provider: providers[0] || "github", providers },
    user_metadata: {
      name: profile.name || "",
      user_name: profile.login || "",
      avatar_url: profile.avatar || "",
    },
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

async function saveUser(profile) {
  const redis = getRedis();
  if (redis) {
    await redis.hset(USERS_KEY, { [profile.id]: profile });
    return;
  }
  if (isDeployedRuntime()) {
    throw createError("服务端未配置 Redis，无法保存用户权限。", 503);
  }
  memory.users.set(profile.id, profile);
}

async function deleteUser(userId) {
  const redis = getRedis();
  if (redis) {
    await redis.hdel(USERS_KEY, userId);
    return;
  }
  memory.users.delete(userId);
}

async function lookupIdentity(kind, value) {
  const key = identityKey(kind, value);
  if (!key) return "";
  const redis = getRedis();
  if (redis) return String((await redis.hget(IDENTITY_KEY, key)) || "");
  return String(memory.identities.get(key) || "");
}

async function writeIdentity(kind, value, userId) {
  const key = identityKey(kind, value);
  if (!key || !userId) return;
  const redis = getRedis();
  if (redis) {
    await redis.hset(IDENTITY_KEY, { [key]: userId });
    return;
  }
  memory.identities.set(key, userId);
}

async function indexProfile(profile) {
  for (const email of collectEmails(profile)) await writeIdentity("email", email, profile.id);
  for (const phone of collectPhones(profile)) await writeIdentity("phone", phone, profile.id);
  if (profile.githubId) await writeIdentity("github", profile.githubId, profile.id);
  if (String(profile.id || "").startsWith("gh_")) await writeIdentity("github", profile.id, profile.id);
}

async function transferReadingFill(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return;
  const granted = await readReadingFillIds();
  if (!granted.has(fromId)) return;
  const redis = getRedis();
  if (redis) {
    await redis.sadd(READING_FILL_KEY, toId);
    await redis.srem(READING_FILL_KEY, fromId);
    return;
  }
  memory.readingFill.add(toId);
  memory.readingFill.delete(fromId);
}

function mergeProfiles(canonical, extra) {
  const providers = unique([...(canonical.providers || []), ...(extra.providers || [])]);
  return {
    ...canonical,
    email: canonical.email || extra.email || "",
    emails: unique([...(canonical.emails || []), ...(extra.emails || []), canonical.email, extra.email]),
    phone: canonical.phone || extra.phone || "",
    phones: unique([...(canonical.phones || []), ...(extra.phones || []), canonical.phone, extra.phone].map(normalizePhone)),
    githubId: canonical.githubId || extra.githubId || "",
    name: canonical.name || extra.name || "",
    login: canonical.login || extra.login || "",
    avatar: canonical.avatar || extra.avatar || "",
    providers,
    lastSeen: Date.now(),
  };
}

async function mergeUserInto(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return;
  const users = await readUsers();
  const fromUser = users[fromId];
  const toUser = users[toId];
  if (!fromUser) return;
  const merged = mergeProfiles(toUser || { id: toId }, fromUser);
  merged.id = toId;
  await saveUser(merged);
  await indexProfile(merged);
  await transferReadingFill(fromId, toId);
  await deleteUser(fromId);
}

function pickCanonicalId(ids, preferId, fallbackId) {
  if (preferId && (ids.includes(preferId) || !ids.length)) return preferId;
  const githubId = ids.find((id) => String(id).startsWith("gh_"));
  if (githubId) return githubId;
  if (preferId) return preferId;
  if (ids[0]) return ids[0];
  return fallbackId;
}

export async function getUserProfile(userId) {
  if (!userId) return null;
  const users = await readUsers();
  return users[userId] || null;
}

export async function resolveLoginUser(incoming, { preferId } = {}) {
  const draft = profileFromUser(incoming);
  const githubId = draft.githubId || "";
  const hits = [];
  if (preferId) hits.push(preferId);
  if (githubId) hits.push(await lookupIdentity("github", githubId));
  for (const email of draft.emails) hits.push(await lookupIdentity("email", email));
  for (const phone of draft.phones) hits.push(await lookupIdentity("phone", phone));

  const users = await readUsers();
  const ids = unique(hits).filter((id) => id && (users[id] || id === preferId || id === draft.id));
  const fallbackId = githubId || draft.id;
  if (!fallbackId) throw createError("无法创建账号", 400);
  const canonicalId = pickCanonicalId(ids, preferId, fallbackId);

  for (const id of ids) {
    await mergeUserInto(id, canonicalId);
  }

  const latest = await readUsers();
  const merged = mergeProfiles(latest[canonicalId] || { id: canonicalId }, { ...draft, id: canonicalId });
  merged.id = canonicalId;
  merged.lastSeen = Date.now();
  await saveUser(merged);
  await indexProfile(merged);
  return merged;
}

export async function upsertAccessUser(user) {
  if (!user?.id) return null;
  return resolveLoginUser(user, { preferId: user.id });
}

export async function getAccessSnapshot(user, env) {
  if (!user?.id) {
    return { isAdmin: false, features: { readingFill: false } };
  }
  const profile = await upsertAccessUser(user);
  const admin = isAdminUser(profile || user, env);
  if (admin) {
    return { isAdmin: true, features: { readingFill: true }, user: publicUserFromProfile(profile) };
  }
  const granted = await readReadingFillIds();
  return {
    isAdmin: false,
    features: { readingFill: granted.has(profile.id) },
    user: publicUserFromProfile(profile),
  };
}

export async function listAccessUsers(env) {
  const users = await readUsers();
  const granted = await readReadingFillIds();
  return Object.values(users)
    .map((profile) => {
      const admin = isAdminUser(profile, env);
      return {
        ...publicUserFromProfile(profile),
        lastSeen: profile.lastSeen || 0,
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

export { FEATURE_READING_FILL, HARDCODED_ADMIN_EMAILS };
