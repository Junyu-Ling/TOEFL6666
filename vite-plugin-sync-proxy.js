import { handleSyncPull, handleSyncPush } from "./server/sync-api.js";

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("error", reject);
    req.on("end", () => resolve(body));
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

export function createSyncHandler() {
  return async (req, res, next) => {
    if (req.method !== "POST") return next();

    const isPush = matchApiPath(req.url, "/api/sync/push");
    const isPull = matchApiPath(req.url, "/api/sync/pull");
    if (!isPush && !isPull) return next();

    try {
      const body = JSON.parse(await readBody(req));
      const result = isPush ? await handleSyncPush(body) : await handleSyncPull(body);
      sendJson(res, 200, result);
    } catch (err) {
      sendJson(res, err.status || 500, { error: err.message || "服务器错误" });
    }
  };
}

export function syncProxyPlugin() {
  return {
    name: "sync-proxy",
    configureServer(server) {
      server.middlewares.use(createSyncHandler());
    },
  };
}
