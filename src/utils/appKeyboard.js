const OVERLAY_SELECTORS = [
  ".vocab-assistant",
  ".settings-panel",
  ".settings-overlay",
  ".streak-panel",
  ".mic-prompt",
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
export function shouldIgnoreAppGameKeys(event) {
  const candidates = [event?.target, document.activeElement];

  for (const element of candidates) {
    if (!(element instanceof Element)) continue;
    if (isTextEntryElement(element)) return true;
    if (isWithinOverlay(element)) return true;
  }

  return false;
}

/** 阻止按键冒泡到 window 上的游戏监听器（挂在浮层面板根节点）。 */
export function stopGameKeyBubble(event) {
  event.stopPropagation();
}
