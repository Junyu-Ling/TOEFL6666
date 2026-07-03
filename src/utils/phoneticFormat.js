export function normalizeIpa(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  if (value.startsWith("/") || value.startsWith("[")) return value;
  return `/${value}/`;
}

export function pickPhonetic(entry) {
  if (!entry) return "";

  const phonetics = Array.isArray(entry.phonetics) ? entry.phonetics : [];
  const us = phonetics.find((item) => item.text && /-us\b|\/us\//i.test(item.audio || ""));
  if (us?.text) return normalizeIpa(us.text);

  const uk = phonetics.find((item) => item.text && /-gb\b|\/uk\//i.test(item.audio || ""));
  if (uk?.text) return normalizeIpa(uk.text);

  const first = phonetics.find((item) => item.text)?.text;
  if (first) return normalizeIpa(first);

  return normalizeIpa(entry.phonetic);
}

export function pickPhoneticFromApiPayload(data) {
  return pickPhonetic(Array.isArray(data) ? data[0] : null);
}
