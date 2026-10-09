const MAGIC = [0x54, 0x46, 0x36, 0x57, 0x4d, 0x31]; // TF6WM1

function crc8(bytes) {
  let crc = 0;
  for (const b of bytes) {
    crc ^= b;
    for (let i = 0; i < 8; i += 1) {
      crc = crc & 0x80 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
    }
  }
  return crc;
}

export function buildBlindWatermarkPayload({ user = "", ip = "", ts = "" } = {}) {
  const stamp = ts || new Date().toISOString();
  return `TOEFL666|${String(user).slice(0, 80)}|${String(ip).slice(0, 64)}|${stamp}`;
}

function payloadToBits(payload) {
  const text = new TextEncoder().encode(payload);
  const len = Math.min(text.length, 255);
  const body = new Uint8Array(MAGIC.length + 1 + len + 1);
  body.set(MAGIC, 0);
  body[MAGIC.length] = len;
  body.set(text.subarray(0, len), MAGIC.length + 1);
  body[body.length - 1] = crc8(body.subarray(0, body.length - 1));
  const bits = [];
  for (const byte of body) {
    for (let i = 7; i >= 0; i -= 1) bits.push((byte >> i) & 1);
  }
  return bits;
}

function bitsToPayload(bits) {
  if (bits.length < (MAGIC.length + 2) * 8) return null;
  const bytes = [];
  for (let i = 0; i + 7 < bits.length; i += 8) {
    let v = 0;
    for (let b = 0; b < 8; b += 1) v = (v << 1) | bits[i + b];
    bytes.push(v);
  }
  for (let i = 0; i < MAGIC.length; i += 1) {
    if (bytes[i] !== MAGIC[i]) return null;
  }
  const len = bytes[MAGIC.length];
  if (!Number.isFinite(len) || len < 1) return null;
  const start = MAGIC.length + 1;
  const end = start + len;
  if (bytes.length < end + 1) return null;
  const slice = bytes.slice(0, end + 1);
  if (slice[slice.length - 1] !== crc8(Uint8Array.from(slice.slice(0, -1)))) return null;
  try {
    return new TextDecoder().decode(Uint8Array.from(bytes.slice(start, end)));
  } catch {
    return null;
  }
}

/** 在已有 ImageData 上写入 LSB 盲水印（保留极淡文字像素） */
export function embedBlindWatermark(imageData, payload) {
  const { data, width, height } = imageData;
  const bits = payloadToBits(payload);
  let bitIndex = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const bit = bits[bitIndex % bits.length];
      bitIndex += 1;
      data[i] = (data[i] & 0xfe) | bit;
      if (data[i + 3] === 0) {
        data[i + 1] = data[i + 1] || 0x5a;
        data[i + 2] = data[i + 2] || 0x5a;
        data[i + 3] = 1; // 1/255，肉眼不可见
      }
    }
  }
  return imageData;
}

/** 在 canvas 上绘制极淡文字层（肉眼几乎不可见，对比度工具可放大） */
export function paintFaintTextWatermark(ctx, width, height, label) {
  if (!label) return;
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.translate(width / 2, height / 2);
  ctx.rotate((-28 * Math.PI) / 180);
  ctx.font = "500 14px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(15, 23, 42, 0.012)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const stepX = 240;
  const stepY = 110;
  const cols = Math.ceil(width / stepX) + 3;
  const rows = Math.ceil(height / stepY) + 3;
  for (let row = -rows; row <= rows; row += 1) {
    for (let col = -cols; col <= cols; col += 1) {
      const x = col * stepX + (row % 2 === 0 ? 0 : stepX / 2);
      const y = row * stepY;
      ctx.fillText(label, x, y);
    }
  }
  ctx.restore();
}

/** 把 LSB + 极淡像素放大成可视图层 */
export function amplifyBlindWatermarkImageData(imageData) {
  const { data, width, height } = imageData;
  const out = new ImageData(width, height);
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    const lsb = data[i] & 1;
    const faint = a > 0 && a < 20;
    if (faint || lsb) {
      out.data[i] = lsb ? 220 : 40;
      out.data[i + 1] = faint ? 200 : 40;
      out.data[i + 2] = 40;
      out.data[i + 3] = Math.min(255, Math.max(a * 48, lsb ? 200 : 0));
    } else {
      out.data[i] = 12;
      out.data[i + 1] = 12;
      out.data[i + 2] = 16;
      out.data[i + 3] = 255;
    }
  }
  return out;
}

/** 从 ImageData 尝试解码盲水印载荷 */
export function extractBlindWatermarkPayload(imageData) {
  const { data, width, height } = imageData;
  const bits = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      bits.push(data[i] & 1);
    }
  }
  // 尝试多个相位偏移（截图裁切可能导致错位）
  const maxShift = Math.min(64, bits.length);
  for (let shift = 0; shift < maxShift; shift += 1) {
    const rotated = bits.slice(shift).concat(bits.slice(0, shift));
    const payload = bitsToPayload(rotated);
    if (payload) return payload;
  }
  return null;
}

export async function analyzeWatermarkFromFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const payload = extractBlindWatermarkPayload(imageData);
    const amplified = amplifyBlindWatermarkImageData(imageData);
    ctx.putImageData(amplified, 0, 0);
    return {
      payload,
      previewUrl: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
