import { buildStudyCalendarIcs, isCalendarToken } from "../src/shared/studyCalendarIcs.js";
import { getRedis, isDeployedRuntime } from "./sync-store.js";

const TTL_SEC = 400 * 24 * 3600;
const memory = globalThis.__toefl666CalendarFeeds ?? new Map();
globalThis.__toefl666CalendarFeeds = memory;

function createError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function feedKey(token) {
  return `toefl666:calendar:feed:${token}`;
}

function queryValue(req, key) {
  const fromQuery = req.query?.[key];
  if (Array.isArray(fromQuery)) return String(fromQuery[0] || "");
  if (fromQuery != null && fromQuery !== "") return String(fromQuery);
  try {
    return new URL(req.url || "/", "http://n").searchParams.get(key) || "";
  } catch {
    return "";
  }
}

function normalizeFeed(body = {}) {
  const loginDates = [...new Set((body.loginDates || []).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item)))].sort();
  const examMarks = (body.examMarks || [])
    .filter((entry) => entry?.dateKey && (entry.type === "toefl" || entry.type === "sat"))
    .map((entry) => ({
      id: String(entry.id || `${entry.type}-${entry.dateKey}`),
      type: entry.type,
      dateKey: entry.dateKey,
    }));
  return { loginDates, examMarks, updatedAt: Date.now() };
}

async function saveFeed(token, feed) {
  const redis = getRedis();
  if (redis) {
    await redis.set(feedKey(token), feed, { ex: TTL_SEC });
    return;
  }
  if (isDeployedRuntime()) {
    throw createError("服务端未配置 Redis，无法发布日历订阅。", 503);
  }
  memory.set(token, feed);
}

async function loadFeed(token) {
  const redis = getRedis();
  if (redis) {
    const feed = await redis.get(feedKey(token));
    return feed || null;
  }
  return memory.get(token) || null;
}

export async function handleCalendarPublish(req, body = {}) {
  const token = String(body.token || "").trim();
  if (!isCalendarToken(token)) {
    throw createError("日历订阅令牌无效", 400);
  }
  const feed = normalizeFeed(body);
  await saveFeed(token, feed);
  return {
    ok: true,
    loginCount: feed.loginDates.length,
    examCount: feed.examMarks.length,
    updatedAt: feed.updatedAt,
  };
}

export async function handleCalendarFeed(req, res) {
  const token = String(queryValue(req, "token") || "").trim();
  if (!isCalendarToken(token)) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Calendar not found");
    return;
  }

  const feed = await loadFeed(token);
  if (!feed) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Calendar not found");
    return;
  }

  const ics = buildStudyCalendarIcs(feed);
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", 'inline; filename="toefl6666.ics"');
  res.setHeader("Cache-Control", "no-cache, max-age=0");
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  res.end(ics);
}
