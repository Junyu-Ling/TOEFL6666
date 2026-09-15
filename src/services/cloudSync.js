const SYNC_KEYS = [
  "toefl666_progress",
  "toefl666_reading_vocab_progress",
  "toefl666_familiar_obscure_progress",
  "toefl666_sat_transition_words",
  "toefl666_reading_fill_blank",
  "toefl666_lexgrid_progress",
  "toefl666_streak",
];

function localUpdatedAt(raw) {
  if (raw == null) return 0;
  try {
    const parsed = JSON.parse(raw);
    return parsed?._updatedAt ? new Date(parsed._updatedAt).getTime() : Date.now();
  } catch {
    return Date.now();
  }
}

export async function pushProgress(userId, key) {
  if (!userId || !SYNC_KEYS.includes(key)) return;
  const raw = localStorage.getItem(key);
  if (raw === null) return;
  const res = await fetch("/api/sync/account", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: { [key]: { value: raw, updatedAt: localUpdatedAt(raw) } },
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.warn("[cloudSync] push failed:", key, data.error || res.status);
  }
}

export async function pullProgress(userId, key) {
  if (!userId) return;
  const res = await fetch("/api/sync/account", { credentials: "include" });
  if (!res.ok) return;
  const data = await res.json().catch(() => ({}));
  const item = data.items?.[key];
  if (!item?.value) return;
  applyCloudItem(key, item);
}

function applyCloudItem(key, item) {
  const localRaw = localStorage.getItem(key);
  if (localRaw !== null) {
    const localUpdated = localUpdatedAt(localRaw);
    if (localUpdated >= (Number(item.updatedAt) || 0)) return;
  }
  localStorage.setItem(key, item.value);
}

export async function pushAllProgress(userId) {
  if (!userId) return;
  const items = {};
  for (const key of SYNC_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    items[key] = { value: raw, updatedAt: localUpdatedAt(raw) };
  }
  if (!Object.keys(items).length) return;
  const res = await fetch("/api/sync/account", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.warn("[cloudSync] push all failed:", data.error || res.status);
  }
}

export async function pullAllProgress(userId) {
  if (!userId) return;
  const res = await fetch("/api/sync/account", { credentials: "include" });
  if (!res.ok) return;
  const data = await res.json().catch(() => ({}));
  for (const [key, item] of Object.entries(data.items || {})) {
    if (SYNC_KEYS.includes(key) && item?.value != null) applyCloudItem(key, item);
  }
}

export async function pushProgressDebounced(userId, key) {
  if (!userId) return;
  try {
    await pushProgress(userId, key);
  } catch (e) {
    console.warn("[cloudSync] debounced push error:", e);
  }
}
