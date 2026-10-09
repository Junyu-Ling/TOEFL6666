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

/**
 * 阅读填词防外泄：禁复制/选中、账号水印、失焦遮盖、PrintScreen 清剪贴板。
 * 说明：网页无法可靠拦截系统截屏、录屏或外置相机拍摄；水印用于追溯外泄。
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
    const showHint = (text) => {
      setCaptureHint(text);
      window.clearTimeout(hintTimer);
      hintTimer = window.setTimeout(() => setCaptureHint(""), 2800);
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
      if (event.key === "PrintScreen") {
        event.preventDefault();
        clearClipboardSoon();
        setObscured(true);
        showHint("检测到截屏快捷键，已暂时遮盖题目");
        window.setTimeout(() => {
          if (document.visibilityState === "visible" && document.hasFocus()) {
            setObscured(false);
          }
        }, 1600);
        return;
      }

      const mod = event.ctrlKey || event.metaKey;
      if (!mod) return;

      const key = event.key.toLowerCase();
      if (!["c", "x", "a", "p", "s"].includes(key)) return;

      const active = document.activeElement;
      if (isBlankInput(active) && (key === "c" || key === "x" || key === "a")) return;

      if (key === "p" || key === "s" || touchesRoot(root, active) || selectionTouchesRoot(root)) {
        event.preventDefault();
        if (key === "c" || key === "x") showHint("题目内容禁止复制");
        if (key === "p" || key === "s") showHint("本题禁止打印 / 另存");
      }
    };

    const onKeyUp = (event) => {
      if (event.key === "PrintScreen") {
        clearClipboardSoon();
      }
    };

    const syncVisibility = () => {
      const hidden = document.visibilityState === "hidden" || !document.hasFocus();
      setObscured(hidden);
      if (hidden) {
        showHint("离开页面时题目已遮盖，防止录屏外泄");
      }
    };

    const onVisibility = () => syncVisibility();
    const onBlur = () => setObscured(true);
    const onFocus = () => {
      if (document.visibilityState === "visible") setObscured(false);
    };

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
