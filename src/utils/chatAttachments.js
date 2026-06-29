export const MAX_CHAT_ATTACHMENTS = 3;
export const MAX_TEXT_FILE_BYTES = 100 * 1024;
export const MAX_IMAGE_DIMENSION = 1280;
export const ACCEPT_CHAT_ATTACHMENTS =
  "image/jpeg,image/png,image/gif,image/webp,.txt,.md,.csv,.json,text/plain,text/markdown";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export function attachmentDataUrl(attachment) {
  if (!attachment || attachment.kind !== "image") return "";
  return `data:${attachment.mimeType};base64,${attachment.data}`;
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsText(file);
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = dataUrl;
  });
}

async function compressImage(file) {
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法处理图片");
  ctx.drawImage(img, 0, 0, width, height);

  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const compressed = canvas.toDataURL(outputType, outputType === "image/jpeg" ? 0.85 : undefined);
  const base64 = compressed.split(",")[1] || "";
  if (!base64) throw new Error("图片压缩失败");
  return { mimeType: outputType, data: base64 };
}

export async function readChatAttachment(file) {
  if (!file) throw new Error("未选择文件");

  if (IMAGE_TYPES.has(file.type)) {
    const { mimeType, data } = await compressImage(file);
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      mimeType,
      kind: "image",
      data,
    };
  }

  const lower = file.name.toLowerCase();
  const isText =
    file.type.startsWith("text/") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".md") ||
    lower.endsWith(".csv") ||
    lower.endsWith(".json");

  if (!isText) {
    throw new Error("仅支持图片或文本文件（txt / md / csv / json）");
  }
  if (file.size > MAX_TEXT_FILE_BYTES) {
    throw new Error(`文本附件不能超过 ${Math.round(MAX_TEXT_FILE_BYTES / 1024)}KB`);
  }

  const text = (await readFileAsText(file)).trim();
  if (!text) throw new Error("文本文件为空");

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    mimeType: file.type || "text/plain",
    kind: "text",
    data: text.slice(0, MAX_TEXT_FILE_BYTES),
  };
}
