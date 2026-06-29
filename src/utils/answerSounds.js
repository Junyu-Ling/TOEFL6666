export const CORRECT_SOUND_OPTIONS = [
  { id: "default", label: "默认 · 三连叮" },
  { id: "coin", label: "清脆 · 金币" },
  { id: "bright", label: "明亮 · 单音" },
  { id: "chime", label: "柔和 · 双铃" },
  { id: "level", label: "上扬 · 过关" },
];

export const WRONG_SOUND_OPTIONS = [
  { id: "default", label: "默认 · 低沉嗡声" },
  { id: "beep", label: "哔哔 · 游戏提示" },
  { id: "buzzer", label: "刺耳 · 蜂鸣" },
  { id: "down", label: "下滑 · 失落" },
  { id: "blip", label: "复古 · 双哔" },
];

const CORRECT_IDS = new Set(CORRECT_SOUND_OPTIONS.map((o) => o.id));
const WRONG_IDS = new Set(WRONG_SOUND_OPTIONS.map((o) => o.id));

export function normalizeCorrectSoundId(id) {
  return CORRECT_IDS.has(id) ? id : "default";
}

export function normalizeWrongSoundId(id) {
  return WRONG_IDS.has(id) ? id : "default";
}

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

function playBeep(ctx, { freq, start, duration = 0.07, volume = 0.28 }) {
  playTone(ctx, {
    freq,
    start,
    duration,
    volume,
    type: "square",
    attack: 0.002,
  });
}

const CORRECT_PLAYERS = {
  default(ctx) {
    const t = ctx.currentTime;
    playTone(ctx, { freq: 587.33, start: t, duration: 0.1, volume: 0.16 });
    playTone(ctx, { freq: 880, start: t + 0.09, duration: 0.16, volume: 0.2 });
    playTone(ctx, { freq: 1174.66, start: t + 0.17, duration: 0.22, volume: 0.14 });
  },
  coin(ctx) {
    const t = ctx.currentTime;
    playTone(ctx, { freq: 988, start: t, duration: 0.05, volume: 0.22, type: "square", attack: 0.002 });
    playTone(ctx, { freq: 1318, start: t + 0.05, duration: 0.14, volume: 0.2 });
  },
  bright(ctx) {
    const t = ctx.currentTime;
    playTone(ctx, { freq: 1046, start: t, duration: 0.18, volume: 0.24, attack: 0.004 });
  },
  chime(ctx) {
    const t = ctx.currentTime;
    playTone(ctx, { freq: 659, start: t, duration: 0.2, volume: 0.16, type: "triangle" });
    playTone(ctx, { freq: 880, start: t + 0.12, duration: 0.28, volume: 0.14, type: "triangle" });
  },
  level(ctx) {
    const t = ctx.currentTime;
    playTone(ctx, { freq: 523, start: t, duration: 0.08, volume: 0.18 });
    playTone(ctx, { freq: 659, start: t + 0.07, duration: 0.08, volume: 0.19 });
    playTone(ctx, { freq: 784, start: t + 0.14, duration: 0.08, volume: 0.2 });
    playTone(ctx, { freq: 1046, start: t + 0.21, duration: 0.2, volume: 0.22 });
  },
};

const WRONG_PLAYERS = {
  default(ctx) {
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
    playBuzz(ctx, { freq: 210, start: t + 0.02, duration: 0.24, volume: 0.38, slideTo: 95 });
    playBuzz(ctx, { freq: 155, start: t + 0.16, duration: 0.36, volume: 0.34, slideTo: 72 });
  },
  beep(ctx) {
    const t = ctx.currentTime;
    playBeep(ctx, { freq: 880, start: t, duration: 0.065, volume: 0.32 });
    playBeep(ctx, { freq: 620, start: t + 0.11, duration: 0.085, volume: 0.34 });
    playBeep(ctx, { freq: 520, start: t + 0.24, duration: 0.1, volume: 0.3 });
  },
  buzzer(ctx) {
    const t = ctx.currentTime;
    for (let i = 0; i < 8; i++) {
      playTone(ctx, {
        freq: i % 2 === 0 ? 280 : 240,
        start: t + i * 0.06,
        duration: 0.055,
        volume: 0.26,
        type: "sawtooth",
        attack: 0.002,
      });
    }
  },
  down(ctx) {
    const t = ctx.currentTime;
    playTone(ctx, { freq: 330, start: t, duration: 0.2, volume: 0.26, slideTo: 180 });
    playTone(ctx, { freq: 220, start: t + 0.14, duration: 0.28, volume: 0.24, slideTo: 110 });
  },
  blip(ctx) {
    const t = ctx.currentTime;
    playBeep(ctx, { freq: 760, start: t, duration: 0.05, volume: 0.3 });
    playBeep(ctx, { freq: 760, start: t + 0.09, duration: 0.05, volume: 0.3 });
    playBeep(ctx, { freq: 420, start: t + 0.2, duration: 0.12, volume: 0.28 });
  },
};

export function playAnswerSound(
  isCorrect,
  { correctId = "default", wrongId = "default" } = {}
) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const idCorrect = normalizeCorrectSoundId(correctId);
  const idWrong = normalizeWrongSoundId(wrongId);
  const soundId = isCorrect ? idCorrect : idWrong;
  const player = isCorrect ? CORRECT_PLAYERS[soundId] : WRONG_PLAYERS[soundId];
  if (!player) return;
  try {
    player(ctx);
  } catch {
    // ignore autoplay / audio errors
  }
}

export function previewAnswerSound(isCorrect, soundId) {
  playAnswerSound(isCorrect, {
    correctId: normalizeCorrectSoundId(soundId),
    wrongId: normalizeWrongSoundId(soundId),
  });
}
