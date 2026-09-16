import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { requireAccessUser } from "./access-api.js";
import { getAccessSnapshot } from "./access-store.js";
import { getEnv } from "./sync-store.js";
import { decryptReadingFillJsonWithEnv } from "./reading-fill-crypto.js";

const DIR = dirname(fileURLToPath(import.meta.url));
const PLAIN_PATH = join(DIR, "data", "readingFillBlank.json");
const ENC_PATH = join(DIR, "data", "readingFillBlank.json.enc");

function createError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function parseArticles(text) {
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw createError("题目未配置", 503);
  }
  return parsed;
}

export function loadReadingFillRawArticles() {
  try {
    return parseArticles(readFileSync(PLAIN_PATH, "utf8"));
  } catch (err) {
    if (err.status) throw err;
  }

  try {
    return parseArticles(decryptReadingFillJsonWithEnv(readFileSync(ENC_PATH, "utf8"), getEnv()));
  } catch (err) {
    if (err.status) throw err;
    throw createError("题目未配置", 503);
  }
}

export async function handleReadingFillArticles(req) {
  const user = await requireAccessUser(req);
  const snapshot = await getAccessSnapshot(user);
  if (!snapshot.features?.readingFill) {
    throw createError("没有阅读填词权限", 403);
  }
  return { articles: loadReadingFillRawArticles() };
}
