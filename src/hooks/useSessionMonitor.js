import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import {
  fetchMonitorWatchStatus,
  postMonitorFrame,
  postMonitorHeartbeat,
} from "../services/access";

async function captureAppFrame() {
  const root =
    document.querySelector(".app-shell") ||
    document.querySelector(".app") ||
    document.body;
  if (!root) return null;

  const canvas = await html2canvas(root, {
    useCORS: true,
    allowTaint: true,
    logging: false,
    scale: Math.min(1, 960 / Math.max(root.scrollWidth || 1, 1)),
    backgroundColor: "#ffffff",
    windowWidth: root.scrollWidth,
    windowHeight: Math.min(root.scrollHeight, 1600),
  });

  let quality = 0.45;
  let image = canvas.toDataURL("image/jpeg", quality);
  while (image.length > 200_000 && quality > 0.2) {
    quality -= 0.08;
    image = canvas.toDataURL("image/jpeg", quality);
  }
  if (image.length > 220_000) return null;
  return { image, width: canvas.width, height: canvas.height };
}

/**
 * 登录用户在线心跳 + 被管理员观看时上传应用内截帧。
 */
export function useSessionMonitor({ enabled = false, activeTab = "" } = {}) {
  const [watching, setWatching] = useState(false);
  const capturingRef = useRef(false);
  const tabRef = useRef(activeTab);
  tabRef.current = activeTab;

  useEffect(() => {
    if (!enabled) {
      setWatching(false);
      return undefined;
    }

    let cancelled = false;
    let heartbeatTimer = 0;
    let statusTimer = 0;

    const sendHeartbeat = async () => {
      try {
        await postMonitorHeartbeat({
          tab: tabRef.current || "",
          title: document.title || "",
        });
      } catch {
        // ignore offline/auth blips
      }
    };

    const pollStatus = async () => {
      try {
        const data = await fetchMonitorWatchStatus();
        if (!cancelled) setWatching(Boolean(data.watching));
      } catch {
        if (!cancelled) setWatching(false);
      }
    };

    const pushFrame = async () => {
      if (capturingRef.current || cancelled) return;
      capturingRef.current = true;
      try {
        const frame = await captureAppFrame();
        if (!frame || cancelled) return;
        await postMonitorFrame(frame);
      } catch {
        // watch may have ended
      } finally {
        capturingRef.current = false;
      }
    };

    sendHeartbeat();
    pollStatus();
    heartbeatTimer = window.setInterval(sendHeartbeat, 10_000);
    statusTimer = window.setInterval(pollStatus, 3_000);

    return () => {
      cancelled = true;
      window.clearInterval(heartbeatTimer);
      window.clearInterval(statusTimer);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !watching) return undefined;
    let cancelled = false;

    const tick = async () => {
      if (cancelled || capturingRef.current) return;
      capturingRef.current = true;
      try {
        const frame = await captureAppFrame();
        if (frame && !cancelled) await postMonitorFrame(frame);
      } catch {
        // ignore
      } finally {
        capturingRef.current = false;
      }
    };

    tick();
    const frameTimer = window.setInterval(tick, 2_000);
    return () => {
      cancelled = true;
      window.clearInterval(frameTimer);
    };
  }, [enabled, watching]);

  return { watching };
}
