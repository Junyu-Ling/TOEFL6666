import {
  buildReadingFillRequest,
  decryptReadingFillPacket,
} from "../utils/readingFillSecure.js";

const memoryCache = new Map();

async function accessRequest(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const cacheable =
    (!method || method === "GET") && path.includes("/reading-vocab/");
  if (cacheable && memoryCache.has(path)) return memoryCache.get(path);
  const res = await fetch(path, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `请求失败 (${res.status})`);
    error.status = res.status;
    error.payload = data;
    error.needCaptcha = Boolean(data.needCaptcha);
    error.pow = data.pow || null;
    throw error;
  }
  if (cacheable) memoryCache.set(path, data);
  return data;
}

export async function fetchAccessMe() {
  return accessRequest("/api/access/me");
}

export async function fetchAccessUsers() {
  return accessRequest("/api/access/users");
}

export async function grantFeature(userId, feature, enabled) {
  return accessRequest("/api/access/grant", {
    method: "POST",
    body: { userId, feature, enabled },
  });
}

export async function grantReadingFill(userId, enabled) {
  return grantFeature(userId, "reading-fill", enabled);
}

export async function grantReadingVocab(userId, enabled) {
  return grantFeature(userId, "reading-vocab", enabled);
}

export async function fetchReadingFillArticles(userId, extra = {}) {
  const signed = await buildReadingFillRequest(userId);
  const packet = await accessRequest("/api/reading-fill/articles", {
    method: "POST",
    body: { ...signed, ...extra },
  });
  return decryptReadingFillPacket(packet);
}

export async function fetchReadingVocabCollections() {
  return accessRequest("/api/reading-vocab/collections");
}

export async function postMonitorHeartbeat(body) {
  return accessRequest("/api/monitor/heartbeat", { method: "POST", body });
}

export async function fetchMonitorWatchStatus() {
  return accessRequest("/api/monitor/watch-status");
}

export async function postMonitorFrame(body) {
  return accessRequest("/api/monitor/frame", { method: "POST", body });
}

export async function fetchMonitorOnline() {
  return accessRequest("/api/monitor/online");
}

export async function postMonitorWatch(userId, enabled) {
  return accessRequest("/api/monitor/watch", {
    method: "POST",
    body: { userId, enabled },
  });
}

export async function fetchMonitorFrame(userId) {
  return accessRequest(`/api/monitor/frame?userId=${encodeURIComponent(userId)}`);
}

/** 客户端求解 PoW（频率限制后人机校验） */
export async function solveReadingFillPow(pow) {
  const seed = String(pow?.seed || "");
  const difficulty = Number(pow?.difficulty) || 4;
  const prefix = "0".repeat(difficulty);
  const enc = new TextEncoder();
  for (let i = 0; i < 5_000_000; i += 1) {
    const solution = i.toString(16);
    const dig = await crypto.subtle.digest("SHA-256", enc.encode(`${seed}:${solution}`));
    const hex = [...new Uint8Array(dig)].map((b) => b.toString(16).padStart(2, "0")).join("");
    if (hex.startsWith(prefix)) return { powSeed: seed, powSolution: solution };
    if (i % 500 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  throw new Error("人机校验超时，请稍后重试");
}
