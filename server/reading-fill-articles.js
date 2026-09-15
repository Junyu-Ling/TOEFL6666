import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { requireAccessUser } from "./access-api.js";
import { getAccessSnapshot } from "./access-store.js";

const require = createRequire(import.meta.url);
const DATA_PATH = join(dirname(fileURLToPath(import.meta.url)), "data", "readingFillBlank.json");

function createError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export function loadReadingFillRawArticles() {
  let parsed;
  try {
    parsed = require("./data/readingFillBlank.json");
  } catch {
    try {
      parsed = JSON.parse(readFileSync(DATA_PATH, "utf8"));
    } catch {
      throw createError("题目未配置", 503);
    }
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw createError("题目未配置", 503);
  }
  return parsed;
}

export async function handleReadingFillArticles(req) {
  const user = await requireAccessUser(req);
  const snapshot = await getAccessSnapshot(user);
  if (!snapshot.features?.readingFill) {
    throw createError("没有阅读填词权限", 403);
  }
  return { articles: loadReadingFillRawArticles() };
}
