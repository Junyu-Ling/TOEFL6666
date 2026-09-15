import { blobToBase64 } from "../utils/audioWav";

const speakCache = new Map();
let currentAudio = null;

export async function fetchCloneStatus() {
  const res = await fetch("/api/tts/status");
  const data = await res.json().catch(() => ({}));
  return Boolean(data.available);
}

export async function cloneOwnVoiceSample(wavBlob) {
  const audioBase64 = await blobToBase64(wavBlob);
  const res = await fetch("/api/tts/clone", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioBase64, consent: true }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.voiceId) {
    throw new Error(data.error || `克隆失败 (${res.status})`);
  }
  return data.voiceId;
}

export async function playClonedWord(word, voiceId) {
  const key = `${voiceId}:${String(word || "").trim().toLowerCase()}`;
  let url = speakCache.get(key);
  if (!url) {
    const res = await fetch("/api/tts/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, voiceId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `朗读失败 (${res.status})`);
    }
    const blob = await res.blob();
    url = URL.createObjectURL(blob);
    speakCache.set(key, url);
    if (speakCache.size > 80) {
      const first = speakCache.keys().next().value;
      const old = speakCache.get(first);
      speakCache.delete(first);
      if (old) URL.revokeObjectURL(old);
    }
  }

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.removeAttribute("src");
  }
  const audio = new Audio(url);
  audio.preload = "auto";
  currentAudio = audio;
  await audio.play();
}

export function stopClonedSpeech() {
  if (!currentAudio) return;
  currentAudio.pause();
  currentAudio.removeAttribute("src");
  currentAudio = null;
}
