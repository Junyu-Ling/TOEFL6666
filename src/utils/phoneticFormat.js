export function normalizeIpa(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  if (value.startsWith("/") || value.startsWith("[")) return value;
  return `/${value}/`;
}

function dialectFromAudio(audio) {
  const value = String(audio || "");
  if (/-us\b|\/us\//i.test(value)) return "us";
  if (/-gb\b|\/uk\//i.test(value)) return "uk";
  return "";
}

export function pickUsUkPhonetics(data) {
  const entries = Array.isArray(data) ? data : data ? [data] : [];
  let us = "";
  let uk = "";
  const unlabeled = [];

  for (const entry of entries) {
    const phonetics = Array.isArray(entry?.phonetics) ? entry.phonetics : [];
    for (const item of phonetics) {
      if (!item?.text) continue;
      const ipa = normalizeIpa(item.text);
      const dialect = dialectFromAudio(item.audio);
      if (dialect === "us" && !us) us = ipa;
      else if (dialect === "uk" && !uk) uk = ipa;
      else unlabeled.push(ipa);
    }
    if (entry?.phonetic) unlabeled.push(normalizeIpa(entry.phonetic));
  }

  const fallback = unlabeled.find(Boolean) || "";
  return {
    us: us || fallback,
    uk: uk || fallback,
  };
}

export function pickPhonetic(entry) {
  const pair = pickUsUkPhonetics(entry ? [entry] : []);
  return pair.us || pair.uk || "";
}

export function pickPhoneticFromApiPayload(data) {
  const pair = pickUsUkPhonetics(data);
  return pair.us || pair.uk || "";
}
