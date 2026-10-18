import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { requireAccessUser } from "./access-api.js";
import { getAccessSnapshot } from "./access-store.js";

const DIR = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(DIR, "data", "readingFillDrill.json");

function createError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

let cached = null;

export function loadReadingFillDrillItems() {
  if (cached) return cached;
  try {
    const parsed = JSON.parse(readFileSync(DATA_PATH, "utf8"));
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    if (!items.length) throw createError("专项强化题目未配置", 503);
    cached = items;
    return items;
  } catch (err) {
    if (err.status) throw err;
    throw createError("专项强化题目未配置", 503);
  }
}

export async function handleReadingFillDrill(req) {
  const user = await requireAccessUser(req);
  const snapshot = await getAccessSnapshot(user);
  if (!snapshot.features?.readingFill) {
    throw createError("没有阅读填词权限", 403);
  }
  return { items: loadReadingFillDrillItems() };
}
