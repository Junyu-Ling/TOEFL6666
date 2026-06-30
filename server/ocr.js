const OCR_API_URL = "https://api.ocr.space/parse/image";
const MAX_BASE64_BYTES = 5 * 1024 * 1024;

const OCR_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "application/pdf",
]);

export function isOcrMimeType(mimeType) {
  return OCR_MIME_TYPES.has(String(mimeType || "").toLowerCase());
}

function estimateBase64Bytes(base64) {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export async function extractTextWithOcr({ base64, mimeType, fileName }, config = {}) {
  const apiKey = config.apiKey || process.env.OCR_API_KEY;
  if (!apiKey) {
    const err = new Error("OCR 服务未配置，请在环境变量中设置 OCR_API_KEY");
    err.status = 503;
    throw err;
  }

  const cleanBase64 = String(base64 || "").replace(/^data:[^;]+;base64,/, "").trim();
  if (!cleanBase64) {
    const err = new Error("文件内容为空");
    err.status = 400;
    throw err;
  }

  if (estimateBase64Bytes(cleanBase64) > MAX_BASE64_BYTES) {
    const err = new Error("文件过大，请上传 5MB 以内的图片或 PDF");
    err.status = 413;
    throw err;
  }

  const mime = String(mimeType || "application/octet-stream").toLowerCase();
  if (!isOcrMimeType(mime)) {
    const err = new Error("仅支持含文字的图片或 PDF");
    err.status = 400;
    throw err;
  }

  const form = new FormData();
  form.append("apikey", apiKey);
  form.append("base64Image", `data:${mime};base64,${cleanBase64}`);
  form.append("language", "eng");
  form.append("isOverlayRequired", "false");
  form.append("detectOrientation", "true");
  form.append("scale", "true");
  form.append("OCREngine", "2");
  if (fileName) form.append("filetype", mime.includes("pdf") ? "PDF" : "Auto");

  const res = await fetch(OCR_API_URL, { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.ErrorMessage?.[0] || data.ErrorDetails || `OCR 请求失败 (${res.status})`);
    err.status = res.status >= 400 ? res.status : 502;
    throw err;
  }

  if (data.IsErroredOnProcessing) {
    const err = new Error(
      data.ErrorMessage?.[0] || data.ErrorDetails || data.ParsedResults?.[0]?.ErrorMessage || "OCR 识别失败"
    );
    err.status = 422;
    throw err;
  }

  const text = (data.ParsedResults || [])
    .map((item) => String(item.ParsedText || "").trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();

  if (!text) {
    const err = new Error("未识别到文字，请上传文字清晰、对比度高的图片或 PDF");
    err.status = 422;
    throw err;
  }

  return { text, fileName: fileName || null, source: "ocr" };
}
