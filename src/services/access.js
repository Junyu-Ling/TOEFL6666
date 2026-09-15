async function accessRequest(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
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
  return data;
}

export async function fetchAccessMe() {
  return accessRequest("/api/access/me");
}

export async function fetchAccessUsers() {
  return accessRequest("/api/access/users");
}

export async function grantReadingFill(userId, enabled) {
  return accessRequest("/api/access/grant", {
    method: "POST",
    body: { userId, feature: "reading-fill", enabled },
  });
}
