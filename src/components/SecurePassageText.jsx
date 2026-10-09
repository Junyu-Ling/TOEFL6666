import { memo, useEffect, useRef } from "react";

/**
 * 将纯文本段落画到 canvas 上，DOM 中无文本节点，降低复制/爬虫直接抓取概率。
 * 填空仍用外部 BlankInput。
 */
function SecurePassageText({ text, className = "" }) {
  const canvasRef = useRef(null);
  const value = String(text || "");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const style = getComputedStyle(canvas);
    const fontSize = style.fontSize || "17px";
    const fontFamily = style.fontFamily || "Georgia, serif";
    const color = style.color || "#334155";
    const lineHeight = Math.ceil(parseFloat(style.lineHeight) || parseFloat(fontSize) * 2.15);

    const measure = () => {
      const parent = canvas.parentElement;
      const maxWidth = Math.max((parent?.clientWidth || canvas.clientWidth || 320) - 4, 120);
      ctx.font = `${fontSize} ${fontFamily}`;
      const words = value.split(/(\s+)/);
      const lines = [];
      let current = "";
      for (const word of words) {
        const trial = current + word;
        if (ctx.measureText(trial).width > maxWidth && current) {
          lines.push(current);
          current = word.trimStart();
        } else {
          current = trial;
        }
      }
      if (current) lines.push(current);
      if (!lines.length) lines.push("");

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.ceil(maxWidth);
      const height = Math.max(lineHeight, lines.length * lineHeight);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.font = `${fontSize} ${fontFamily}`;
      ctx.fillStyle = color;
      ctx.textBaseline = "middle";
      lines.forEach((line, i) => {
        ctx.fillText(line, 0, i * lineHeight + lineHeight / 2);
      });
    };

    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && canvas.parentElement) ro.observe(canvas.parentElement);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [value]);

  return (
    <canvas
      ref={canvasRef}
      className={`rfill__text-canvas ${className}`.trim()}
      aria-hidden
      data-secure-text="1"
    />
  );
}

export default memo(SecurePassageText);
