import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  if (event.shiftKey && (event.metaKey || event.ctrlKey)) return true;
  if ((key === "Shift" || code.startsWith("Shift")) && (event.metaKey || event.ctrlKey)) return true;
  if (
    (key === "Meta" ||
      key === "Control" ||
      code === "MetaLeft" ||
      code === "MetaRight" ||
      code === "ControlLeft" ||
      code === "ControlRight") &&
    event.shiftKey
  ) {
    return true;
  }
  return false;
}

/**
 * 阅读填词防外泄。
 * 离开页面 / 失焦视为可能正在录屏：回来后仍锁定，需确认已关闭录屏才能继续看题。
 * 网页无法 100% 识别 OBS 等外部录屏，只能用失焦锁定 + 人工确认。
 */
export function usePassageContentProtection(rootRef, { enabled = true, user = null } = {}) {
  const [obscured, setObscured] = useState(false);
  const [recordingLock, setRecordingLock] = useState(false);
  const [captureHint, setCaptureHint] = useState("");
  const mark = useMemo(() => watermarkLabel(user), [user]);
  const recordingLockRef = useRef(false);

  const applyCoverClass = useCallback((on) => {
    const root = rootRef.current;
    if (!root) return;
    root.classList.toggle("rfill__body--obscured", on);
  }, [rootRef]);

  const lockForRecording = useCallback(
    (hint) => {
      recordingLockRef.current = true;
      setRecordingLock(true);
      setObscured(true);
      applyCoverClass(true);
      if (hint) setCaptureHint(hint);
    },
    [applyCoverClass]
  );

  const acknowledgeRecordingOff = useCallback(() => {
    if (document.visibilityState !== "visible" || !document.hasFocus()) return;
    recordingLockRef.current = false;
    setRecordingLock(false);
    setObscured(false);
    setCaptureHint("");
    applyCoverClass(false);
  }, [applyCoverClass]);

  useEffect(() => {
    if (!enabled) {
      recordingLockRef.current = false;
      setRecordingLock(false);
      setObscured(false);
      setCaptureHint("");
      applyCoverClass(false);
      return undefined;
    }

    const root = rootRef.current;
    if (!root) return undefined;

    let hintTimer = 0;
    let chordCover = false;

    const showHint = (text) => {
      setCaptureHint(text);
      window.clearTimeout(hintTimer);
      hintTimer = window.setTimeout(() => {
        if (!recordingLockRef.current) setCaptureHint("");
      }, 2800);
    };

    const coverTemp = (hint) => {
      chordCover = true;
      setObscured(true);
      applyCoverClass(true);
      if (hint) showHint(hint);
    };

    const uncoverTempIfSafe = () => {
      if (recordingLockRef.current) return;
      if (document.visibilityState !== "visible" || !document.hasFocus()) return;
      chordCover = false;
      setObscured(false);
      applyCoverClass(false);
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
      if (touchesRoot(root, event.target)) event.preventDefault();
    };

    const onSelectStart = (event) => {
      if (isBlankInput(event.target)) return;
      if (touchesRoot(root, event.target)) event.preventDefault();
    };

    const onDragStart = (event) => {
      if (touchesRoot(root, event.target)) event.preventDefault();
    };

    const clearClipboardSoon = () => {
      window.setTimeout(() => {
        navigator.clipboard?.writeText?.("").catch(() => {});
      }, 0);
    };

    const onKeyDown = (event) => {
      if (isScreenshotChord(event)) {
        // 截屏组合键：直接按录屏锁定处理，回来也要确认
        lockForRecording("检测到截屏 / 录屏操作，请关闭后再继续看题");
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
      if (recordingLockRef.current) return;
      if (chordCover && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
        uncoverTempIfSafe();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        lockForRecording("检测到离开本页，可能正在录屏");
        return;
      }
      // 回到前台：保持锁定，需手动确认已关录屏
      if (recordingLockRef.current) {
        setObscured(true);
        applyCoverClass(true);
        setCaptureHint("请先关闭录屏，再继续看题");
      }
    };

    const onBlur = () => {
      lockForRecording("检测到窗口失焦，可能正在录屏");
    };

    const onFocus = () => {
      if (recordingLockRef.current) {
        setObscured(true);
        applyCoverClass(true);
        setCaptureHint("请先关闭录屏，再继续看题");
        return;
      }
      uncoverTempIfSafe();
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
  }, [applyCoverClass, enabled, lockForRecording, rootRef]);

  return {
    obscured: obscured || recordingLock,
    recordingLock,
    captureHint,
    watermark: mark,
    acknowledgeRecordingOff,
  };
}
