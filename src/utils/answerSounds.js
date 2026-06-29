let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

function playTone(ctx, { freq, start, duration, volume = 0.18, type = "sine", slideTo = null }) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), start + duration);
  }
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.04);
}

function playCorrect(ctx) {
  const t = ctx.currentTime;
  playTone(ctx, { freq: 587.33, start: t, duration: 0.1, volume: 0.16 }); // D5
  playTone(ctx, { freq: 880, start: t + 0.09, duration: 0.16, volume: 0.2 }); // A5
  playTone(ctx, { freq: 1174.66, start: t + 0.17, duration: 0.22, volume: 0.14 }); // D6
}

function playIncorrect(ctx) {
  const t = ctx.currentTime;
  playTone(ctx, { freq: 220, start: t, duration: 0.22, volume: 0.14, type: "triangle", slideTo: 140 });
  playTone(ctx, { freq: 165, start: t + 0.1, duration: 0.28, volume: 0.12, type: "sawtooth", slideTo: 90 });
}

export function playAnswerSound(isCorrect) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (isCorrect) playCorrect(ctx);
    else playIncorrect(ctx);
  } catch {
    // ignore autoplay / audio errors
  }
}
