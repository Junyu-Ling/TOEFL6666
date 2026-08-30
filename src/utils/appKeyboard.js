const OVERLAY_SELECTORS = [
  ".vocab-assistant__panel",
  ".settings-panel",
  ".settings-overlay",
  ".streak-panel",
  ".mic-prompt",
  ".round-complete-overlay",
].join(", ");

const TEXT_INPUT_SELECTORS =
  "input, textarea, select, [contenteditable='true'], [contenteditable='']";

function isTextEntryElement(element) {
  return element instanceof Element && element.matches(TEXT_INPUT_SELECTORS);
}

function isWithinOverlay(element) {
  return element instanceof Element && Boolean(element.closest(OVERLAY_SELECTORS));
}

/** 用户正在输入或使用浮层面板时，跳过全局游戏快捷键。 */
export function shouldIgnoreAppGameKeys(event, { allowFullscreen = false } = {}) {
  const fullscreenOpen = Boolean(document.querySelector(".fullscreen-lexgrid"));
  const candidates = [event?.target, document.activeElement];

  for (const element of candidates) {
    if (!(element instanceof Element)) continue;
    if (isTextEntryElement(element)) return true;
    if (!allowFullscreen && isWithinOverlay(element)) return true;
  }

  if (fullscreenOpen && !allowFullscreen) return true;

  return false;
}

/** 阻止按键冒泡到 window 上的游戏监听器（挂在浮层面板根节点）。 */
export function stopGameKeyBubble(event) {
  event.stopPropagation();
}

/** 认识 / 不认识快捷键：优先用 code，避免输入法改写 key 后失灵。 */
export function isMarkKnownKey(event) {
  const code = event?.code;
  const key = event?.key;
  return code === "Digit1" || code === "Numpad1" || key === "1" || key === "１";
}

export function isMarkUnknownKey(event) {
  const code = event?.code;
  const key = event?.key;
  return code === "Digit0" || code === "Numpad0" || key === "0" || key === "０";
}
