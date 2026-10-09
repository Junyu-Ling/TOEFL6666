import { memo, useEffect, useRef } from "react";

/**
 * 全屏动态盲水印：用户标识 + IP + 时间戳，半透明铺满，截图可追溯。
 */
function BlindWatermark({ userLabel = "", ip = "", className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let raf = 0;
    let alive = true;

    const paint = () => {
      if (!alive) return;
      const parent = canvas.parentElement;
      const w = Math.max(parent?.clientWidth || 0, 320);
      const h = Math.max(parent?.clientHeight || 0, 240);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const stamp = new Date().toISOString().replace("T", " ").slice(0, 19);
      const line = [userLabel, ip, stamp].filter(Boolean).join(" · ");
      if (!line) return;

      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate((-22 * Math.PI) / 180);
      ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
      ctx.fillStyle = "rgba(15, 23, 42, 0.055)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const stepX = 220;
      const stepY = 96;
      const cols = Math.ceil(w / stepX) + 3;
      const rows = Math.ceil(h / stepY) + 3;
      for (let row = -rows; row <= rows; row += 1) {
        for (let col = -cols; col <= cols; col += 1) {
          const x = col * stepX + (row % 2 === 0 ? 0 : stepX / 2);
          const y = row * stepY;
          ctx.fillText(line, x, y);
        }
      }
      ctx.restore();
    };

    paint();
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(paint);
    };
    const timer = window.setInterval(paint, 15000);
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
      aria-hidden
    />
  );
}

export default memo(BlindWatermark);
