export function getUserProfile(user) {
  if (!user) return null;

  const meta = user.user_metadata || {};
  const email = user.email || "";
  const name =
    meta.full_name ||
    meta.name ||
    (email.includes("@") ? email.split("@")[0] : "") ||
    "用户";

  return {
    name,
    email,
    avatarUrl: meta.avatar_url || meta.picture || "",
  };
}

export function getInitials(name = "") {
  const trimmed = String(name).trim();
  if (!trimmed) return "?";
  if (/[\u4e00-\u9fff]/.test(trimmed)) return trimmed.slice(0, 1);
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}
