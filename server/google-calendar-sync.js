import { EXAM_LABELS, nextAllDayDate } from "../src/shared/studyCalendarIcs.js";
import { getGoogleConfig } from "./auth-session.js";
import { getRedis, isDeployedRuntime } from "./sync-store.js";

const SOURCE = "toefl666";
const TTL_SEC = 400 * 24 * 3600;
const memory = globalThis.__toefl666GoogleCal ?? new Map();
globalThis.__toefl666GoogleCal = memory;

function createError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function authKey(userId) {
  return `toefl666:gcal:${userId}`;
}

async function saveAuth(userId, data) {
  const redis = getRedis();
  if (redis) {
    await redis.set(authKey(userId), data, { ex: TTL_SEC });
    return;
  }
  if (isDeployedRuntime()) {
    throw createError("服务端未配置 Redis，无法连接 Google 日历。", 503);
  }
  memory.set(userId, data);
}

async function loadAuth(userId) {
  const redis = getRedis();
  if (redis) return (await redis.get(authKey(userId))) || null;
  return memory.get(userId) || null;
}

async function deleteAuth(userId) {
  const redis = getRedis();
  if (redis) {
    await redis.del(authKey(userId));
    return;
  }
  memory.delete(userId);
}

export async function saveGoogleCalendarAuth(userId, tokens) {
  if (!userId) throw createError("未登录，无法连接 Google 日历", 401);
  const prev = (await loadAuth(userId)) || {};
  await saveAuth(userId, {
    refreshToken: tokens.refreshToken || prev.refreshToken || "",
    accessToken: tokens.accessToken || "",
    expiry: tokens.expiry || 0,
    calendarId: prev.calendarId || "primary",
  });
}

async function refreshAccessToken(auth) {
  const { clientId, clientSecret } = getGoogleConfig();
  if (!auth?.refreshToken) throw createError("还没连接 Google 日历", 401);
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: auth.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await tokenRes.json().catch(() => ({}));
  if (!data.access_token) {
    throw createError("Google 日历授权已失效，请重新连接", 401);
  }
  return {
    ...auth,
    accessToken: data.access_token,
    expiry: Date.now() + Math.max(60, Number(data.expires_in) || 3600) * 1000,
  };
}

async function getAuthWithToken(userId) {
  let auth = await loadAuth(userId);
  if (!auth?.refreshToken && !auth?.accessToken) {
    throw createError("还没连接 Google 日历", 401);
  }
  if (!auth.accessToken || Date.now() > (auth.expiry || 0) - 30_000) {
    auth = await refreshAccessToken(auth);
    await saveAuth(userId, auth);
  }
  return auth;
}

async function googleFetch(auth, path, { method = "GET", body } = {}) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return {};
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = data?.error?.errors?.[0]?.reason || data?.error?.status || "";
    if (reason === "accessNotConfigured" || String(data?.error?.message || "").includes("has not been used")) {
      throw createError("Google Cloud 尚未启用 Calendar API。可改用订阅链接同步到电脑日历。", 503);
    }
    throw createError(data?.error?.message || "Google 日历同步失败", res.status === 401 ? 401 : 502);
  }
  return data;
}

async function mapPool(items, limit, fn) {
  const result = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      result[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, Math.max(items.length, 1)) }, worker));
  return result;
}

function desiredEvents({ loginDates = [], examMarks = [] }) {
  const events = [];
  for (const dateKey of [...new Set(loginDates)].sort()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
    events.push({
      key: `streak:${dateKey}`,
      summary: "🔥 学习打卡",
      description: "TOEFL 6·6·6·6 连续学习火花",
      dateKey,
      private: { source: SOURCE, kind: "streak", dateKey },
    });
  }
  for (const exam of examMarks) {
    if (!exam?.dateKey || !EXAM_LABELS[exam.type]) continue;
    const label = EXAM_LABELS[exam.type];
    events.push({
      key: `exam:${exam.id || `${exam.type}-${exam.dateKey}`}`,
      summary: `📝 ${label}考试`,
      description: `${label}考试（来自 TOEFL 6·6·6·6 学习日历）`,
      dateKey: exam.dateKey,
      private: {
        source: SOURCE,
        kind: "exam",
        dateKey: exam.dateKey,
        examType: exam.type,
        examId: String(exam.id || `${exam.type}-${exam.dateKey}`),
      },
    });
  }
  return events;
}

function eventBody(item) {
  return {
    summary: item.summary,
    description: item.description,
    start: { date: item.dateKey },
    end: { date: nextAllDayDate(item.dateKey) },
    transparency: "transparent",
    extendedProperties: { private: item.private },
  };
}

async function listManagedEvents(auth) {
  const events = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({
      privateExtendedProperty: `source=${SOURCE}`,
      maxResults: "2500",
      showDeleted: "false",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const data = await googleFetch(auth, `/calendars/primary/events?${params}`);
    events.push(...(data.items || []));
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return events;
}

function managedKey(event) {
  const priv = event?.extendedProperties?.private || {};
  if (priv.kind === "exam") return `exam:${priv.examId || `${priv.examType}-${priv.dateKey}`}`;
  if (priv.kind === "streak") return `streak:${priv.dateKey}`;
  return "";
}

export async function handleGoogleCalendarStatus(userId) {
  if (!userId) return { connected: false };
  const auth = await loadAuth(userId);
  return { connected: Boolean(auth?.refreshToken || auth?.accessToken) };
}

export async function handleGoogleCalendarDisconnect(userId) {
  if (!userId) throw createError("未登录", 401);
  await deleteAuth(userId);
  return { ok: true, connected: false };
}

export async function handleGoogleCalendarPull(userId) {
  const auth = await getAuthWithToken(userId);
  const remote = await listManagedEvents(auth);
  const loginDates = [];
  const examMarks = [];
  for (const event of remote) {
    const priv = event.extendedProperties?.private || {};
    if (priv.kind === "streak" && priv.dateKey) loginDates.push(priv.dateKey);
    if (priv.kind === "exam" && priv.dateKey && EXAM_LABELS[priv.examType]) {
      examMarks.push({
        id: String(priv.examId || `${priv.examType}-${priv.dateKey}`),
        type: priv.examType,
        dateKey: priv.dateKey,
      });
    }
  }
  return {
    loginDates: [...new Set(loginDates)].sort(),
    examMarks,
  };
}

export async function handleGoogleCalendarSync(userId, body = {}) {
  const auth = await getAuthWithToken(userId);
  const desired = desiredEvents(body);
  const remote = await listManagedEvents(auth);
  const remoteByKey = new Map();
  for (const event of remote) {
    const key = managedKey(event);
    if (key) remoteByKey.set(key, event);
  }

  const toInsert = [];
  const toUpdate = [];
  const desiredKeys = new Set(desired.map((item) => item.key));
  for (const item of desired) {
    const existing = remoteByKey.get(item.key);
    if (!existing) {
      toInsert.push(item);
      continue;
    }
    if (existing.summary !== item.summary || existing.start?.date !== item.dateKey) {
      toUpdate.push({ item, eventId: existing.id });
    }
  }
  const toDelete = remote.filter((event) => {
    const key = managedKey(event);
    return key && !desiredKeys.has(key) && event.id;
  });

  await mapPool(toInsert, 4, (item) => googleFetch(auth, "/calendars/primary/events", { method: "POST", body: eventBody(item) }));
  await mapPool(toUpdate, 4, ({ item, eventId }) =>
    googleFetch(auth, `/calendars/primary/events/${encodeURIComponent(eventId)}`, { method: "PATCH", body: eventBody(item) })
  );
  await mapPool(toDelete, 4, (event) =>
    googleFetch(auth, `/calendars/primary/events/${encodeURIComponent(event.id)}`, { method: "DELETE" }).catch(() => null)
  );

  return {
    ok: true,
    loginCount: desired.filter((item) => item.private.kind === "streak").length,
    examCount: desired.filter((item) => item.private.kind === "exam").length,
  };
}
