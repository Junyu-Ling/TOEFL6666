import { memo, useEffect, useRef } from "react";
import { paintOcrShield } from "../utils/ocrShield";

/**
 * 叠在题目上的抗 OCR 层（pointer-events: none，不挡填空）。
 * 截图时噪点/斜纹/诱饵字会混进画面，降低 AI OCR 可用率。
 */
function OcrShieldLayer({ userLabel = "", className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return undefined;

    let alive = true;
    let raf = 0;

    const isDark = () =>
      document.documentElement.getAttribute("data-theme") === "dark" ||
      document.documentElement.classList.contains("dark");

    const paint = () => {
      if (!alive) return;
      const parent = canvas.parentElement;
      const w = Math.max(parent?.clientWidth || 0, 320);
      const h = Math.max(parent?.clientHeight || 0, 240);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      paintOcrShield(ctx, w, h, { label: userLabel, dark: isDark() });
    };

    paint();
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(paint);
    };
    window.addEventListener("resize", onResize);
    const themeObserver = new MutationObserver(paint);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });

    return () => {
      alive = false;
      window.removeEventListener("resize", onResize);
      themeObserver.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [userLabel]);

  return (
    <canvas
      ref={canvasRef}
      className={`rfill__ocr-shield ${className}`.trim()}
      aria-hidden
    />
  );
}

export default memo(OcrShieldLayer);
