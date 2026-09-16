export const HARDCODED_ADMIN_EMAILS = ["jy.ling.cc@gmail.com"];

function collectUserEmails(user) {
  return [...new Set([user?.email, ...(user?.emails || []), user?.user_metadata?.email].map((item) =>
    String(item || "").trim().toLowerCase()
  ).filter(Boolean))];
}

export function isHardcodedAdminUser(user) {
  if (!user) return false;
  const emails = new Set(HARDCODED_ADMIN_EMAILS);
  return collectUserEmails(user).some((email) => emails.has(email));
}

export function accessFallbackFromUser(user) {
  if (isHardcodedAdminUser(user)) {
    return { isAdmin: true, canUseReadingFill: true };
  }
  return null;
}
