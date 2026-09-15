const BLANK_INPUT_CLASS = "rfill-blank__box";
const RESTORE_IME_SELECTOR = [
  ".navbar",
  ".vocab-assistant",
  ".settings-overlay",
  ".settings-panel",
  ".login-modal",
  ".login-modal__overlay",
  ".streak-panel",
  ".mic-prompt",
].join(", ");

let previousLang = null;
let previousImeMode = "";
let locked = false;

function letterFromCode(code) {
  if (!code || !/^Key[A-Z]$/.test(code)) return "";
  return code.slice(3);
}

function letterFromKey(key) {
  if (!key || key.length !== 1) return "";
  if (/^[a-zA-Z]$/.test(key)) return key;
  const code = key.charCodeAt(0);
  if (code >= 0xff21 && code <= 0xff3a) return String.fromCharCode(code - 0xfee0);
  if (code >= 0xff41 && code <= 0xff5a) return String.fromCharCode(code - 0xfee0);
  return "";
}

/** 从键盘事件取出英文字母。中文输入法下 key 常为 Process，仍可用 code。 */
export function letterFromKeyboardEvent(event) {
  const fromCode = letterFromCode(event?.code);
  if (fromCode) {
    return event.shiftKey ? fromCode : fromCode.toLowerCase();
  }
  return letterFromKey(event?.key);
}

export function latinLetterFromText(value) {
  const latin = String(value ?? "").replace(/[^a-zA-Z]/g, "");
  return latin.slice(-1);
}

export function isBlankImeInput(node) {
  return node instanceof HTMLElement && node.classList.contains(BLANK_INPUT_CLASS);
}

export function shouldRestoreEnglishIme(node) {
  return node instanceof Element && Boolean(node.closest(RESTORE_IME_SELECTOR));
}

export function lockEnglishIme() {
  if (locked || typeof document === "undefined") return;
  const root = document.documentElement;
  previousLang = root.getAttribute("lang");
  previousImeMode = root.style.getPropertyValue("ime-mode");
  root.setAttribute("lang", "en");
  root.style.setProperty("ime-mode", "disabled");
  locked = true;
}

export function restoreEnglishIme() {
  if (!locked || typeof document === "undefined") return;
  const root = document.documentElement;
  if (previousLang == null) root.removeAttribute("lang");
  else root.setAttribute("lang", previousLang);
  if (previousImeMode) root.style.setProperty("ime-mode", previousImeMode);
  else root.style.removeProperty("ime-mode");
  previousLang = null;
  previousImeMode = "";
  locked = false;
}

/** 打断正在进行的中文输入法组字，避免汉字覆盖已填入的字母。 */
export function dismissImeComposition(element) {
  if (!(element instanceof HTMLInputElement)) return;
  const wasReadOnly = element.readOnly;
  element.readOnly = true;
  window.requestAnimationFrame(() => {
    if (element.isConnected) element.readOnly = wasReadOnly;
  });
}
