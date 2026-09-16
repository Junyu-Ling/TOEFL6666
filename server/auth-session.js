import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getEnv } from "./sync-store.js";

export const SESSION_COOKIE = "toefl666_session";
export const OAUTH_STATE_COOKIE = "toefl666_oauth_state";
const SESSION_DAYS = 30;

function createError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** 只配了 Google 也要能签会话，否则 Google 登录会在写 Cookie 这步失败。 */
export function getAuthSecret() {
  const env = getEnv();
  return env.AUTH_SECRET || env.GITHUB_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET || "";
}

export function getGithubConfig() {
  const env = getEnv();
  return {
    clientId: env.GITHUB_CLIENT_ID || "Ov23li2dm43mGcix56sF",
    clientSecret: env.GITHUB_CLIENT_SECRET || "",
  };
}

export function getGoogleConfig() {
  const env = getEnv();
  return {
    clientId: env.GOOGLE_CLIENT_ID || "",
    clientSecret: env.GOOGLE_CLIENT_SECRET || "",
  };
}

export function requestOrigin(req) {
  const forwardedProto = req.headers?.["x-forwarded-proto"];
  const protoRaw = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  const proto = String(protoRaw || "")
    .split(",")[0]
    .trim()
    .replace(/:$/, "");
  const forwardedHost = req.headers?.["x-forwarded-host"];
  const hostRaw = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost || req.headers?.host;
  const host = String(hostRaw || "")
    .split(",")[0]
    .trim();
  if (proto && host) return `${proto}://${host}`;
  if (host) return `http://${host}`;
  return "http://localhost:5175";
}

export function getCookie(req, name) {
  const raw = String(req.headers?.cookie || "");
  for (const part of raw.split(/;\s*/)) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index) === name) {
      try {
        return decodeURIComponent(part.slice(index + 1));
      } catch {
        return part.slice(index + 1);
      }
    }
  }
  return "";
}

function cookieFlags(req, { maxAge, httpOnly = true } = {}) {
  const origin = requestOrigin(req);
  const secure = origin.startsWith("https:");
  const parts = ["Path=/", "SameSite=Lax"];
  if (httpOnly) parts.push("HttpOnly");
  if (secure) parts.push("Secure");
  if (maxAge != null) parts.push(`Max-Age=${maxAge}`);
  return parts.join("; ");
}

export function appendCookie(res, cookie) {
  const prev = res.getHeader?.("Set-Cookie");
  if (!prev) {
    res.setHeader("Set-Cookie", cookie);
    return;
  }
  const list = Array.isArray(prev) ? prev : [prev];
  res.setHeader("Set-Cookie", [...list, cookie]);
}

export function setSessionCookie(req, res, token) {
  appendCookie(res, `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${cookieFlags(req, { maxAge: SESSION_DAYS * 24 * 3600 })}`);
}

export function clearSessionCookie(req, res) {
  appendCookie(res, `${SESSION_COOKIE}=; ${cookieFlags(req, { maxAge: 0 })}`);
}

export function setOauthStateCookie(req, res, state) {
  appendCookie(res, `${OAUTH_STATE_COOKIE}=${encodeURIComponent(state)}; ${cookieFlags(req, { maxAge: 600 })}`);
}

export function clearOauthStateCookie(req, res) {
  appendCookie(res, `${OAUTH_STATE_COOKIE}=; ${cookieFlags(req, { maxAge: 0 })}`);
}

export function randomState() {
  return randomBytes(16).toString("hex");
}

export function createOauthState() {
  const nonce = randomState();
  const exp = String(Date.now() + 10 * 60 * 1000);
  const body = `${nonce}.${exp}`;
  return `${body}.${sign(body, getAuthSecret())}`;
}

export function verifyOauthState(state, cookieValue = "") {
  const value = String(state || "");
  if (!value) return false;
  if (cookieValue && value === cookieValue) return true;
  const secret = getAuthSecret();
  const parts = value.split(".");
  if (parts.length !== 3 || !secret) return false;
  const [nonce, exp, sig] = parts;
  if (!nonce || !exp || !sig) return false;
  const body = `${nonce}.${exp}`;
  const expected = sign(body, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const expiresAt = Number(exp);
  return Number.isFinite(expiresAt) && expiresAt >= Date.now();
}

function sign(body, secret) {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function createSessionToken(user) {
  const secret = getAuthSecret();
  if (!secret) throw createError("未配置 AUTH_SECRET / GITHUB_CLIENT_SECRET / GOOGLE_CLIENT_SECRET", 503);
  const payload = {
    ...user,
    exp: Date.now() + SESSION_DAYS * 24 * 3600 * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function readSessionUser(req) {
  const secret = getAuthSecret();
  const token = getCookie(req, SESSION_COOKIE);
  if (!secret || !token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!data?.id || (data.exp && Date.now() > data.exp)) return null;
    const providers = Array.isArray(data.providers) && data.providers.length
      ? data.providers
      : [data.provider || "github"];
    return {
      id: data.id,
      email: data.email || "",
      phone: data.phone || "",
      emails: data.emails || [],
      phones: data.phones || [],
      githubId: data.githubId || "",
      name: data.name || "",
      login: data.login || "",
      avatar: data.avatar || "",
      provider: providers[0] || "github",
      providers,
      app_metadata: { provider: providers[0] || "github", providers },
      user_metadata: { name: data.name || "", user_name: data.login || "", avatar_url: data.avatar || "" },
    };
  } catch {
    return null;
  }
}
