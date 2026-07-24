const LATIN_LETTER_RE = /^[a-zA-Z]$/;
const NON_LATIN_RE = /[^\x00-\x7F]/;

export function isLatinLetter(char) {
  return LATIN_LETTER_RE.test(char);
}

export function extractLatinLetter(value) {
  const match = String(value).match(/[a-zA-Z]/g);
  return match ? match[match.length - 1] : "";
}

export function containsNonLatinText(value) {
  return NON_LATIN_RE.test(String(value));
}

export function shouldBlockBeforeInput(event) {
  if (event.isComposing) return true;

  const inputType = event.inputType ?? "";
  if (inputType === "insertCompositionText" || inputType.startsWith("insertComposition")) {
    return true;
  }

  const data = event.data ?? "";
  if (!data) return false;
  return !isLatinLetter(data);
}
