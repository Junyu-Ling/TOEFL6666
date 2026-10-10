import { memo, useEffect, useRef } from "react";
import {
  buildBlindWatermarkPayload,
  embedBlindWatermark,
  paintFaintTextWatermark,
} from "../utils/blindWatermark";

/**
 * 肉眼不可见盲水印层：极淡斜向文字 + LSB 载荷。
 * 管理员可用检测工具放大 / 解码。
 */
function BlindWatermarkLayer({ userLabel = "", ip = "", className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return undefined;

    let alive = true;
    let raf = 0;

    const paint = () => {
      if (!alive) return;
      const parent = canvas.parentElement;
      const w = Math.max(parent?.clientWidth || 0, 1);
      const h = Math.max(parent?.clientHeight || 0, 1);
      // 固定 1x，保证截图像素与载荷网格一致；先对齐尺寸再绘，避免默认 300×150 黑底
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      ctx.clearRect(0, 0, w, h);

      const label = [userLabel, ip].filter(Boolean).join(" · ") || "TOEFL666";
      paintFaintTextWatermark(ctx, w, h, label);
      const imageData = ctx.getImageData(0, 0, w, h);
      const payload = buildBlindWatermarkPayload({
        user: userLabel,
        ip,
        ts: new Date().toISOString(),
      });
      embedBlindWatermark(imageData, payload);
      ctx.putImageData(imageData, 0, 0);
    };

    paint();
    const timer = window.setInterval(paint, 60_000);
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(paint);
    };
    window.addEventListener("resize", onResize);

    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, [userLabel, ip]);

  return (
    <canvas
      ref={canvasRef}
      className={`rfill__blind-wm ${className}`.trim()}
      width={1}
      height={1}
      aria-hidden
    />
  );
}

export default memo(BlindWatermarkLayer);
