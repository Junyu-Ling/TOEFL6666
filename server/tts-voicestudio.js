const WORD_RE = /^[A-Za-z][A-Za-z\s'-]{0,79}$/;
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const MIN_AUDIO_BYTES = 8 * 1024;

function createError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function rawBase() {
  return String(process.env.VOICESTUDIO_API_URL || "").trim().replace(/\/$/, "");
}

export function isVoiceStudioConfigured() {
  return Boolean(rawBase());
}

/** http://127.0.0.1:3900 */
export function voiceStudioOrigin() {
  const base = rawBase();
  if (!base) return "";
  return base.replace(/\/v1$/i, "");
}

/** http://127.0.0.1:3900/v1 */
export function voiceStudioV1() {
  const origin = voiceStudioOrigin();
  return origin ? `${origin}/v1` : "";
}

function apiKey() {
  return String(process.env.VOICESTUDIO_API_KEY || "local").trim() || "local";
}

function ttsModel() {
  return String(process.env.VOICESTUDIO_TTS_MODEL || "tts-1").trim() || "tts-1";
}

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${apiKey()}`, ...extra };
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

function assertVocabWord(word) {
  const text = String(word || "").trim();
  if (!WORD_RE.test(text)) {
    throw createError("克隆声音只能用来读单词");
  }
  return text;
}

function pickVoiceId(data) {
  return String(
    data?.voice_id ||
      data?.voiceId ||
      data?.id ||
      data?.profile_id ||
      data?.profileId ||
      data?.profile?.id ||
      data?.profile?.voice_id ||
      data?.voice?.voice_id ||
      data?.voice?.id ||
      ""
  ).trim();
}

async function readError(res) {
  const data = await res.json().catch(() => ({}));
  return data.error || data.message || data.detail || `VoiceStudio 请求失败 (${res.status})`;
}

/**
 * 在 VoiceStudio 里创建一个克隆音色，之后朗读只传 voice id。
 * 文档：https://github.com/debpalash/VoiceStudio
 */
export async function cloneVoiceStudioVoice({ audioBase64, name, promptText }) {
  const origin = voiceStudioOrigin();
  if (!origin) throw createError("未配置 VoiceStudio", 503);
  const wav = decodeBase64Audio(audioBase64);
  const label = String(name || "").trim().slice(0, 32) || "TOEFL voice";
  const form = new FormData();
  form.append("name", label);
  form.append("kind", "clone");
  form.append("language", "en");
  form.append("ref_text", String(promptText || "").slice(0, 500));
  form.append("ref_audio", new Blob([new Uint8Array(wav)], { type: "audio/wav" }), "voice.wav");

  let res = await fetch(`${origin}/profiles`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  if (res.status === 404) {
    res = await fetch(`${origin}/v1/profiles`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw createError(data.error || data.message || data.detail || "VoiceStudio 克隆失败", res.status >= 400 ? res.status : 502);
  }
  const voiceId = pickVoiceId(data);
  if (!voiceId) {
    throw createError("VoiceStudio 未返回音色 id", 502);
  }
  return { ready: true, voiceId, engine: "voicestudio", name: label };
}

export async function synthesizeVoiceStudioWord({ word, voiceId }) {
  const v1 = voiceStudioV1();
  if (!v1) throw createError("未配置 VoiceStudio", 503);
  const text = assertVocabWord(word);
  const voice = String(voiceId || "").trim();
  if (!voice) throw createError("缺少 VoiceStudio 音色");

  const res = await fetch(`${v1}/audio/speech`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      model: ttsModel(),
      voice,
      input: text,
      response_format: "mp3",
      language: "en",
    }),
  });

  const type = String(res.headers.get("content-type") || "");
  if (!res.ok) {
    throw createError(await readError(res), res.status >= 400 ? res.status : 502);
  }
  if (type.includes("json")) {
    throw createError(await readError(res), 502);
  }
  const audio = Buffer.from(await res.arrayBuffer());
  if (!audio.length) throw createError("VoiceStudio 未返回音频", 502);
  return audio;
}
