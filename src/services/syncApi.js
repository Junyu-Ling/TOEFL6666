function authHeaders(accessToken) {
  if (!accessToken) {
    throw new Error("请先登录 Google 账号");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function pushSyncPayload(payload, accessToken) {
  const res = await fetch("/api/sync/push", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `上传失败 (${res.status})`);
  return data;
}

export async function pullSyncPayload(accessToken) {
  const res = await fetch("/api/sync/pull", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `拉取失败 (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export function isCloudEmptyError(err) {
  return err?.status === 404 || /暂无进度/.test(String(err?.message || ""));
}
