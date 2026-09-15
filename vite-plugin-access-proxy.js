import { loadEnv } from "vite";
import { handleAccessGrant, handleAccessMe, handleAccessUsers } from "./server/access-api.js";
import { handleAuthLogout, handleAuthMe, handleGithubCallback, handleGithubStart } from "./server/auth-github.js";

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
    "AUTH_SECRET",
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
        const isGhStart = matchApiPath(req.url, "/api/auth/github/start");
        const isGhCallback = matchApiPath(req.url, "/api/auth/github/callback");
        const isAuthMe = matchApiPath(req.url, "/api/auth/me");
        const isLogout = matchApiPath(req.url, "/api/auth/logout");
        if (!isAccessMe && !isUsers && !isGrant && !isGhStart && !isGhCallback && !isAuthMe && !isLogout) {
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
          if (isAuthMe && req.method === "GET") {
            handleAuthMe(req, res);
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
          sendJson(res, 405, { error: "Method Not Allowed" });
        } catch (err) {
          sendJson(res, err.status || 500, { error: err.message || "服务器错误" });
        }
      });
    },
  };
}
