const LATIN_LETTER_RE = /^[a-zA-Z]$/;
const LATIN_TEXT_RE = /^[a-zA-Z]+$/;
const NON_LATIN_RE = /[^\x00-\x7F]/;

export function isLatinLetter(char) {
  return LATIN_LETTER_RE.test(char);
}

export function isLatinText(value) {
  return LATIN_TEXT_RE.test(String(value));
}

export function extractLatinLetter(value) {
  const match = String(value).match(/[a-zA-Z]/g);
  return match ? match[match.length - 1] : "";
}

export function containsNonLatinText(value) {
  return NON_LATIN_RE.test(String(value));
}

export function isBlockedCompositionText(value) {
  const text = String(value ?? "");
  if (!text) return false;
  if (isLatinText(text)) return false;
  return containsNonLatinText(text);
}

export function shouldBlockBeforeInput(event) {
  const data = event.data ?? "";
  if (!data) return false;

  const inputType = event.inputType ?? "";
  if (inputType === "insertCompositionText" || inputType.startsWith("insertComposition")) {
    return isBlockedCompositionText(data);
  }

  return !isLatinLetter(data);
}

export function shouldWarnImeBlocked(value) {
  const text = String(value ?? "");
  if (!text) return false;
  if (extractLatinLetter(text)) return false;
  return isBlockedCompositionText(text);
}
