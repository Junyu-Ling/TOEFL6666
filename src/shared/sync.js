export const SYNC_PREFIX = "toefl666_";
export const SYNC_VERSION = 1;
export const PAIRING_CODE_LENGTH = 8;

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizePairingCode(input = "") {
  return String(input).replace(/[\s-]/g, "").toUpperCase();
}

export function formatPairingCode(input = "") {
  const code = normalizePairingCode(input);
  if (code.length !== PAIRING_CODE_LENGTH) return code;
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function isValidPairingCode(input = "") {
  const code = normalizePairingCode(input);
  return code.length === PAIRING_CODE_LENGTH && /^[A-Z0-9]+$/.test(code);
}

export function generatePairingCode() {
  let raw = "";
  for (let i = 0; i < PAIRING_CODE_LENGTH; i++) {
    raw += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return formatPairingCode(raw);
}

export function exportLocalData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(SYNC_PREFIX)) {
      data[key] = localStorage.getItem(key);
    }
  }
  return {
    version: SYNC_VERSION,
    exportedAt: Date.now(),
    data,
  };
}

export function importLocalData(bundle) {
  if (!bundle || bundle.version !== SYNC_VERSION || !bundle.data) {
    throw new Error("同步数据格式无效");
  }

  try {
    const raw = localStorage.getItem("toefl666_settings");
    if (raw) {
      const settings = JSON.parse(raw);
      if (settings.aiApiKey) {
        delete settings.aiApiKey;
        localStorage.setItem("toefl666_settings", JSON.stringify(settings));
      }
    }
  } catch {
    // ignore
  }

  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(SYNC_PREFIX)) keysToRemove.push(key);
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }

  for (const [key, value] of Object.entries(bundle.data)) {
    if (!key.startsWith(SYNC_PREFIX) || typeof value !== "string") continue;
    if (key === "toefl666_settings") {
      try {
        const settings = JSON.parse(value);
        delete settings.aiApiKey;
        localStorage.setItem(key, JSON.stringify(settings));
        continue;
      } catch {
        // fall through
      }
    }
    localStorage.setItem(key, value);
  }
}

export function getSyncSummary() {
  try {
    const recognized = JSON.parse(localStorage.getItem("toefl666_recognized") || "[]");
    const unrecognized = JSON.parse(localStorage.getItem("toefl666_unrecognized") || "[]");
    const progress = JSON.parse(localStorage.getItem("toefl666_progress") || "{}");
    const listCount = Object.keys(progress.listProgress || {}).length;
    return {
      recognized: Array.isArray(recognized) ? recognized.length : 0,
      unrecognized: Array.isArray(unrecognized) ? unrecognized.length : 0,
      listCount,
    };
  } catch {
    return { recognized: 0, unrecognized: 0, listCount: 0 };
  }
}
