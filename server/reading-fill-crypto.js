import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = Buffer.from("v1");

export function readingFillKeyFromEnv(env = process.env) {
  const secret = String(env.READING_FILL_SECRET || env.AUTH_SECRET || env.GITHUB_CLIENT_SECRET || "").trim();
  if (!secret) return null;
  return createHash("sha256").update(`toefl666-reading-fill:${secret}`).digest();
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
