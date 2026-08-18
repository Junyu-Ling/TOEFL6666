import { supabase, isSupabaseConfigured } from "./supabase";

const SYNC_KEYS = [
  "toefl666_progress",
  "toefl666_reading_vocab_progress",
  "toefl666_familiar_obscure_progress",
  "toefl666_sat_transition_words",
  "toefl666_reading_fill_blank",
  "toefl666_lexgrid_progress",
  "toefl666_streak",
  "toefl666_settings",
];

export async function pushProgress(userId, key) {
  if (!isSupabaseConfigured()) return;
  const raw = localStorage.getItem(key);
  if (raw === null) return;
  const { error } = await supabase.from("user_progress").upsert(
    { user_id: userId, key, value: raw, updated_at: new Date().toISOString() },
    { onConflict: "user_id,key" }
  );
  if (error) console.warn("[cloudSync] push failed:", key, error.message);
}

export async function pullProgress(userId, key) {
  if (!isSupabaseConfigured()) return;
  const { data, error } = await supabase
    .from("user_progress")
    .select("value, updated_at")
    .eq("user_id", userId)
    .eq("key", key)
    .maybeSingle();

  if (error) {
    console.warn("[cloudSync] pull failed:", key, error.message);
    return;
  }
  if (!data) return;

  const localRaw = localStorage.getItem(key);
  if (localRaw !== null) {
    try {
      const cloudUpdated = new Date(data.updated_at).getTime();
      const localObj = JSON.parse(localRaw);
      const localUpdated = localObj._updatedAt ? new Date(localObj._updatedAt).getTime() : 0;
      if (localUpdated >= cloudUpdated) return;
    } catch {
      // if parse fails, cloud wins
    }
  }
  localStorage.setItem(key, data.value);
}

export async function pushAllProgress(userId) {
  await Promise.allSettled(SYNC_KEYS.map((key) => pushProgress(userId, key)));
}

export async function pullAllProgress(userId) {
  await Promise.allSettled(SYNC_KEYS.map((key) => pullProgress(userId, key)));
}

export async function pushProgressDebounced(userId, key) {
  if (!userId) return;
  try {
    await pushProgress(userId, key);
  } catch (e) {
    console.warn("[cloudSync] debounced push error:", e);
  }
}
