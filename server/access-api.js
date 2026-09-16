import { createClient } from "@supabase/supabase-js";
import { getEnv } from "./sync-store.js";
import { readSessionUser } from "./auth-session.js";
import {
  getAccessSnapshot,
  isUserStoreReady,
  listAccessUsers,
  setFeatureGrant,
  FEATURE_READING_FILL,
} from "./access-store.js";

function createError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || "";
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function getSupabaseAuthClient() {
  const env = getEnv();
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function readSupabaseUser(req) {
  const token = getBearerToken(req);
  if (!token) return null;
  const supabase = getSupabaseAuthClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export async function requireAccessUser(req) {
  const sessionUser = readSessionUser(req);
  if (sessionUser) return sessionUser;
  const supabaseUser = await readSupabaseUser(req);
  if (supabaseUser) return supabaseUser;
  throw createError("请先登录", 401);
}

export async function handleAccessMe(req) {
  const user = await requireAccessUser(req);
  return getAccessSnapshot(user);
}

export async function handleAccessUsers(req) {
  const user = await requireAccessUser(req);
  const snapshot = await getAccessSnapshot(user);
  if (!snapshot.isAdmin) throw createError("没有管理员权限", 403);
  return { users: await listAccessUsers(), storageReady: isUserStoreReady() };
}

export async function handleAccessGrant(req, body) {
  const user = await requireAccessUser(req);
  const snapshot = await getAccessSnapshot(user);
  if (!snapshot.isAdmin) throw createError("没有管理员权限", 403);
  const userId = String(body?.userId || "").trim();
  const feature = String(body?.feature || FEATURE_READING_FILL).trim();
  const enabled = Boolean(body?.enabled);
  return setFeatureGrant(userId, feature, enabled);
}
