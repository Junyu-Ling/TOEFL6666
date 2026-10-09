import { getRedis, isDeployedRuntime } from "./sync-store.js";
import { requireAccessUser } from "./access-api.js";
import { getAccessSnapshot } from "./access-store.js";

const PRESENCE_TTL = 40;
const WATCH_TTL = 120;
const FRAME_TTL = 25;
const MAX_FRAME_CHARS = 280_000;
const ONLINE_SET = "toefl666:monitor:online";

const memory =
  globalThis.__toefl666MonitorStore ??
  ({
    presence: new Map(),
    watch: new Map(),
    frame: new Map(),
    online: new Set(),
  });
globalThis.__toefl666MonitorStore = memory;

function createError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function presenceKey(userId) {
  return `toefl666:monitor:presence:${userId}`;
}

function watchKey(userId) {
  return `toefl666:monitor:watch:${userId}`;
}

function frameKey(userId) {
  return `toefl666:monitor:frame:${userId}`;
}

function pruneMemory(now = Date.now()) {
  for (const [key, entry] of memory.presence) {
    if (!entry || entry.expiresAt <= now) {
      memory.presence.delete(key);
      memory.online.delete(key);
    }
  }
  for (const [key, entry] of memory.watch) {
    if (!entry || entry.expiresAt <= now) memory.watch.delete(key);
  }
  for (const [key, entry] of memory.frame) {
    if (!entry || entry.expiresAt <= now) memory.frame.delete(key);
  }
}

function identityFromUser(user) {
  return {
    id: String(user?.id || ""),
    email: String(user?.email || "").trim(),
    name: String(user?.name || user?.user_metadata?.name || "").trim(),
    login: String(user?.login || user?.user_metadata?.user_name || "").trim(),
    avatar: String(user?.avatar || user?.user_metadata?.avatar_url || "").trim(),
  };
}

async function requireAdmin(req) {
  const user = await requireAccessUser(req);
  const snapshot = await getAccessSnapshot(user);
  if (!snapshot.isAdmin) throw createError("没有管理员权限", 403);
  return { user, snapshot };
}

export async function handleMonitorHeartbeat(req, body = {}) {
  const user = await requireAccessUser(req);
  const userId = String(user.id || "").trim();
  if (!userId) throw createError("请先登录", 401);

  const payload = {
    userId,
    tab: String(body.tab || "").slice(0, 64),
    title: String(body.title || "").slice(0, 120),
    ts: Date.now(),
    user: identityFromUser(user),
  };

  const redis = getRedis();
  if (redis) {
    await redis.set(presenceKey(userId), payload, { ex: PRESENCE_TTL });
    await redis.sadd(ONLINE_SET, userId);
    return { ok: true, backend: "redis" };
  }

  if (isDeployedRuntime()) {
    throw createError("服务端未配置 Redis，无法上报在线状态", 503);
  }

  pruneMemory();
  memory.presence.set(userId, { value: payload, expiresAt: Date.now() + PRESENCE_TTL * 1000 });
  memory.online.add(userId);
  return { ok: true, backend: "memory" };
}

function asObject(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
}

export async function handleMonitorWatchStatus(req) {
  const user = await requireAccessUser(req);
  const userId = String(user.id || "").trim();
  const redis = getRedis();

  if (redis) {
    const watch = asObject(await redis.get(watchKey(userId))) || (await redis.get(watchKey(userId)));
    if (watch) {
      await redis.set(watchKey(userId), watch, { ex: WATCH_TTL });
      return { watching: true, watch };
    }
    return { watching: false, watch: null };
  }

  pruneMemory();
  const entry = memory.watch.get(userId);
  if (!entry || entry.expiresAt <= Date.now()) {
    memory.watch.delete(userId);
    return { watching: false, watch: null };
  }
  entry.expiresAt = Date.now() + WATCH_TTL * 1000;
  return { watching: true, watch: entry.value };
}

export async function handleMonitorFrameUpload(req, body = {}) {
  const user = await requireAccessUser(req);
  const userId = String(user.id || "").trim();
  const image = String(body.image || "");
  if (!image.startsWith("data:image/")) throw createError("截帧格式无效", 400);
  if (image.length > MAX_FRAME_CHARS) throw createError("截帧过大", 413);

  const redis = getRedis();
  let watching = false;
  if (redis) {
    const watch = await redis.get(watchKey(userId));
    watching = Boolean(watch);
    if (watching) {
      await redis.set(watchKey(userId), watch, { ex: WATCH_TTL });
    }
  } else {
    pruneMemory();
    const entry = memory.watch.get(userId);
    watching = Boolean(entry && entry.expiresAt > Date.now());
    if (watching) entry.expiresAt = Date.now() + WATCH_TTL * 1000;
  }
  if (!watching) throw createError("当前未被观看", 409);

  const payload = {
    userId,
    image,
    ts: Date.now(),
    width: Number(body.width) || 0,
    height: Number(body.height) || 0,
  };

  if (redis) {
    await redis.set(frameKey(userId), payload, { ex: FRAME_TTL });
    return { ok: true };
  }

  if (isDeployedRuntime()) {
    throw createError("服务端未配置 Redis，无法上传截帧", 503);
  }

  memory.frame.set(userId, { value: payload, expiresAt: Date.now() + FRAME_TTL * 1000 });
  return { ok: true };
}

export async function handleMonitorOnline(req) {
  await requireAdmin(req);
  const redis = getRedis();
  const now = Date.now();

  if (redis) {
    const ids = (await redis.smembers(ONLINE_SET)) || [];
    const sessions = [];
    for (const id of ids) {
      const presence = asObject(await redis.get(presenceKey(id)));
      if (!presence) {
        await redis.srem(ONLINE_SET, id);
        continue;
      }
      const watch = await redis.get(watchKey(id));
      sessions.push({
        ...presence,
        userId: presence.userId || id,
        watching: Boolean(watch),
      });
    }
    sessions.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return { sessions, backend: "redis" };
  }

  if (isDeployedRuntime()) {
    throw createError("服务端未配置 Redis，无法查看在线用户", 503);
  }

  pruneMemory(now);
  const sessions = [];
  for (const userId of memory.online) {
    const entry = memory.presence.get(userId);
    if (!entry || entry.expiresAt <= now) {
      memory.online.delete(userId);
      memory.presence.delete(userId);
      continue;
    }
    const watch = memory.watch.get(userId);
    sessions.push({
      ...entry.value,
      watching: Boolean(watch && watch.expiresAt > now),
    });
  }
  sessions.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  return { sessions, backend: "memory" };
}

export async function handleMonitorWatch(req, body = {}) {
  const { user: admin } = await requireAdmin(req);
  const userId = String(body.userId || "").trim();
  if (!userId) throw createError("缺少用户", 400);
  const enabled = Boolean(body.enabled);

  const redis = getRedis();
  if (redis) {
    if (enabled) {
      await redis.set(
        watchKey(userId),
        { adminId: admin.id, ts: Date.now() },
        { ex: WATCH_TTL }
      );
    } else {
      await redis.del(watchKey(userId));
      await redis.del(frameKey(userId));
    }
    return { userId, enabled };
  }

  if (isDeployedRuntime()) {
    throw createError("服务端未配置 Redis，无法启停观看", 503);
  }

  pruneMemory();
  if (enabled) {
    memory.watch.set(userId, {
      value: { adminId: admin.id, ts: Date.now() },
      expiresAt: Date.now() + WATCH_TTL * 1000,
    });
  } else {
    memory.watch.delete(userId);
    memory.frame.delete(userId);
  }
  return { userId, enabled };
}

export async function handleMonitorFrameGet(req, userIdParam = "") {
  await requireAdmin(req);
  const userId = String(userIdParam || "").trim();
  if (!userId) throw createError("缺少用户", 400);

  const redis = getRedis();
  if (redis) {
    const watch = asObject(await redis.get(watchKey(userId))) || (await redis.get(watchKey(userId)));
    if (watch) {
      await redis.set(watchKey(userId), watch, { ex: WATCH_TTL });
    }
    const frame = asObject(await redis.get(frameKey(userId)));
    return {
      watching: Boolean(watch),
      frame: frame || null,
    };
  }

  pruneMemory();
  const watch = memory.watch.get(userId);
  if (watch && watch.expiresAt > Date.now()) {
    watch.expiresAt = Date.now() + WATCH_TTL * 1000;
  }
  const frame = memory.frame.get(userId);
  return {
    watching: Boolean(watch && watch.expiresAt > Date.now()),
    frame: frame && frame.expiresAt > Date.now() ? frame.value : null,
  };
}

export function monitorUserLabel(session) {
  const u = session?.user || {};
  return u.name || u.login || u.email || session?.userId?.slice(0, 8) || "用户";
}
