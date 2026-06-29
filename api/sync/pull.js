import { handleSyncPull } from "../../server/sync-api.js";

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.trim()) return JSON.parse(req.body);
  return {};
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }

  try {
    const result = await handleSyncPull(parseBody(req));
    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, err.status || 500, { error: err.message || "服务器错误" });
  }
}
