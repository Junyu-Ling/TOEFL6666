import phoneticData from "../data/phonetics.json";
import { normalizeIpa, pickPhoneticFromApiPayload } from "../utils/phoneticFormat.js";

const API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en";
const bankPhonetics = phoneticData.phonetics || {};
const runtimeCache = new Map(Object.entries(bankPhonetics));

export function getWordPhoneticSync(word) {
  const key = String(word || "").trim().toLowerCase();
  if (!key) return "";
  return runtimeCache.get(key) || "";
}

export async function fetchWordPhonetic(word, { signal } = {}) {
  const key = String(word || "").trim().toLowerCase();
  if (!key) return "";

  const cached = getWordPhoneticSync(key);
  if (cached || runtimeCache.has(key)) {
    return cached;
  }

  const res = await fetch(`${API_BASE}/${encodeURIComponent(key)}`, { signal });
  if (!res.ok) {
    runtimeCache.set(key, "");
    return "";
  }

  const data = await res.json().catch(() => []);
  const ipa = pickPhoneticFromApiPayload(data);
  runtimeCache.set(key, ipa);
  return ipa;
}

export async function getWordPhonetic(word, options = {}) {
  const sync = getWordPhoneticSync(word);
  if (sync || runtimeCache.has(String(word || "").trim().toLowerCase())) {
    return sync;
  }
  return fetchWordPhonetic(word, options);
}

/** @deprecated use getWordPhoneticSync */
export function getCachedPhonetic(word) {
  return getWordPhoneticSync(word);
}

export { normalizeIpa };
