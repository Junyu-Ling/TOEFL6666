import { loadEnv } from "vite";
import { handleAccessGrant, handleAccessMe, handleAccessUsers } from "./server/access-api.js";
import { handleAuthIdentity, handleAuthLink, handleAuthLogout, handleAuthMe, handleGithubCallback, handleGithubStart } from "./server/auth-github.js";
import { handleGoogleCallback, handleGoogleCalendarStart, handleGoogleStart } from "./server/auth-google.js";
import { handleReadingFillArticles } from "./server/reading-fill-articles.js";
import { handleReadingVocabCollections } from "./server/reading-vocab-collections.js";
import { handleAccountProgressPull, handleAccountProgressPush } from "./server/account-progress.js";
import { handleCalendarFeed, handleCalendarPublish } from "./server/calendar-feed.js";
import {
  handleGoogleCalendarDisconnect,
  handleGoogleCalendarPull,
  handleGoogleCalendarStatus,
  handleGoogleCalendarSync,
} from "./server/google-calendar-sync.js";
import { requireAccessUser } from "./server/access-api.js";

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("error", reject);
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function matchApiPath(url, path) {
  return url === path || url?.startsWith(`${path}?`);
}

function parseBody(raw) {
  if (!raw?.trim()) return {};
  return JSON.parse(raw);
}

function applyEnv(env) {
  for (const key of [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "ACCESS_ADMIN_EMAILS",
    "ACCESS_ADMIN_USER_IDS",
    "ACCESS_ADMIN_PHONES",
    "GITHUB_CLIENT_ID",
    "GITHUB_CLIENT_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "AUTH_SECRET",
    "READING_FILL_SECRET",
  ]) {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  }
}

export function accessProxyPlugin() {
  return {
    name: "access-proxy",
    configResolved(config) {
      applyEnv(loadEnv(config.mode, config.root, ""));
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const isAccessMe = matchApiPath(req.url, "/api/access/me");
        const isUsers = matchApiPath(req.url, "/api/access/users");
        const isGrant = matchApiPath(req.url, "/api/access/grant");
        const isReadingFillArticles = matchApiPath(req.url, "/api/reading-fill/articles");
        const isReadingVocabCollections = matchApiPath(req.url, "/api/reading-vocab/collections");
        const isGhStart = matchApiPath(req.url, "/api/auth/github/start");
        const isGhCallback = matchApiPath(req.url, "/api/auth/github/callback");
        const isGoogleStart = matchApiPath(req.url, "/api/auth/google/start");
        const isGoogleCalendarStart = matchApiPath(req.url, "/api/auth/google/calendar");
        const isGoogleCallback = matchApiPath(req.url, "/api/auth/google/callback");
        const isAuthMe = matchApiPath(req.url, "/api/auth/me");
        const isAuthIdentity = matchApiPath(req.url, "/api/auth/identity");
        const isAuthLink = matchApiPath(req.url, "/api/auth/link");
        const isAccountSync = matchApiPath(req.url, "/api/sync/account");
        const isLogout = matchApiPath(req.url, "/api/auth/logout");
        const isCalendarPublish = matchApiPath(req.url, "/api/calendar/publish");
        const isCalendarFeed = matchApiPath(req.url, "/api/calendar/feed.ics");
        const isGoogleCalStatus = matchApiPath(req.url, "/api/calendar/google-status");
        const isGoogleCalSync = matchApiPath(req.url, "/api/calendar/google-sync");
        const isGoogleCalPull = matchApiPath(req.url, "/api/calendar/google-pull");
        const isGoogleCalDisconnect = matchApiPath(req.url, "/api/calendar/google-disconnect");
        if (!isAccessMe && !isUsers && !isGrant && !isReadingFillArticles && !isReadingVocabCollections && !isGhStart && !isGhCallback && !isGoogleStart && !isGoogleCalendarStart && !isGoogleCallback && !isAuthMe && !isAuthIdentity && !isAuthLink && !isAccountSync && !isLogout && !isCalendarPublish && !isCalendarFeed && !isGoogleCalStatus && !isGoogleCalSync && !isGoogleCalPull && !isGoogleCalDisconnect) {
          return next();
        }

        try {
          if (isGhStart && req.method === "GET") {
            handleGithubStart(req, res);
            return;
          }
          if (isGhCallback && req.method === "GET") {
            await handleGithubCallback(req, res);
            return;
          }
          if (isGoogleStart && req.method === "GET") {
            handleGoogleStart(req, res);
            return;
          }
          if (isGoogleCalendarStart && req.method === "GET") {
            handleGoogleCalendarStart(req, res);
            return;
          }
          if (isGoogleCallback && req.method === "GET") {
            await handleGoogleCallback(req, res);
            return;
          }
          if (isCalendarPublish && req.method === "POST") {
            const body = parseBody(await readBody(req));
            sendJson(res, 200, await handleCalendarPublish(req, body));
            return;
          }
          if (isCalendarFeed && (req.method === "GET" || req.method === "HEAD")) {
            await handleCalendarFeed(req, res);
            return;
          }
          if (isGoogleCalStatus && req.method === "GET") {
            try {
              const user = await requireAccessUser(req);
              sendJson(res, 200, await handleGoogleCalendarStatus(user.id));
            } catch (err) {
              if (err.status === 401) {
                sendJson(res, 200, { connected: false });
                return;
              }
              throw err;
            }
            return;
          }
          if (isGoogleCalSync && req.method === "POST") {
            const user = await requireAccessUser(req);
            const body = parseBody(await readBody(req));
            sendJson(res, 200, await handleGoogleCalendarSync(user.id, body));
            return;
          }
          if (isGoogleCalPull && req.method === "GET") {
            const user = await requireAccessUser(req);
            sendJson(res, 200, await handleGoogleCalendarPull(user.id));
            return;
          }
          if (isGoogleCalDisconnect && req.method === "POST") {
            const user = await requireAccessUser(req);
            sendJson(res, 200, await handleGoogleCalendarDisconnect(user.id));
            return;
          }
          if (isAuthMe && req.method === "GET") {
            await handleAuthMe(req, res);
            return;
          }
          if (isAuthIdentity && req.method === "POST") {
            await handleAuthIdentity(req, res);
            return;
          }
          if (isAuthLink && req.method === "POST") {
            const body = parseBody(await readBody(req));
            await handleAuthLink(req, res, body);
            return;
          }
          if (isAccountSync && req.method === "GET") {
            sendJson(res, 200, await handleAccountProgressPull(req));
            return;
          }
          if (isAccountSync && req.method === "POST") {
            const body = parseBody(await readBody(req));
            sendJson(res, 200, await handleAccountProgressPush(req, body));
            return;
          }
          if (isLogout && req.method === "POST") {
            handleAuthLogout(req, res);
            return;
          }
          if (isAccessMe && (req.method === "GET" || req.method === "POST")) {
            sendJson(res, 200, await handleAccessMe(req));
            return;
          }
          if (isUsers && req.method === "GET") {
            sendJson(res, 200, await handleAccessUsers(req));
            return;
          }
          if (isGrant && req.method === "POST") {
            const body = parseBody(await readBody(req));
            sendJson(res, 200, await handleAccessGrant(req, body));
            return;
          }
          if (isReadingFillArticles && req.method === "GET") {
            res.setHeader("Cache-Control", "private, no-store");
            sendJson(res, 200, await handleReadingFillArticles(req));
            return;
          }
          if (isReadingVocabCollections && req.method === "GET") {
            res.setHeader("Cache-Control", "private, no-store");
            sendJson(res, 200, await handleReadingVocabCollections(req));
            return;
          }
          sendJson(res, 405, { error: "Method Not Allowed" });
        } catch (err) {
          sendJson(res, err.status || 500, { error: err.message || "服务器错误" });
        }
      });
    },
  };
}
