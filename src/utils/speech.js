let voicesCache = [];

export function getSystemVoices() {
  if (!("speechSynthesis" in window)) return [];
  voicesCache = window.speechSynthesis.getVoices();
  return voicesCache.filter((v) => v.lang.startsWith("en"));
}

function pickVoice(voiceURI) {
  const voices = getSystemVoices();
  if (voiceURI) {
    const found = voices.find((v) => v.voiceURI === voiceURI);
    if (found) return found;
  }
  return (
    voices.find((v) => v.lang === "en-US" && /google|microsoft|natural|premium/i.test(v.name)) ||
    voices.find((v) => v.lang.startsWith("en-US")) ||
    voices[0]
  );
}

export function speakWord(word, settings) {
  if (!word || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  utterance.rate = 0.92;
  const voice = pickVoice(settings?.systemVoiceURI);
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}
