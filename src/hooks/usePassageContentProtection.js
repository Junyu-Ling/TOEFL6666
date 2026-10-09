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

function watermarkLabel(user, serverMark) {
  if (serverMark?.user) return String(serverMark.user);
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
    if (typeof navigator.isScreenCaptured === "boolean") return navigator.isScreenCaptured;
  } catch {
    // ignore
  }
  return null;
}

/** 启发式检测 DevTools 是否打开（无法 100% 封死，仅作锁定威慑） */
function detectDevtoolsOpen() {
  const threshold = 160;
  const widthGap = Math.abs((window.outerWidth || 0) - (window.innerWidth || 0)) > threshold;
  const heightGap = Math.abs((window.outerHeight || 0) - (window.innerHeight || 0)) > threshold;
  // Firebug / 部分环境
  const firebug = Boolean(window.console && window.console.firebug);
  return widthGap || heightGap || firebug;
}

/**
 * 阅读填词防外泄。
 * - 截屏：短暂遮盖，不进录屏锁定
 * - 录屏：仅 isScreenCaptured 信号
 * - DevTools：检测到打开则锁定，关闭后自动恢复
 */
export function usePassageContentProtection(
  rootRef,
  { enabled = true, user = null, serverWatermark = null } = {}
) {
  const [tempObscured, setTempObscured] = useState(false);
  const [recordingLock, setRecordingLock] = useState(false);
  const [devtoolsLock, setDevtoolsLock] = useState(false);
  const [captureHint, setCaptureHint] = useState("");
  const [captureApiAvailable, setCaptureApiAvailable] = useState(false);
  const mark = useMemo(
    () => watermarkLabel(user, serverWatermark),
    [user, serverWatermark]
  );
  const watermarkIp = serverWatermark?.ip || "";
  const recordingLockRef = useRef(false);
  const devtoolsLockRef = useRef(false);
  const tempTimerRef = useRef(0);

  const applyCoverClass = useCallback(
    (on) => {
      const root = rootRef.current;
      if (!root) return;
      root.classList.toggle("rfill__body--obscured", on);
    },
    [rootRef]
  );

  const syncHardLock = useCallback(
    (recording, devtools, hint) => {
      recordingLockRef.current = recording;
      devtoolsLockRef.current = devtools;
      setRecordingLock(recording);
      setDevtoolsLock(devtools);
      const locked = recording || devtools;
      if (locked) {
        setTempObscured(true);
        applyCoverClass(true);
        if (hint) setCaptureHint(hint);
      } else {
        setTempObscured(false);
        applyCoverClass(false);
        setCaptureHint("");
      }
    },
    [applyCoverClass]
  );

  useEffect(() => {
    if (!enabled) {
      recordingLockRef.current = false;
      devtoolsLockRef.current = false;
      setRecordingLock(false);
      setDevtoolsLock(false);
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
        if (!recordingLockRef.current && !devtoolsLockRef.current) setCaptureHint("");
      }, 2200);
    };

    const coverTemp = (ms = 900) => {
      window.clearTimeout(tempTimerRef.current);
      setTempObscured(true);
      applyCoverClass(true);
      tempTimerRef.current = window.setTimeout(() => {
        setTempObscured(false);
        if (!recordingLockRef.current && !devtoolsLockRef.current) applyCoverClass(false);
      }, ms);
    };

    const hardLocked = () => recordingLockRef.current || devtoolsLockRef.current;

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
      // 常见打开 DevTools 快捷键：拦不下系统级，但可遮盖并提示
      if (
        event.key === "F12" ||
        ((event.ctrlKey || event.metaKey) && event.shiftKey && ["i", "j", "c"].includes(event.key.toLowerCase())) ||
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "u")
      ) {
        syncHardLock(recordingLockRef.current, true, "检测到开发者工具相关操作，题目已锁定");
      }

      if (isScreenshotOnlyChord(event)) {
        coverTemp(event.key === "PrintScreen" || event.code === "PrintScreen" ? 700 : 1200);
        if (event.key === "PrintScreen" || event.code === "PrintScreen") clearClipboardSoon();
        showHint("已拦截截屏快捷键");
      }

      const mod = event.ctrlKey || event.metaKey;
      if (!mod) return;
      const key = event.key.toLowerCase();
      if (!["c", "x", "a", "p", "s"].includes(key)) return;
      if (event.shiftKey && key === "s") return;

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

    const applyCaptureSignal = (captured) => {
      if (captured === true) {
        syncHardLock(true, devtoolsLockRef.current, "检测到屏幕录制，题目已锁定。关闭录屏后将自动恢复。");
        return;
      }
      if (captured === false && recordingLockRef.current) {
        syncHardLock(false, devtoolsLockRef.current);
        if (!devtoolsLockRef.current) showHint("录屏已关闭，可以继续看题");
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

    const poll = hasApi
      ? window.setInterval(() => applyCaptureSignal(readIsScreenCaptured()), 800)
      : 0;

    const pollDevtools = window.setInterval(() => {
      const open = detectDevtoolsOpen();
      if (open && !devtoolsLockRef.current) {
        syncHardLock(recordingLockRef.current, true, "请关闭开发者工具后继续看题");
      } else if (!open && devtoolsLockRef.current) {
        syncHardLock(recordingLockRef.current, false);
        if (!recordingLockRef.current) showHint("开发者工具已关闭，可以继续看题");
      }
    }, 1200);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (!hardLocked()) {
          setTempObscured(true);
          applyCoverClass(true);
        }
        return;
      }
      if (!hardLocked()) {
        setTempObscured(false);
        applyCoverClass(false);
      } else {
        applyCaptureSignal(readIsScreenCaptured());
      }
    };

    const onBlur = () => {
      if (!hardLocked()) {
        setTempObscured(true);
        applyCoverClass(true);
      }
    };

    const onFocus = () => {
      if (hardLocked()) {
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
      window.clearInterval(pollDevtools);
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
  }, [applyCoverClass, enabled, rootRef, syncHardLock]);

  const hardLock = recordingLock || devtoolsLock;

  return {
    obscured: tempObscured || hardLock,
    recordingLock,
    devtoolsLock,
    hardLock,
    captureHint,
    watermark: mark,
    watermarkIp,
    captureApiAvailable,
  };
}
