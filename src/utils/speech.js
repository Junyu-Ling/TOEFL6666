let voicesCache = [];

const LOW_QUALITY_VOICE_PATTERN = /compact|eloquence|super-compact|legacy|bad\s+news|bubbles|cellos|deranged|good\s+news|jester|organ|superstar|trinoids|whisper|zarvox/i;
const PREMIUM_VOICE_PATTERN = /google|microsoft|natural|premium|enhanced|neural/i;
const MAC_PREFERRED_VOICE_PATTERN = /samantha|alex|allison|ava|fred|victoria|daniel|karen|moira|tessa|tom|nicky|aaron|nathan|susan|zoe/i;

export function getSystemVoices() {
  if (!("speechSynthesis" in window)) return [];
  voicesCache = window.speechSynthesis.getVoices();
  return voicesCache.filter((v) => v.lang.startsWith("en"));
}

function isLowQualityVoice(voice) {
  return LOW_QUALITY_VOICE_PATTERN.test(voice.name);
}

function scoreVoice(voice) {
  let score = 0;
  if (voice.lang === "en-US") score += 10;
  else if (voice.lang.startsWith("en")) score += 6;
  if (PREMIUM_VOICE_PATTERN.test(voice.name)) score += 24;
  if (MAC_PREFERRED_VOICE_PATTERN.test(voice.name)) score += 18;
  if (isLowQualityVoice(voice)) score -= 60;
  if (voice.default) score += 4;
  if (voice.localService) score += 2;
  return score;
}

function pickVoice(voiceURI) {
  const voices = getSystemVoices();
  if (!voices.length) return null;

  if (voiceURI) {
    const found = voices.find((v) => v.voiceURI === voiceURI);
    if (found) return found;
  }

  const ranked = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  const best = ranked.find((v) => !isLowQualityVoice(v));
  return best || ranked[0] || voices[0];
}

function speakNow(word, settings) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  const voice = pickVoice(settings?.systemVoiceURI);
  utterance.lang = voice?.lang || "en-US";
  utterance.rate = 0.92;
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

function whenVoicesReady(callback) {
  if (getSystemVoices().length) {
    callback();
    return;
  }

  const synth = window.speechSynthesis;
  let done = false;

  const finish = () => {
    if (done) return;
    done = true;
    synth.onvoiceschanged = null;
    callback();
  };

  synth.onvoiceschanged = finish;
  synth.getVoices();
  setTimeout(finish, 300);
}

export function speakWord(word, settings) {
  if (!word || !("speechSynthesis" in window)) return;
  whenVoicesReady(() => speakNow(word, settings));
}
