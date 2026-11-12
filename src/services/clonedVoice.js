import { blobToBase64 } from "../utils/audioWav";
import { getClonedVoice } from "./clonedVoiceStore";

const speakCache = new Map();
let currentAudio = null;
let statusCache = null;

export async function fetchCloneStatus() {
  if (statusCache) return statusCache;
  const res = await fetch("/api/tts/status");
  const data = await res.json().catch(() => ({}));
  statusCache = {
    available: Boolean(data.available),
    voicestudio: Boolean(data.voicestudio),
    minimax: Boolean(data.minimax),
    gptsovits: Boolean(data.gptsovits),
  };
  return statusCache;
}

export async function cloneOwnVoiceSample(wavBlob, { name = "", promptText = "" } = {}) {
  const audioBase64 = await blobToBase64(wavBlob);
  const res = await fetch("/api/tts/clone", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioBase64, consent: true, name, promptText }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.voiceId) {
    throw new Error(data.error || `克隆失败 (${res.status})`);
  }
  return { voiceId: data.voiceId, engine: data.engine || "minimax" };
}

async function playBlobUrl(url) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.removeAttribute("src");
  }
  const audio = new Audio(url);
  audio.preload = "auto";
  currentAudio = audio;
  await audio.play();
}

function rememberUrl(key, url) {
  speakCache.set(key, url);
  if (speakCache.size > 80) {
    const first = speakCache.keys().next().value;
    const old = speakCache.get(first);
    speakCache.delete(first);
    if (old) URL.revokeObjectURL(old);
  }
}

export async function playClonedWord(word, voiceId) {
  const text = String(word || "").trim();
  const id = String(voiceId || "").trim();
  const key = `${id}:${text.toLowerCase()}`;
  const cached = speakCache.get(key);
  if (cached) {
    await playBlobUrl(cached);
    return;
  }

  const record = await getClonedVoice(id).catch(() => null);
  const status = await fetchCloneStatus().catch(() => ({
    voicestudio: false,
    gptsovits: false,
    minimax: false,
  }));
  const wav = record?.wav;
  const useSovits = Boolean(!status.voicestudio && status.gptsovits && wav);

  let res;
  if (useSovits) {
    const audioBase64 = await blobToBase64(wav);
    res = await fetch("/api/tts/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        word: text,
        voiceId: id,
        audioBase64,
        promptText: record?.promptText || "",
      }),
    });
  } else {
    const speakId = record?.minimaxVoiceId || id;
    const params = new URLSearchParams({ word: text, voiceId: speakId });
    res = await fetch(`/api/tts/speak?${params}`);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `朗读失败 (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  rememberUrl(key, url);
  await playBlobUrl(url);
}

export function stopClonedSpeech() {
  if (!currentAudio) return;
  currentAudio.pause();
  currentAudio.removeAttribute("src");
  currentAudio = null;
}
