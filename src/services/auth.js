import { supabase, isSupabaseConfigured } from "./supabase";

function normalizePhone(raw) {
  const digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("0")) return `+86${digits.slice(1)}`;
  if (digits.startsWith("86") && digits.length === 13) return `+${digits}`;
  if (digits.length === 11) return `+86${digits}`;
  return `+${digits}`;
}

export async function sendOtp(phone) {
  if (!isSupabaseConfigured()) throw new Error("手机号登录需要短信服务，当前请用 GitHub 登录");
  const { error } = await supabase.auth.signInWithOtp({
    phone: normalizePhone(phone),
  });
  if (error) throw error;
}

export async function verifyOtp(phone, token) {
  if (!isSupabaseConfigured()) throw new Error("手机号登录需要短信服务，当前请用 GitHub 登录");
  const { data, error } = await supabase.auth.verifyOtp({
    phone: normalizePhone(phone),
    token,
    type: "sms",
  });
  if (error) throw error;
  return data;
}

export async function sendEmailOtp(email) {
  if (!isSupabaseConfigured()) throw new Error("邮箱登录尚未单独接好，当前请用 GitHub 登录");
  const trimmed = String(email || "").trim();
  if (!trimmed) throw new Error("请输入邮箱");
  const { error } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyEmailOtp(email, token) {
  if (!isSupabaseConfigured()) throw new Error("邮箱登录尚未单独接好，当前请用 GitHub 登录");
  const { data, error } = await supabase.auth.verifyOtp({
    email: String(email || "").trim(),
    token: String(token || "").trim(),
    type: "email",
  });
  if (error) throw error;
  return data;
}

export async function signInWithProvider(providerId) {
  if (providerId === "github") {
    window.location.href = "/api/auth/github/start";
    return;
  }
  if (providerId === "google") {
    window.location.href = "/api/auth/google/start";
    return;
  }
  throw new Error("不支持的登录方式");
}

export async function signOut() {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getAppUser() {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return data.user || null;
}

export async function syncIdentitySession(accessToken = "") {
  const headers = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch("/api/auth/identity", {
    method: "POST",
    credentials: "include",
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "账号关联失败");
  }
  return data.user || null;
}

export async function linkAccountIdentity({ email = "", phone = "" } = {}) {
  const res = await fetch("/api/auth/link", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, phone }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "绑定失败");
  }
  return data.user || null;
}

export async function getSession() {
  if (!isSupabaseConfigured()) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function getUser() {
  return (await getAppUser()) || (await getSession())?.user || null;
}
