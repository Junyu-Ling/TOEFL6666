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

/** 仅截屏，不视为录屏 */
function isScreenshotOnlyChord(event) {
  const key = event.key;
  const code = event.code;
  if (key === "PrintScreen" || code === "PrintScreen") return true;
  // Win+Shift+S / Ctrl+Shift+S：截图工具，不是持续录屏
  if (event.shiftKey && (event.metaKey || event.ctrlKey) && (key.toLowerCase() === "s" || code === "KeyS")) {
    return true;
  }
  return false;
}

function readIsScreenCaptured() {
  try {
    const devices = navigator.mediaDevices;
    if (!devices) return null;
    if (typeof devices.isScreenCaptured === "boolean") return devices.isScreenCaptured;
    // 部分实验实现可能挂在别处
    if (typeof navigator.isScreenCaptured === "boolean") return navigator.isScreenCaptured;
  } catch {
    // ignore
  }
  return null;
}

/**
 * 阅读填词防外泄。
 * - 截屏：短暂遮盖，自动恢复，不进录屏锁定
 * - 录屏：仅在浏览器提供 isScreenCaptured 信号时锁定；信号变为 false 后自动解锁
 * - 不提供「我已关闭」按钮，避免用户口头确认欺骗
 */
export function usePassageContentProtection(rootRef, { enabled = true, user = null } = {}) {
  const [tempObscured, setTempObscured] = useState(false);
  const [recordingLock, setRecordingLock] = useState(false);
  const [captureHint, setCaptureHint] = useState("");
  const [captureApiAvailable, setCaptureApiAvailable] = useState(false);
  const mark = useMemo(() => watermarkLabel(user), [user]);
  const recordingLockRef = useRef(false);
  const tempTimerRef = useRef(0);

  const applyCoverClass = useCallback(
    (on) => {
      const root = rootRef.current;
      if (!root) return;
      root.classList.toggle("rfill__body--obscured", on);
    },
    [rootRef]
  );

  const setRecording = useCallback((locked, hint) => {
    recordingLockRef.current = locked;
    setRecordingLock(locked);
    if (locked) {
      setTempObscured(true);
      applyCoverClass(true);
      if (hint) setCaptureHint(hint);
    } else {
      setTempObscured(false);
      applyCoverClass(false);
      setCaptureHint("");
    }
  }, [applyCoverClass]);

  useEffect(() => {
    if (!enabled) {
      recordingLockRef.current = false;
      setRecordingLock(false);
      setTempObscured(false);
      setCaptureHint("");
      setCaptureApiAvailable(false);
      applyCoverClass(false);
      return undefined;
    }

    const root = rootRef.current;
    if (!root) return undefined;

    let hintTimer = 0;
    const showHint = (text) => {
      setCaptureHint(text);
      window.clearTimeout(hintTimer);
      hintTimer = window.setTimeout(() => {
        if (!recordingLockRef.current) setCaptureHint("");
      }, 2200);
    };

    const coverTemp = (ms = 900) => {
      window.clearTimeout(tempTimerRef.current);
      setTempObscured(true);
      applyCoverClass(true);
      tempTimerRef.current = window.setTimeout(() => {
        setTempObscured(false);
        if (!recordingLockRef.current) applyCoverClass(false);
      }, ms);
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
      if (isScreenshotOnlyChord(event)) {
        coverTemp(event.key === "PrintScreen" || event.code === "PrintScreen" ? 700 : 1200);
        if (event.key === "PrintScreen" || event.code === "PrintScreen") clearClipboardSoon();
        showHint("已拦截截屏快捷键");
      }

      const mod = event.ctrlKey || event.metaKey;
      if (!mod) return;
      const key = event.key.toLowerCase();
      if (!["c", "x", "a", "p", "s"].includes(key)) return;
      if (event.shiftKey && key === "s") return; // 截屏组合已处理，不拦成「另存」

      const active = document.activeElement;
      if (isBlankInput(active) && (key === "c" || key === "x" || key === "a")) return;

      if (key === "p" || key === "s" || touchesRoot(root, active) || selectionTouchesRoot(root)) {
        event.preventDefault();
        if (key === "c" || key === "x") showHint("题目内容禁止复制");
        if (key === "p" || key === "s") showHint("本题禁止打印 / 另存");
      }
    };

    const onKeyUp = (event) => {
      if (event.key === "PrintScreen" || event.code === "PrintScreen") clearClipboardSoon();
    };

    // —— 录屏信号：仅使用浏览器提供的 isScreenCaptured（若存在）——
    const applyCaptureSignal = (captured) => {
      if (captured === true) {
        setRecording(true, "检测到屏幕录制，题目已锁定。关闭录屏后将自动恢复。");
        return;
      }
      if (captured === false && recordingLockRef.current) {
        setRecording(false);
        showHint("录屏已关闭，可以继续看题");
      }
    };

    const initial = readIsScreenCaptured();
    const hasApi = initial !== null;
    setCaptureApiAvailable(hasApi);
    if (hasApi) applyCaptureSignal(initial);

    const devices = navigator.mediaDevices;
    const onCaptureChange = () => applyCaptureSignal(readIsScreenCaptured());
    if (devices && "onisscreencapturedchange" in devices) {
      devices.addEventListener?.("isscreencapturedchange", onCaptureChange);
    } else if (devices) {
      devices.onisscreencapturedchange = onCaptureChange;
    }

    // 轮询兜底：部分实现只更新属性不派发事件
    const poll = hasApi
      ? window.setInterval(() => applyCaptureSignal(readIsScreenCaptured()), 800)
      : 0;

    // 离开页面时仅暂时遮盖（防肩窥），回页自动恢复——不冒充「录屏检测」
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (!recordingLockRef.current) {
          setTempObscured(true);
          applyCoverClass(true);
        }
        return;
      }
      if (!recordingLockRef.current) {
        setTempObscured(false);
        applyCoverClass(false);
      } else {
        applyCaptureSignal(readIsScreenCaptured());
      }
    };

    const onBlur = () => {
      if (!recordingLockRef.current) {
        setTempObscured(true);
        applyCoverClass(true);
      }
    };

    const onFocus = () => {
      if (recordingLockRef.current) {
        applyCaptureSignal(readIsScreenCaptured());
        return;
      }
      setTempObscured(false);
      applyCoverClass(false);
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
      window.clearTimeout(tempTimerRef.current);
      window.clearInterval(poll);
      root.classList.remove("rfill__body--obscured");
      if (devices) {
        devices.removeEventListener?.("isscreencapturedchange", onCaptureChange);
        if (devices.onisscreencapturedchange === onCaptureChange) {
          devices.onisscreencapturedchange = null;
        }
      }
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
  }, [applyCoverClass, enabled, rootRef, setRecording]);

  return {
    obscured: tempObscured || recordingLock,
    recordingLock,
    captureHint,
    watermark: mark,
    captureApiAvailable,
  };
}
