import { supabase } from "./supabase";

function normalizePhone(raw) {
  const digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("0")) return `+86${digits.slice(1)}`;
  if (digits.startsWith("86") && digits.length === 13) return `+${digits}`;
  if (digits.length === 11) return `+86${digits}`;
  return `+${digits}`;
}

export async function sendOtp(phone) {
  const { error } = await supabase.auth.signInWithOtp({
    phone: normalizePhone(phone),
  });
  if (error) throw error;
}

export async function verifyOtp(phone, token) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone: normalizePhone(phone),
    token,
    type: "sms",
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function getUser() {
  const session = await getSession();
  return session?.user ?? null;
}
