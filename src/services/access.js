const memoryCache = new Map();

async function accessRequest(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const cacheable = (!method || method === "GET") && (path.includes("/reading-fill/") || path.includes("/reading-vocab/"));
  if (cacheable && memoryCache.has(path)) return memoryCache.get(path);
  const res = await fetch(path, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `请求失败 (${res.status})`);
    error.status = res.status;
    throw error;
  }
  if (cacheable) memoryCache.set(path, data);
  return data;
}

export async function fetchAccessMe() {
  return accessRequest("/api/access/me");
}

export async function fetchAccessUsers() {
  return accessRequest("/api/access/users");
}

export async function grantFeature(userId, feature, enabled) {
  return accessRequest("/api/access/grant", {
    method: "POST",
    body: { userId, feature, enabled },
  });
}

export async function grantReadingFill(userId, enabled) {
  return grantFeature(userId, "reading-fill", enabled);
}

export async function grantReadingVocab(userId, enabled) {
  return grantFeature(userId, "reading-vocab", enabled);
}

export async function fetchReadingFillArticles() {
  return accessRequest("/api/reading-fill/articles");
}

export async function fetchReadingVocabCollections() {
  return accessRequest("/api/reading-vocab/collections");
}
