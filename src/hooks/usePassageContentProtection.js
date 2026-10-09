import { useEffect, useMemo, useState } from "react";

function touchesRoot(root, node) {
  if (!root || !node) return false;
  return root.contains(node instanceof Node ? node : null);
}

function selectionTouchesRoot(root) {
  const selection = document.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  return root.contains(range.commonAncestorContainer);
}

function isBlankInput(node) {
  return node instanceof HTMLInputElement && node.classList.contains("rfill-blank__box");
}

function watermarkLabel(user) {
  const email = String(user?.email || "").trim();
  if (email) return email;
  const phone = String(user?.phone || "").trim();
  if (phone) return phone;
  const name = String(user?.name || user?.login || "").trim();
  if (name) return name;
  const id = String(user?.id || "").trim();
  if (id) return id.slice(0, 16);
  return "未登录访客";
}

function isScreenshotChord(event) {
  const key = event.key;
  const code = event.code;
  if (key === "PrintScreen" || code === "PrintScreen") return true;
  // Win+Shift / Ctrl+Shift：在按下 S 之前就遮盖，抢在截图工具前面
  if (event.shiftKey && (event.metaKey || event.ctrlKey)) return true;
  if ((key === "Shift" || code.startsWith("Shift")) && (event.metaKey || event.ctrlKey)) return true;
  if ((key === "Meta" || key === "Control" || code === "MetaLeft" || code === "MetaRight" || code === "ControlLeft" || code === "ControlRight") && event.shiftKey) {
    return true;
  }
  return false;
}

/**
 * 阅读填词防外泄：禁复制/选中、账号水印、失焦遮盖。
 * 截屏组合键在 keydown 捕获阶段立刻改 DOM class，不走 React 渲染延迟。
 */
export function usePassageContentProtection(rootRef, { enabled = true, user = null } = {}) {
  const [obscured, setObscured] = useState(false);
  const [captureHint, setCaptureHint] = useState("");
  const mark = useMemo(() => watermarkLabel(user), [user]);

  useEffect(() => {
    if (!enabled) {
      setObscured(false);
      setCaptureHint("");
      return undefined;
    }

    const root = rootRef.current;
    if (!root) return undefined;

    let hintTimer = 0;
    let chordCover = false;

    const showHint = (text) => {
      setCaptureHint(text);
      window.clearTimeout(hintTimer);
      hintTimer = window.setTimeout(() => setCaptureHint(""), 2800);
    };

    /** 同步遮盖：先改 class 再 setState，避免比系统截屏慢一帧 */
    const coverNow = (hint) => {
      chordCover = true;
      root.classList.add("rfill__body--obscured");
      setObscured(true);
      if (hint) showHint(hint);
    };

    const uncoverIfSafe = () => {
      if (document.visibilityState !== "visible" || !document.hasFocus()) return;
      chordCover = false;
      root.classList.remove("rfill__body--obscured");
      setObscured(false);
    };

    const blockClipboard = (event) => {
      if (isBlankInput(event.target)) return;
      if (touchesRoot(root, event.target) || selectionTouchesRoot(root)) {
        event.preventDefault();
        showHint("题目内容禁止复制");
      }
    };

    const onContextMenu = (event) => {
      if (isBlankInput(event.target)) return;
      if (touchesRoot(root, event.target)) {
        event.preventDefault();
      }
    };

    const onSelectStart = (event) => {
      if (isBlankInput(event.target)) return;
      if (touchesRoot(root, event.target)) {
        event.preventDefault();
      }
    };

    const onDragStart = (event) => {
      if (touchesRoot(root, event.target)) {
        event.preventDefault();
      }
    };

    const clearClipboardSoon = () => {
      window.setTimeout(() => {
        navigator.clipboard?.writeText?.("").catch(() => {});
      }, 0);
    };

    const onKeyDown = (event) => {
      if (isScreenshotChord(event)) {
        // 捕获阶段立刻遮盖，不等 React 重渲染
        coverNow("已抢先遮盖题目");
        if (event.key === "PrintScreen" || event.code === "PrintScreen") {
          clearClipboardSoon();
        }
      }

      const mod = event.ctrlKey || event.metaKey;
      if (!mod) return;

      const key = event.key.toLowerCase();
      if (!["c", "x", "a", "p", "s"].includes(key)) return;

      const active = document.activeElement;
      if (isBlankInput(active) && (key === "c" || key === "x" || key === "a")) return;

      if (key === "p" || (key === "s" && !event.shiftKey) || touchesRoot(root, active) || selectionTouchesRoot(root)) {
        event.preventDefault();
        if (key === "c" || key === "x") showHint("题目内容禁止复制");
        if (key === "p" || (key === "s" && !event.shiftKey)) showHint("本题禁止打印 / 另存");
      }
    };

    const onKeyUp = (event) => {
      if (event.key === "PrintScreen" || event.code === "PrintScreen") {
        clearClipboardSoon();
      }
      // 组合键松开且窗口仍在前台时再揭开；截图工具抢焦点时继续遮着
      if (chordCover && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
        uncoverIfSafe();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        coverNow("离开页面时题目已遮盖，防止录屏外泄");
        return;
      }
      uncoverIfSafe();
    };

    const onBlur = () => coverNow();
    const onFocus = () => uncoverIfSafe();

    root.addEventListener("copy", blockClipboard);
    root.addEventListener("cut", blockClipboard);
    root.addEventListener("contextmenu", onContextMenu);
    root.addEventListener("selectstart", onSelectStart);
    root.addEventListener("dragstart", onDragStart);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearTimeout(hintTimer);
      root.classList.remove("rfill__body--obscured");
      root.removeEventListener("copy", blockClipboard);
      root.removeEventListener("cut", blockClipboard);
      root.removeEventListener("contextmenu", onContextMenu);
      root.removeEventListener("selectstart", onSelectStart);
      root.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, rootRef]);

  return { obscured, captureHint, watermark: mark };
}
