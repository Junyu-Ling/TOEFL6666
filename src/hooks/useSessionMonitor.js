import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import {
  fetchMonitorWatchStatus,
  postMonitorFrame,
  postMonitorHeartbeat,
} from "../services/access";

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(label || "timeout")), ms);
    }),
  ]);
}

function fallbackFrame() {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 405;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0f172a";
  ctx.font = "600 18px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("TOEFL666 页面共享", 28, 48);
  ctx.font = "14px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "#334155";
  ctx.fillText(document.title || "未命名页面", 28, 84);
  ctx.fillText(String(location.pathname || "/"), 28, 112);
  ctx.fillText(new Date().toLocaleString(), 28, 140);
  return {
    image: canvas.toDataURL("image/jpeg", 0.72),
    width: canvas.width,
    height: canvas.height,
  };
}

async function captureAppFrame() {
  const root =
    document.querySelector(".app-shell") ||
    document.querySelector(".app") ||
    document.body;
  if (!root) return fallbackFrame();

  try {
    const width = Math.min(Math.max(root.clientWidth || 800, 480), 1100);
    const height = Math.min(Math.max(root.clientHeight || 600, 360), 900);
    const canvas = await withTimeout(
      html2canvas(root, {
        useCORS: true,
        allowTaint: false,
        logging: false,
        scale: 0.45,
        backgroundColor: "#ffffff",
        width,
        height,
        windowWidth: width,
        windowHeight: height,
        imageTimeout: 1500,
        ignoreElements: (el) => {
          if (!(el instanceof Element)) return false;
          if (el.classList?.contains("rfill__blind-wm")) return true;
          if (el.classList?.contains("session-monitor-badge")) return true;
          if (el.tagName === "CANVAS" && el !== root) return true;
          if (el.tagName === "IMG") {
            const src = el.getAttribute("src") || "";
            if (src && !src.startsWith("data:") && !src.startsWith(window.location.origin)) {
              return true;
            }
          }
          return false;
        },
      }),
      4500,
      "html2canvas-timeout"
    );

    let quality = 0.5;
    let image = canvas.toDataURL("image/jpeg", quality);
    while (image.length > 160_000 && quality > 0.22) {
      quality -= 0.08;
      image = canvas.toDataURL("image/jpeg", quality);
    }
    if (image.length > 210_000) return fallbackFrame();
    return { image, width: canvas.width, height: canvas.height };
  } catch {
    return fallbackFrame();
  }
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
        // ignore
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

    sendHeartbeat();
    pollStatus();
    heartbeatTimer = window.setInterval(sendHeartbeat, 8_000);
    statusTimer = window.setInterval(pollStatus, 1_500);

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
        if (!cancelled && frame?.image) {
          await postMonitorFrame(frame);
        }
      } catch {
        // ignore upload blips
      } finally {
        capturingRef.current = false;
      }
    };

    tick();
    const frameTimer = window.setInterval(tick, 2_500);
    return () => {
      cancelled = true;
      window.clearInterval(frameTimer);
    };
  }, [enabled, watching]);

  return { watching };
}
