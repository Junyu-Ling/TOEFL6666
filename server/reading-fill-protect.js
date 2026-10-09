import {
  createCipheriv,
  createHash,
  createHmac,
  publicEncrypt,
  randomBytes,
  constants,
} from "node:crypto";
import { getEnv, getRedis } from "./sync-store.js";

const RATE_USER_MAX = 8;
const RATE_IP_MAX = 24;
const RATE_WINDOW_SEC = 60;
const TS_SKEW_MS = 2 * 60 * 1000;
const NONCE_TTL_SEC = 180;

const memoryBuckets = globalThis.__toefl666RfRate ?? new Map();
globalThis.__toefl666RfRate = memoryBuckets;
const memoryNonces = globalThis.__toefl666RfNonce ?? new Map();
globalThis.__toefl666RfNonce = memoryNonces;

function createError(message, status, extra = {}) {
  const err = new Error(message);
  err.status = status;
  Object.assign(err, extra);
  return err;
}

export function getClientIp(req) {
  const headers = req?.headers || {};
  const forwarded = String(headers["x-forwarded-for"] || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (forwarded.length) return forwarded[0].slice(0, 64);
  const real = String(headers["x-real-ip"] || "").trim();
  if (real) return real.slice(0, 64);
  const remote = req?.socket?.remoteAddress || req?.connection?.remoteAddress || "";
  return String(remote || "unknown").slice(0, 64);
}

function authSecret() {
  const env = getEnv();
  return (
    String(env.READING_FILL_SECRET || "").trim() ||
    String(env.AUTH_SECRET || "").trim() ||
    String(env.GOOGLE_CLIENT_SECRET || "").trim() ||
    String(env.GITHUB_CLIENT_SECRET || "").trim() ||
    "toefl666-dev-reading-fill"
  );
}

export function watermarkIdentity(user) {
  const email = String(user?.email || "").trim();
  if (email) return email;
  const phone = String(user?.phone || "").trim();
  if (phone) return phone;
  const name = String(user?.name || user?.login || "").trim();
  if (name) return name;
  const id = String(user?.id || "").trim();
  if (id) return id.slice(0, 16);
  return "未知用户";
}

function pruneMemoryMap(map, now = Date.now()) {
  for (const [key, entry] of map.entries()) {
    if (!entry || entry.expiresAt <= now) map.delete(key);
  }
}

async function rateHit(key, limit) {
  const redis = getRedis();
  if (redis) {
    const redisKey = `toefl666:rf:rate:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) await redis.expire(redisKey, RATE_WINDOW_SEC);
    return { count: Number(count) || 0, limited: Number(count) > limit };
  }

  const now = Date.now();
  pruneMemoryMap(memoryBuckets, now);
  const entry = memoryBuckets.get(key);
  if (!entry || entry.expiresAt <= now) {
    memoryBuckets.set(key, { count: 1, expiresAt: now + RATE_WINDOW_SEC * 1000 });
    return { count: 1, limited: false };
  }
  entry.count += 1;
  return { count: entry.count, limited: entry.count > limit };
}

async function claimNonce(nonce, { allowPowKey = false } = {}) {
  const key = String(nonce || "").trim().toLowerCase();
  const ok = allowPowKey
    ? /^[a-z0-9:._-]{8,128}$/.test(key)
    : /^[a-f0-9]{16,64}$/.test(key);
  if (!ok) {
    throw createError("请求签名无效", 400);
  }
  const redis = getRedis();
  if (redis) {
    const ok = await redis.set(`toefl666:rf:nonce:${key}`, "1", { nx: true, ex: NONCE_TTL_SEC });
    if (ok == null || ok === false || ok === 0) {
      throw createError("请求已被使用，请刷新后重试", 409);
    }
    return;
  }
  const now = Date.now();
  pruneMemoryMap(memoryNonces, now);
  if (memoryNonces.has(key)) throw createError("请求已被使用，请刷新后重试", 409);
  memoryNonces.set(key, { expiresAt: now + NONCE_TTL_SEC * 1000 });
}

export function expectedRequestSignature(userId, ts, nonce) {
  return createHash("sha256")
    .update(`${ts}.${nonce}.${userId}.reading-fill.v1`)
    .digest("hex");
}

export function verifyRequestSignature({ userId, ts, nonce, sig }) {
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) throw createError("请求签名无效", 400);
  const skew = Math.abs(Date.now() - tsNum);
  if (skew > TS_SKEW_MS) throw createError("请求已过期，请重试", 401);
  const expect = expectedRequestSignature(userId, String(tsNum), String(nonce || "").trim().toLowerCase());
  const got = String(sig || "").trim().toLowerCase();
  if (got.length !== expect.length || got !== expect) {
    throw createError("请求签名校验失败", 401);
  }
}

export async function enforceReadingFillRateLimit(userId, ip) {
  const userHit = await rateHit(`u:${userId}`, RATE_USER_MAX);
  const ipHit = await rateHit(`ip:${ip || "unknown"}`, RATE_IP_MAX);
  if (userHit.limited || ipHit.limited) {
    throw createError("请求过于频繁，请稍后再试", 429, {
      needCaptcha: true,
      retryAfterSec: RATE_WINDOW_SEC,
    });
  }
}

function spkiToPem(spkiBuf) {
  const b64 = spkiBuf.toString("base64");
  const lines = b64.match(/.{1,64}/g) || [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----`;
}

export function encryptArticlesForClient(articles, pubKeyBase64) {
  let spki;
  try {
    spki = Buffer.from(String(pubKeyBase64 || ""), "base64");
  } catch {
    throw createError("公钥无效", 400);
  }
  if (spki.length < 100 || spki.length > 1200) throw createError("公钥无效", 400);

  const aesKey = randomBytes(32);
  const iv = randomBytes(12);
  const plain = Buffer.from(JSON.stringify({ articles }), "utf8");
  const cipher = createCipheriv("aes-256-gcm", aesKey, iv);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();

  let wrapped;
  try {
    wrapped = publicEncrypt(
      {
        key: spkiToPem(spki),
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      aesKey
    );
  } catch {
    throw createError("公钥无法用于加密", 400);
  }

  return {
    v: 1,
    alg: "RSA-OAEP-256+A256GCM",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ct: encrypted.toString("base64"),
    wk: wrapped.toString("base64"),
  };
}

const POW_DIFFICULTY = 4; // sha256 前导零十六进制位数

export function makePowChallenge(userId, ip) {
  const seed = createHmac("sha256", authSecret())
    .update(`pow|${userId}|${ip}|${Math.floor(Date.now() / 60000)}`)
    .digest("hex")
    .slice(0, 24);
  return { seed, difficulty: POW_DIFFICULTY };
}

export function verifyPowSolution(userId, ip, seed, solution) {
  const expect = makePowChallenge(userId, ip);
  if (String(seed || "") !== expect.seed) return false;
  const sol = String(solution || "");
  if (!/^[a-f0-9]{1,16}$/i.test(sol)) return false;
  const dig = createHash("sha256").update(`${expect.seed}:${sol}`).digest("hex");
  return dig.startsWith("0".repeat(expect.difficulty));
}

export async function prepareReadingFillDelivery(req, user, body = {}) {
  const ip = getClientIp(req);
  const ts = body.ts ?? body.timestamp;
  const nonce = String(body.nonce || "").trim().toLowerCase();
  const sig = body.sig || body.signature;
  const pubKey = body.pubKey || body.publicKey;
  const powSeed = body.powSeed;
  const powSolution = body.powSolution;

  verifyRequestSignature({ userId: user.id, ts, nonce, sig });
  await claimNonce(nonce);

  const bypass = Boolean(powSeed && powSolution && verifyPowSolution(user.id, ip, powSeed, powSolution));
  if (bypass) {
    await claimNonce(`pow:${powSeed}:${powSolution}`, { allowPowKey: true });
  } else {
    try {
      await enforceReadingFillRateLimit(user.id, ip);
    } catch (err) {
      if (err.status === 429) {
        const pow = makePowChallenge(user.id, ip);
        err.needCaptcha = true;
        err.pow = pow;
        err.payload = {
          error: err.message,
          needCaptcha: true,
          pow,
          retryAfterSec: RATE_WINDOW_SEC,
        };
      }
      throw err;
    }
  }

  return {
    ip,
    watermark: {
      user: watermarkIdentity(user),
      ip,
      ts: new Date().toISOString(),
    },
    pubKey,
  };
}
