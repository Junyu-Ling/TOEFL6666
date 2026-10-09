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

/**
 * 截屏组合键：在按下 S 之前（Win/Ctrl+Shift）就识别，抢在系统截图前。
 * 不视为持续录屏。
 */
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
  const blurSuppressUntilRef = useRef(0);

  const applyCoverClass = useCallback(
    (on) => {
      const root = rootRef.current;
      if (!root) return;
      root.classList.toggle("rfill__body--obscured", on);
    },
    [rootRef]
  );

  /** 原生 confirm 等会抢焦点：临时忽略失焦遮盖，避免误判 */
  const suppressBlurCover = useCallback(
    (ms = 2500) => {
      blurSuppressUntilRef.current = Date.now() + ms;
      if (!recordingLockRef.current && !devtoolsLockRef.current) {
        const root = rootRef.current;
        root?.classList.remove("rfill__body--obscured");
        setTempObscured(false);
        setCaptureHint("");
      }
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
    let chordCover = false;

    const hardLocked = () => recordingLockRef.current || devtoolsLockRef.current;

    const showHint = (text, { sticky = false } = {}) => {
      setCaptureHint(text);
      window.clearTimeout(hintTimer);
      if (sticky) return;
      hintTimer = window.setTimeout(() => {
        if (!recordingLockRef.current && !devtoolsLockRef.current && !chordCover) {
          setCaptureHint("");
        }
      }, 2800);
    };

    /** 同步遮盖：先改 class 再 setState，避免比系统截屏慢一帧；必须带原因文案 */
    const coverNow = (reason, holdMs = 0) => {
      const hint = reason || "题目已临时遮盖";
      chordCover = true;
      root.classList.add("rfill__body--obscured");
      setTempObscured(true);
      showHint(hint, { sticky: true });
      window.clearTimeout(tempTimerRef.current);
      if (holdMs > 0) {
        tempTimerRef.current = window.setTimeout(() => {
          if (hardLocked()) return;
          if (document.visibilityState !== "visible" || !document.hasFocus()) return;
          chordCover = false;
          root.classList.remove("rfill__body--obscured");
          setTempObscured(false);
          showHint(hint);
        }, holdMs);
      }
    };

    const uncoverIfSafe = () => {
      if (hardLocked()) return;
      if (document.visibilityState !== "visible" || !document.hasFocus()) return;
      chordCover = false;
      window.clearTimeout(tempTimerRef.current);
      root.classList.remove("rfill__body--obscured");
      setTempObscured(false);
      window.clearTimeout(hintTimer);
      hintTimer = window.setTimeout(() => setCaptureHint(""), 1600);
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

    const lockDevtools = (reason) => {
      chordCover = false;
      window.clearTimeout(tempTimerRef.current);
      syncHardLock(
        recordingLockRef.current,
        true,
        reason || "因检测到开发者工具已打开，题目已锁定"
      );
    };

    const onKeyDown = (event) => {
      // 开发者工具优先：直接锁定，不先走截屏/失焦临时遮盖
      const isDevtoolsChord =
        event.key === "F12" ||
        ((event.ctrlKey || event.metaKey) &&
          event.shiftKey &&
          ["i", "j", "c"].includes(event.key.toLowerCase())) ||
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "u");

      if (isDevtoolsChord) {
        lockDevtools("因检测到开发者工具快捷键，题目已锁定");
        return;
      }

      if (isScreenshotChord(event)) {
        const isPrintScreen = event.key === "PrintScreen" || event.code === "PrintScreen";
        coverNow(
          isPrintScreen
            ? "因检测到截屏（PrintScreen），题目已临时遮盖"
            : "因检测到截屏快捷键（Win/Ctrl+Shift），题目已临时遮盖",
          isPrintScreen ? 700 : 0
        );
        if (isPrintScreen) clearClipboardSoon();
      }

      const mod = event.ctrlKey || event.metaKey;
      if (!mod) return;
      const key = event.key.toLowerCase();
      if (!["c", "x", "a", "p", "s"].includes(key)) return;
      // Win/Ctrl+Shift+S 交给截屏抢先遮盖，不拦成「另存」
      if (event.shiftKey && key === "s") return;

      const active = document.activeElement;
      if (isBlankInput(active) && (key === "c" || key === "x" || key === "a")) return;

      if (
        key === "p" ||
        (key === "s" && !event.shiftKey) ||
        touchesRoot(root, active) ||
        selectionTouchesRoot(root)
      ) {
        event.preventDefault();
        if (key === "c" || key === "x") showHint("题目内容禁止复制");
        if (key === "p" || (key === "s" && !event.shiftKey)) showHint("本题禁止打印 / 另存");
      }
    };

    const onKeyUp = (event) => {
      if (event.key === "PrintScreen" || event.code === "PrintScreen") clearClipboardSoon();
      // 组合键松开且仍在前台时揭开；截图工具抢焦点则继续遮着
      if (chordCover && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
        uncoverIfSafe();
      }
    };

    const applyCaptureSignal = (captured) => {
      if (captured === true) {
        syncHardLock(
          true,
          devtoolsLockRef.current,
          "因检测到系统录屏，题目已锁定。请关闭录屏后自动恢复。"
        );
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

    const syncDevtoolsState = () => {
      const open = detectDevtoolsOpen();
      if (open && !devtoolsLockRef.current) {
        lockDevtools("因检测到开发者工具已打开，题目已锁定");
        return true;
      }
      if (!open && devtoolsLockRef.current) {
        syncHardLock(recordingLockRef.current, false);
        if (!recordingLockRef.current) showHint("开发者工具已关闭，可以继续看题");
      }
      return open;
    };

    const pollDevtools = window.setInterval(syncDevtoolsState, 400);

    let blurTimer = 0;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (hardLocked()) return;
        if (detectDevtoolsOpen()) {
          lockDevtools("因检测到开发者工具已打开，题目已锁定");
          return;
        }
        coverNow("因页面切到后台/不可见，题目已临时遮盖（防截屏与录屏）");
        return;
      }
      if (hardLocked()) {
        applyCaptureSignal(readIsScreenCaptured());
        syncDevtoolsState();
        return;
      }
      uncoverIfSafe();
    };

    const blurSuppressed = () => Date.now() < blurSuppressUntilRef.current;

    const onBlur = () => {
      if (hardLocked()) return;
      if (blurSuppressed()) return;
      // 打开 DevTools 常先触发 blur：先判开发者工具，避免闪「失焦」文案
      if (detectDevtoolsOpen()) {
        lockDevtools("因检测到开发者工具已打开，题目已锁定");
        return;
      }
      window.clearTimeout(blurTimer);
      blurTimer = window.setTimeout(() => {
        if (hardLocked() || blurSuppressed()) return;
        if (detectDevtoolsOpen()) {
          lockDevtools("因检测到开发者工具已打开，题目已锁定");
          return;
        }
        if (!document.hasFocus()) {
          coverNow("因窗口失焦，题目已临时遮盖（防截屏与录屏）");
        }
      }, 80);
    };

    const onFocus = () => {
      window.clearTimeout(blurTimer);
      if (hardLocked()) {
        applyCaptureSignal(readIsScreenCaptured());
        syncDevtoolsState();
        return;
      }
      uncoverIfSafe();
    };

    const onResize = () => {
      syncDevtoolsState();
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
    window.addEventListener("resize", onResize);

    return () => {
      window.clearTimeout(hintTimer);
      window.clearTimeout(tempTimerRef.current);
      window.clearTimeout(blurTimer);
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
      window.removeEventListener("resize", onResize);
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
    suppressBlurCover,
  };
}
