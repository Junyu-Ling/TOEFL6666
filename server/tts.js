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

function createError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export function isClonedVoiceConfigured() {
  return isMinimaxConfigured() || isGptSovitsConfigured();
}

export function clonedVoiceStatus() {
  return {
    available: isClonedVoiceConfigured(),
    minimax: isMinimaxConfigured(),
    gptsovits: isGptSovitsConfigured(),
  };
}

export async function cloneOwnVoice(body) {
  if (body?.consent !== true) {
    throw createError("请确认这是你本人的声音，且仅用于本站读单词");
  }
  if (isMinimaxConfigured()) {
    const result = await cloneMinimaxVoice(body);
    return { ...result, engine: "minimax" };
  }
  if (isGptSovitsConfigured()) {
    assertCloneAudio(body?.audioBase64);
    return { ready: true, voiceId: createGsvVoiceId(), engine: "gptsovits" };
  }
  throw createError("服务器未配置克隆朗读", 503);
}

export async function synthesizeVocabWord({ word, voiceId, audioBase64, promptText }) {
  if (audioBase64 && isGptSovitsConfigured()) {
    return synthesizeGptSovits({ word, audioBase64, promptText });
  }
  if (isMinimaxConfigured() && voiceId) {
    return synthesizeMinimaxWord({ word, voiceId: assertAppVoiceId(voiceId) });
  }
  if (isGptSovitsConfigured()) {
    throw createError("缺少参考音频，请重新选择克隆音色");
  }
  throw createError("服务器未配置克隆朗读", 503);
}

export { isMinimaxConfigured, isGptSovitsConfigured };
