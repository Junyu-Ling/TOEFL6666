import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decryptReadingFillJson, encryptReadingFillJson, readingFillKeyFromEnv } from "../server/reading-fill-crypto.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const plainPath = path.join(root, "server/data/readingVocabMatch.json");
const encPath = path.join(root, "server/data/readingVocabMatch.json.enc");

function loadDotEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && !process.env[key]) process.env[key] = value;
  }
}

function pairCount(data) {
  const collections = Array.isArray(data?.collections)
    ? data.collections
    : Array.isArray(data?.sets)
      ? [{ sets: data.sets }]
      : [];
  return collections.reduce(
    (sum, collection) =>
      sum + (collection?.sets || []).reduce((inner, set) => inner + (set?.pairs?.length || 0), 0),
    0
  );
}

loadDotEnv();
const key = readingFillKeyFromEnv(process.env);
if (!key) {
  console.error("缺少 READING_FILL_SECRET / AUTH_SECRET / GITHUB_CLIENT_SECRET，无法加密题目。");
  process.exit(1);
}

const json = fs.readFileSync(plainPath, "utf8");
const data = JSON.parse(json);
const count = pairCount(data);
if (!count) {
  console.error("题目文件为空");
  process.exit(1);
}

const roundTrip = JSON.parse(decryptReadingFillJson(encryptReadingFillJson(json, key), key));
if (pairCount(roundTrip) !== count) {
  console.error("加密校验失败");
  process.exit(1);
}

fs.writeFileSync(encPath, `${encryptReadingFillJson(json, key)}\n`, "utf8");
console.log(`已加密 ${count} 对词汇配对到 server/data/readingVocabMatch.json.enc`);
