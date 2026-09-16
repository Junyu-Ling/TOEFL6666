import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = Buffer.from("v1");

const SECRET_KEYS = [
  "READING_FILL_SECRET",
  "AUTH_SECRET",
  "GITHUB_CLIENT_SECRET",
  "GOOGLE_CLIENT_SECRET",
];

export function readingFillSecretsFromEnv(env = process.env) {
  const seen = new Set();
  const secrets = [];
  for (const key of SECRET_KEYS) {
    const value = String(env[key] || "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    secrets.push(value);
  }
  return secrets;
}

export function readingFillKeyFromSecret(secret) {
  return createHash("sha256").update(`toefl666-reading-fill:${secret}`).digest();
}

export function readingFillKeyFromEnv(env = process.env) {
  const secret = readingFillSecretsFromEnv(env)[0];
  return secret ? readingFillKeyFromSecret(secret) : null;
}

export function encryptReadingFillJson(jsonText, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(jsonText), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([PREFIX, iv, tag, encrypted]).toString("base64");
}

export function decryptReadingFillJson(payload, key) {
  const buf = Buffer.from(String(payload || ""), "base64");
  if (buf.length < PREFIX.length + 12 + 16) {
    throw new Error("题目密文损坏");
  }
  const prefix = buf.subarray(0, PREFIX.length);
  if (!prefix.equals(PREFIX)) {
    throw new Error("题目密文版本不支持");
  }
  const iv = buf.subarray(PREFIX.length, PREFIX.length + 12);
  const tag = buf.subarray(PREFIX.length + 12, PREFIX.length + 28);
  const data = buf.subarray(PREFIX.length + 28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function decryptReadingFillJsonWithEnv(payload, env = process.env) {
  const secrets = readingFillSecretsFromEnv(env);
  if (!secrets.length) {
    const err = new Error("线上缺少 READING_FILL_SECRET，无法解密题库。请在 Vercel 环境变量中配置后重新部署。");
    err.status = 503;
    throw err;
  }
  let lastError = null;
  for (const secret of secrets) {
    try {
      return decryptReadingFillJson(payload, readingFillKeyFromSecret(secret));
    } catch (err) {
      lastError = err;
    }
  }
  const err = new Error("题库密钥不匹配。请把本地加密用的 READING_FILL_SECRET 配到 Vercel 后重新部署。");
  err.status = 503;
  err.cause = lastError;
  throw err;
}
