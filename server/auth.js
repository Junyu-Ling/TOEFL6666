import { createClient } from "@supabase/supabase-js";

function createError(message, status = 500) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || "";
  if (typeof header !== "string" || !header.startsWith("Bearer ")) return "";
  return header.slice(7).trim();
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw createError("服务端未配置 Supabase，无法验证登录", 503);
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function authenticateRequest(req) {
  const token = getBearerToken(req);
  if (!token) {
    throw createError("请先登录 Google 账号", 401);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    throw createError("登录已过期，请重新登录", 401);
  }

  return data.user;
}
