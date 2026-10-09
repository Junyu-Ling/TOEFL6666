/** 伪随机：同种子同画面，避免每帧闪烁 */
function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(label, w, h) {
  const s = `${label}|${w}x${h}`;
  let h32 = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h32 ^= s.charCodeAt(i);
    h32 = Math.imul(h32, 16777619);
  }
  return h32 >>> 0;
}

/** OCR 常误读的诱饵字形（人眼在极淡时几乎忽略） */
const DECOY_GLYPHS =
  "Il1O0rnclvw|/\\-_·•'`¨˜ˆˇ˘˙˚˛˜˝abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * 在 canvas 上绘制抗 OCR 干扰层：
 * 盐胡椒噪点 + 细密斜纹 + 极淡诱饵字。
 * 对人眼可读性影响较小，对截图 OCR / 多模态识字干扰较强。
 */
export function paintOcrShield(ctx, width, height, { label = "", dark = false } = {}) {
  if (!width || !height) return;
  const rand = mulberry32(hashSeed(label || "toefl666", width, height));
  ctx.clearRect(0, 0, width, height);

  const ink = dark ? [226, 232, 240] : [15, 23, 42];
  const paper = dark ? [15, 23, 42] : [255, 255, 255];

  // 1) 盐胡椒噪点：破坏字形边缘连通性
  const noiseCount = Math.floor((width * height) / 28);
  for (let i = 0; i < noiseCount; i += 1) {
    const x = (rand() * width) | 0;
    const y = (rand() * height) | 0;
    const a = 0.04 + rand() * 0.1;
    const bright = rand() > 0.55;
    const c = bright ? paper : ink;
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    ctx.fillRect(x, y, 1 + (rand() > 0.85 ? 1 : 0), 1 + (rand() > 0.9 ? 1 : 0));
  }

  // 2) 高频斜纹：干扰 OCR 投影分割
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((-18 * Math.PI) / 180);
  const span = Math.hypot(width, height);
  ctx.strokeStyle = dark ? "rgba(226,232,240,0.045)" : "rgba(15,23,42,0.055)";
  ctx.lineWidth = 1;
  for (let x = -span; x < span; x += 3) {
    ctx.beginPath();
    ctx.moveTo(x, -span);
    ctx.lineTo(x + (rand() - 0.5) * 1.2, span);
    ctx.stroke();
  }
  ctx.restore();

  // 3) 淡水平扫描线
  ctx.strokeStyle = dark ? "rgba(148,163,184,0.04)" : "rgba(100,116,139,0.05)";
  ctx.lineWidth = 1;
  for (let y = 0; y < height; y += 2) {
    if (rand() > 0.35) continue;
    ctx.beginPath();
    ctx.moveTo(0, y + rand());
    ctx.lineTo(width, y + rand());
    ctx.stroke();
  }

  // 4) 极淡诱饵微字：OCR 常把它们并进正文
  ctx.save();
  ctx.font = "500 11px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = dark ? "rgba(226,232,240,0.045)" : "rgba(15,23,42,0.05)";
  const decoyCount = Math.floor((width * height) / 4200);
  for (let i = 0; i < decoyCount; i += 1) {
    const x = rand() * width;
    const y = rand() * height;
    const len = 2 + ((rand() * 5) | 0);
    let chunk = "";
    for (let j = 0; j < len; j += 1) {
      chunk += DECOY_GLYPHS[(rand() * DECOY_GLYPHS.length) | 0];
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rand() - 0.5) * 0.7);
    ctx.fillText(chunk, 0, 0);
    ctx.restore();
  }
  // 带用户标记的诱饵行，污染 OCR 输出并便于追责
  if (label) {
    ctx.font = "600 10px ui-sans-serif, system-ui, sans-serif";
    ctx.fillStyle = dark ? "rgba(226,232,240,0.035)" : "rgba(15,23,42,0.04)";
    const stepY = 72;
    for (let y = 24; y < height; y += stepY) {
      ctx.fillText(`${label} · DO-NOT-OCR · ${label}`, (rand() * 40) | 0, y);
    }
  }
  ctx.restore();
}
