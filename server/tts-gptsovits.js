import { randomBytes } from "node:crypto";

const WORD_RE = /^[A-Za-z][A-Za-z\s'-]{0,79}$/;
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const MIN_AUDIO_BYTES = 8 * 1024;

function createError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export function gptSovitsApiUrl() {
  return String(process.env.GPT_SOVITS_API_URL || "").trim().replace(/\/$/, "");
}

export function isGptSovitsConfigured() {
  return Boolean(gptSovitsApiUrl());
}

export function createGsvVoiceId() {
  return `gsv${randomBytes(8).toString("hex")}`;
}

export function assertCloneAudio(audioBase64) {
  return decodeBase64Audio(audioBase64);
}

function decodeBase64Audio(audioBase64) {
  const raw = String(audioBase64 || "").replace(/^data:audio\/[^;]+;base64,/, "");
  if (!raw) throw createError("请上传或录制要克隆的音频");
  let buffer;
  try {
    buffer = Buffer.from(raw, "base64");
  } catch {
    throw createError("音频格式无效");
  }
  if (buffer.length < MIN_AUDIO_BYTES || buffer.length > MAX_AUDIO_BYTES) {
    throw createError("音频太短或太大，请用 3–90 秒的片段");
  }
  return buffer;
}

export function assertVocabWord(word) {
  const text = String(word || "").trim();
  if (!WORD_RE.test(text)) {
    throw createError("克隆声音只能用来读单词");
  }
  return text;
}

/**
 * 调用 GPU 机器上的桥接服务（scripts/gptsovits-bridge.mjs）。
 * 官方 api_v2 只接受本机文件路径，所以不能从 Vercel 直连 9880。
 */
export async function synthesizeGptSovits({ word, audioBase64, promptText }) {
  const base = gptSovitsApiUrl();
  if (!base) throw createError("未配置 GPT-SoVITS 服务", 503);
  const text = assertVocabWord(word);
  decodeBase64Audio(audioBase64);

  const res = await fetch(`${base}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      word: text,
      text,
      audioBase64,
      promptText: String(promptText || "").slice(0, 500),
      prompt_text: String(promptText || "").slice(0, 500),
      text_lang: "en",
      prompt_lang: "en",
    }),
  });

  const contentType = String(res.headers.get("content-type") || "");
  if (!res.ok) {
    const data = contentType.includes("json") ? await res.json().catch(() => ({})) : {};
    throw createError(data.error || data.message || "GPT-SoVITS 朗读失败", res.status >= 400 ? res.status : 502);
  }
  if (contentType.includes("json")) {
    const data = await res.json().catch(() => ({}));
    throw createError(data.error || data.message || "GPT-SoVITS 未返回音频", 502);
  }
  const audio = Buffer.from(await res.arrayBuffer());
  if (!audio.length) throw createError("GPT-SoVITS 未返回音频", 502);
  return audio;
}
