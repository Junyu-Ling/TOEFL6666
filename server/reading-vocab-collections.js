import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { requireAccessUser } from "./access-api.js";
import { getAccessSnapshot } from "./access-store.js";
import { getEnv } from "./sync-store.js";
import { decryptReadingFillJsonWithEnv } from "./reading-fill-crypto.js";

const DIR = dirname(fileURLToPath(import.meta.url));
const PLAIN_PATH = join(DIR, "data", "readingVocabMatch.json");
const ENC_PATH = join(DIR, "data", "readingVocabMatch.json.enc");

function createError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function parseCollections(text) {
  const parsed = JSON.parse(text);
  const collections = Array.isArray(parsed?.collections)
    ? parsed.collections
    : Array.isArray(parsed?.sets)
      ? [{ id: "default", title: parsed.title || "新托福阅读词汇题", sets: parsed.sets }]
      : [];
  const hasPairs = collections.some((collection) =>
    (collection?.sets || []).some((set) => Array.isArray(set?.pairs) && set.pairs.length > 0)
  );
  if (!hasPairs) {
    throw createError("题目未配置", 503);
  }
  return collections;
}

export function loadReadingVocabCollections() {
  try {
    return parseCollections(readFileSync(PLAIN_PATH, "utf8"));
  } catch (err) {
    if (err.status) throw err;
  }

  try {
    return parseCollections(decryptReadingFillJsonWithEnv(readFileSync(ENC_PATH, "utf8"), getEnv()));
  } catch (err) {
    if (err.status) throw err;
    throw createError("题目未配置", 503);
  }
}

export async function handleReadingVocabCollections(req) {
  const user = await requireAccessUser(req);
  const snapshot = await getAccessSnapshot(user);
  if (!snapshot.features?.readingVocab) {
    throw createError("没有词汇配对权限", 403);
  }
  return { collections: loadReadingVocabCollections() };
}
