const TEXT_EXTENSIONS = new Set([".txt", ".md", ".csv", ".json", ".log"]);
const OCR_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".pdf"]);
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const TEXT_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);

const OCR_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "application/pdf",
]);

function getExtension(name) {
  const idx = String(name || "").lastIndexOf(".");
  return idx >= 0 ? String(name).slice(idx).toLowerCase() : "";
}

function guessMimeType(file) {
  if (file.type) return file.type;
  const ext = getExtension(file.name);
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".bmp") return "image/bmp";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".csv") return "text/csv";
  if (ext === ".json") return "application/json";
  if (ext === ".md") return "text/markdown";
  return "text/plain";
}

export function isSupportedTextUpload(file) {
  if (!file) return false;
  const mime = guessMimeType(file);
  const ext = getExtension(file.name);
  return TEXT_MIME_TYPES.has(mime) || TEXT_EXTENSIONS.has(ext) || OCR_MIME_TYPES.has(mime) || OCR_EXTENSIONS.has(ext);
}

export function getSupportedUploadHint() {
  return "支持 txt / md / csv / json、含文字的图片/PDF，或在输入框 Ctrl+V 粘贴图片（最大 5MB）";
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsText(file);
  });
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      const base64 = value.includes(",") ? value.split(",")[1] : value;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsDataURL(file);
  });
}

export async function extractTextFromUpload(file) {
  if (!file) {
    throw new Error("未选择文件");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("文件过大，请上传 5MB 以内的文件");
  }
  if (!isSupportedTextUpload(file)) {
    throw new Error(getSupportedUploadHint());
  }

  const mimeType = guessMimeType(file);
  const ext = getExtension(file.name);

  if (TEXT_MIME_TYPES.has(mimeType) || TEXT_EXTENSIONS.has(ext)) {
    const text = (await readFileAsText(file)).trim();
    if (!text) {
      throw new Error("文件中没有文字内容");
    }
    return { text, fileName: file.name, source: "text" };
  }

  const base64 = await readFileAsBase64(file);
  const res = await fetch("/api/ocr/extract-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      base64,
      mimeType,
      fileName: file.name,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `文字识别失败 (${res.status})`);
  }

  return {
    text: String(data.text || "").trim(),
    fileName: data.fileName || file.name,
    source: data.source || "ocr",
  };
}
