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

function playTone(
  ctx,
  { freq, start, duration, volume = 0.18, type = "sine", slideTo = null, attack = 0.012 }
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), start + duration);
  }
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.04);
}

function playBuzz(ctx, { freq, start, duration, volume, slideTo }) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(freq, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), start + duration);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, start);
  filter.frequency.exponentialRampToValueAtTime(280, start + duration);
  filter.Q.value = 2.2;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function playCorrect(ctx) {
  const t = ctx.currentTime;
  playTone(ctx, { freq: 587.33, start: t, duration: 0.1, volume: 0.16 }); // D5
  playTone(ctx, { freq: 880, start: t + 0.09, duration: 0.16, volume: 0.2 }); // A5
  playTone(ctx, { freq: 1174.66, start: t + 0.17, duration: 0.22, volume: 0.14 }); // D6
}

function playIncorrect(ctx) {
  const t = ctx.currentTime;
  playTone(ctx, {
    freq: 92,
    start: t,
    duration: 0.14,
    volume: 0.34,
    type: "sine",
    slideTo: 62,
    attack: 0.004,
  });
  playBuzz(ctx, {
    freq: 210,
    start: t + 0.02,
    duration: 0.24,
    volume: 0.38,
    slideTo: 95,
  });
  playBuzz(ctx, {
    freq: 155,
    start: t + 0.16,
    duration: 0.36,
    volume: 0.34,
    slideTo: 72,
  });
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
