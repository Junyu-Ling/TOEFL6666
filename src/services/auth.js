import { supabase, isSupabaseConfigured } from "./supabase";

function normalizePhone(raw) {
  const digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("0")) return `+86${digits.slice(1)}`;
  if (digits.startsWith("86") && digits.length === 13) return `+${digits}`;
  if (digits.length === 11) return `+86${digits}`;
  return `+${digits}`;
}

export async function sendOtp(phone) {
  if (!isSupabaseConfigured()) throw new Error("账号功能尚未配置，请联系管理员");
  const { error } = await supabase.auth.signInWithOtp({
    phone: normalizePhone(phone),
  });
  if (error) throw error;
}

export async function verifyOtp(phone, token) {
  if (!isSupabaseConfigured()) throw new Error("账号功能尚未配置，请联系管理员");
  const { data, error } = await supabase.auth.verifyOtp({
    phone: normalizePhone(phone),
    token,
    type: "sms",
  });
  if (error) throw error;
  return data;
}

export async function sendEmailOtp(email) {
  if (!isSupabaseConfigured()) throw new Error("账号功能尚未配置，请联系管理员");
  const trimmed = String(email || "").trim();
  if (!trimmed) throw new Error("请输入邮箱");
  const { error } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyEmailOtp(email, token) {
  if (!isSupabaseConfigured()) throw new Error("账号功能尚未配置，请联系管理员");
  const { data, error } = await supabase.auth.verifyOtp({
    email: String(email || "").trim(),
    token: String(token || "").trim(),
    type: "email",
  });
  if (error) throw error;
  return data;
}

const OAUTH_PROVIDERS = {
  google: "google",
  github: "github",
  wechat: "wechat",
  qq: "qq",
  openai: "openai",
};

const OAUTH_HINTS = {
  wechat: "微信登录需先在微信开放平台创建网站应用，并在 Supabase 配置后才能使用。",
  qq: "QQ 登录需先在 QQ 互联创建应用，并在 Supabase 配置后才能使用。",
  openai: "ChatGPT 账号目前不提供网站第三方登录，请改用 Google、GitHub 或邮箱。",
};

export async function signInWithProvider(providerId) {
  if (!isSupabaseConfigured()) throw new Error("账号功能尚未配置，请联系管理员");
  const hint = OAUTH_HINTS[providerId];
  const provider = OAUTH_PROVIDERS[providerId];
  if (!provider) throw new Error("不支持的登录方式");
  if (hint && (providerId === "wechat" || providerId === "qq" || providerId === "openai")) {
    throw new Error(hint);
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) throw error;
}

export async function signOut() {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  if (!isSupabaseConfigured()) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function getUser() {
  const session = await getSession();
  return session?.user ?? null;
}
