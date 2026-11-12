import {
  assertAppVoiceId,
  cloneOwnVoice as cloneMinimaxVoice,
  isClonedVoiceConfigured as isMinimaxConfigured,
  synthesizeVocabWord as synthesizeMinimaxWord,
} from "./tts-minimax.js";
import {
  assertCloneAudio,
  createGsvVoiceId,
  isGptSovitsConfigured,
  synthesizeGptSovits,
} from "./tts-gptsovits.js";
import {
  cloneVoiceStudioVoice,
  isVoiceStudioConfigured,
  synthesizeVoiceStudioWord,
} from "./tts-voicestudio.js";

function createError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export function isClonedVoiceConfigured() {
  return isVoiceStudioConfigured() || isMinimaxConfigured() || isGptSovitsConfigured();
}

export function clonedVoiceStatus() {
  return {
    available: isClonedVoiceConfigured(),
    voicestudio: isVoiceStudioConfigured(),
    minimax: isMinimaxConfigured(),
    gptsovits: isGptSovitsConfigured(),
  };
}

function useCloudCloneFirst() {
  return Boolean(process.env.VERCEL);
}

export async function cloneOwnVoice(body) {
  if (body?.consent !== true) {
    throw createError("请确认这是你本人的声音，且仅用于本站读单词");
  }
  const tryVoiceStudio = async () =>
    cloneVoiceStudioVoice({
      audioBase64: body?.audioBase64,
      name: body?.name,
      promptText: body?.promptText,
    });
  const tryMinimax = async () => {
    const result = await cloneMinimaxVoice(body);
    return { ...result, engine: "minimax" };
  };
  const trySovits = () => {
    assertCloneAudio(body?.audioBase64);
    return { ready: true, voiceId: createGsvVoiceId(), engine: "gptsovits" };
  };

  if (useCloudCloneFirst()) {
    if (isMinimaxConfigured()) return tryMinimax();
    if (isVoiceStudioConfigured()) return tryVoiceStudio();
    if (isGptSovitsConfigured()) return trySovits();
  } else {
    if (isVoiceStudioConfigured()) return tryVoiceStudio();
    if (isMinimaxConfigured()) return tryMinimax();
    if (isGptSovitsConfigured()) return trySovits();
  }
  throw createError("服务器未配置克隆朗读", 503);
}

export async function synthesizeVocabWord({ word, voiceId, audioBase64, promptText }) {
  if (audioBase64 && isGptSovitsConfigured() && !useCloudCloneFirst()) {
    return synthesizeGptSovits({ word, audioBase64, promptText });
  }
  if (useCloudCloneFirst()) {
    if (isMinimaxConfigured() && voiceId) {
      return synthesizeMinimaxWord({ word, voiceId: assertAppVoiceId(voiceId) });
    }
    if (isVoiceStudioConfigured() && voiceId) {
      return synthesizeVoiceStudioWord({ word, voiceId });
    }
  } else {
    if (isVoiceStudioConfigured() && voiceId) {
      return synthesizeVoiceStudioWord({ word, voiceId });
    }
    if (isMinimaxConfigured() && voiceId) {
      return synthesizeMinimaxWord({ word, voiceId: assertAppVoiceId(voiceId) });
    }
  }
  if (audioBase64 && isGptSovitsConfigured()) {
    return synthesizeGptSovits({ word, audioBase64, promptText });
  }
  if (isGptSovitsConfigured()) {
    throw createError("缺少参考音频，请重新选择克隆音色");
  }
  throw createError("服务器未配置克隆朗读", 503);
}

export { isMinimaxConfigured, isGptSovitsConfigured, isVoiceStudioConfigured };
