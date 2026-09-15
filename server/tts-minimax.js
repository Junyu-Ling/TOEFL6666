import { randomBytes } from "node:crypto";

const VOICE_ID_RE = /^toefl666v[a-z0-9]{8,32}$/;
const WORD_RE = /^[A-Za-z][A-Za-z\s'-]{0,79}$/;
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const MIN_AUDIO_BYTES = 8 * 1024;

function createError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function getApiKey() {
  return String(process.env.MINIMAX_API_KEY || "").trim();
}

export function isClonedVoiceConfigured() {
  return Boolean(getApiKey());
}

function apiBase() {
  return String(process.env.MINIMAX_API_BASE || "https://api.minimax.cn").replace(/\/$/, "");
}

function apiUrl(path) {
  const url = new URL(`${apiBase()}${path}`);
  const groupId = String(process.env.MINIMAX_GROUP_ID || "").trim();
  if (groupId) url.searchParams.set("GroupId", groupId);
  return url.toString();
}

function ttsModel() {
  return String(process.env.MINIMAX_TTS_MODEL || "speech-2.6-turbo").trim() || "speech-2.6-turbo";
}

function createVoiceId() {
  return `toefl666v${randomBytes(8).toString("hex")}`;
}

function looksLikeAudio(buffer) {
  if (!buffer || buffer.length < 12) return false;
  const ascii = buffer.subarray(0, 12).toString("latin1");
  if (ascii.startsWith("RIFF") && ascii.includes("WAVE")) return true;
  if (ascii.startsWith("ID3") || buffer[0] === 0xff) return true;
  if (ascii.includes("ftyp")) return true;
  return false;
}

function hexToBuffer(hex) {
  const clean = String(hex || "").trim();
  if (!clean || clean.length % 2 !== 0) return null;
  return Buffer.from(clean, "hex");
}

function decodeBase64Audio(audioBase64) {
  const raw = String(audioBase64 || "").replace(/^data:audio\/[^;]+;base64,/, "");
  if (!raw) throw createError("请上传或录制你自己的音频");
  let buffer;
  try {
    buffer = Buffer.from(raw, "base64");
  } catch {
    throw createError("音频格式无效");
  }
  if (buffer.length < MIN_AUDIO_BYTES || buffer.length > MAX_AUDIO_BYTES) {
    throw createError("音频太短或太大，请录 10–90 秒");
  }
  if (!looksLikeAudio(buffer)) {
    throw createError("请上传 wav / mp3 / m4a 音频");
  }
  return buffer;
}

async function minimaxJson(path, { method = "POST", body, form } = {}) {
  const headers = { Authorization: `Bearer ${getApiKey()}` };
  const init = { method, headers };
  if (form) {
    init.body = form;
  } else {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body || {});
  }
  const res = await fetch(apiUrl(path), init);
  const data = await res.json().catch(() => ({}));
  const status = data?.base_resp?.status_code;
  if (!res.ok || (typeof status === "number" && status !== 0)) {
    throw createError(data?.base_resp?.status_msg || data?.error || "克隆服务暂时不可用", res.status >= 400 ? res.status : 502);
  }
  return data;
}

export function assertVocabWord(word) {
  const text = String(word || "").trim();
  if (!WORD_RE.test(text)) {
    throw createError("克隆声音只能用来读单词");
  }
  return text;
}

export function assertAppVoiceId(voiceId) {
  const id = String(voiceId || "").trim();
  if (!VOICE_ID_RE.test(id)) {
    throw createError("朗读音色无效");
  }
  return id;
}

export async function cloneOwnVoice({ audioBase64, consent }) {
  if (!getApiKey()) {
    throw createError("服务器未配置克隆朗读", 503);
  }
  if (consent !== true) {
    throw createError("请确认这是你本人的声音，且仅用于本站读单词");
  }

  const wav = decodeBase64Audio(audioBase64);
  const form = new FormData();
  form.append("purpose", "voice_clone");
  form.append("file", new Blob([new Uint8Array(wav)], { type: "audio/wav" }), "own-voice.wav");

  const uploaded = await minimaxJson("/v1/files/upload", { form });
  const fileId = uploaded?.file?.file_id ?? uploaded?.file_id;
  if (fileId == null) {
    throw createError("上传音频失败", 502);
  }

  const voiceId = createVoiceId();
  await minimaxJson("/v1/voice_clone", {
    body: {
      file_id: fileId,
      voice_id: voiceId,
      need_noise_reduction: true,
    },
  });

  return { ready: true, voiceId };
}

export async function synthesizeVocabWord({ word, voiceId }) {
  if (!getApiKey()) {
    throw createError("服务器未配置克隆朗读", 503);
  }
  const text = assertVocabWord(word);
  const id = assertAppVoiceId(voiceId);

  const data = await minimaxJson("/v1/t2a_v2", {
    body: {
      model: ttsModel(),
      text,
      stream: false,
      voice_setting: {
        voice_id: id,
        speed: 0.95,
        vol: 1,
        pitch: 0,
      },
      audio_setting: {
        format: "mp3",
        sample_rate: 32000,
        channel: 1,
      },
      language_boost: "English",
    },
  });

  const hex = data?.data?.audio;
  const audio = hexToBuffer(hex);
  if (!audio?.length) {
    throw createError("朗读生成失败", 502);
  }
  return audio;
}
