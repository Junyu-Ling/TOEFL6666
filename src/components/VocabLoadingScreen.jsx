import { useCallback, useEffect, useMemo, useState } from "react";
import { useSettings } from "../context/SettingsContext";
import { APP_MODE_LABELS } from "../utils/appMode";
import loadingWordsData from "../data/loadingWords.json";

const LOADING_MESSAGES = [
  "正在唤醒词库…",
  "加载高频词汇…",
  "整理闪卡练习…",
  "校准 AI 助教…",
];

const AUTO_FLIP_MS = 2800;
const AUTO_ENTER_MS = 2600;

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ALL_WORDS = loadingWordsData.words ?? [];

function pickRandomWord(excludeWord) {
  if (!ALL_WORDS.length) return null;
  if (ALL_WORDS.length === 1) return ALL_WORDS[0];
  let next = ALL_WORDS[Math.floor(Math.random() * ALL_WORDS.length)];
  let guard = 0;
  while (next.word === excludeWord && guard < 6) {
    next = ALL_WORDS[Math.floor(Math.random() * ALL_WORDS.length)];
    guard += 1;
  }
  return next;
}

export default function VocabLoadingScreen({ dataReady = false, onWordJudged }) {
  const { settings } = useSettings();
  const appMode = settings.appMode ?? "toefl";
  const [current] = useState(() => pickRandomWord(null));
  const [flipped, setFlipped] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  const finishLoading = useCallback(() => {
    if (completed) return;
    setCompleted(true);
    onWordJudged?.();
  }, [completed, onWordJudged]);

  const handleFlip = useCallback(() => {
    if (completed) return;
    setFlipped((prev) => !prev);
  }, [completed]);

  useEffect(() => {
    if (!current) onWordJudged?.();
  }, [current, onWordJudged]);

  useEffect(() => {
    if (!current || completed || flipped) return;
    const flipTimer = window.setTimeout(() => {
      setFlipped(true);
    }, AUTO_FLIP_MS);
    return () => window.clearTimeout(flipTimer);
  }, [completed, current, flipped]);

  useEffect(() => {
    if (!flipped || completed) return;
    const enterTimer = window.setTimeout(() => {
      finishLoading();
    }, AUTO_ENTER_MS);
    return () => window.clearTimeout(enterTimer);
  }, [completed, finishLoading, flipped]);

  useEffect(() => {
    if (completed || dataReady) return;
    const msgTimer = setInterval(() => {
      setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2200);
    return () => clearInterval(msgTimer);
  }, [completed, dataReady]);

  const statusMessage = useMemo(() => {
    if (completed && !dataReady) return "词库加载中，请稍候…";
    if (completed && dataReady) return "即将进入…";
    if (flipped && !completed) return "记一记这个释义，即将自动进入…";
    if (!completed && dataReady) return "词库已就绪，稍后将展示释义…";
    return LOADING_MESSAGES[messageIndex];
  }, [completed, dataReady, flipped, messageIndex]);

  const particles = useMemo(() => {
    return Array.from({ length: 22 }, (_, i) => ({
      id: i,
      char: LETTERS[i % LETTERS.length],
      left: `${(i * 17 + 7) % 100}%`,
      delay: `${(i * 0.35) % 4}s`,
      duration: `${4 + (i % 5)}s`,
      size: 0.75 + (i % 4) * 0.15,
    }));
  }, []);

  const progressClass = dataReady
    ? completed
      ? "vocab-loader__progress-bar vocab-loader__progress-bar--done"
      : "vocab-loader__progress-bar vocab-loader__progress-bar--ready"
    : "vocab-loader__progress-bar";

  return (
    <div className={`vocab-loader vocab-loader--${appMode}`} aria-live="polite" aria-busy={!dataReady || !completed}>
      <div className="vocab-loader__bg" aria-hidden />
      <div className="vocab-loader__ring" aria-hidden />
      <div className="vocab-loader__grain" aria-hidden />

      <div className="vocab-loader__letters" aria-hidden>
        {particles.map((p) => (
          <span
            key={p.id}
            className="vocab-loader__letter"
            style={{
              left: p.left,
              animationDelay: p.delay,
              animationDuration: p.duration,
              fontSize: `${p.size}rem`,
            }}
          >
            {p.char}
          </span>
        ))}
      </div>

      <div className="vocab-loader__content">
        <p className="vocab-loader__brand">
          <span className="vocab-loader__brand-icon" aria-hidden>
            {appMode === "sat" ? "🌙" : "☀️"}
          </span>
          <span className="vocab-loader__brand-text">{APP_MODE_LABELS[appMode]}</span>
        </p>

        {current ? (
          <div className="vocab-loader__scene-wrap">
            <div className="flashcard-scene vocab-loader__scene">
              <div
                role="button"
                tabIndex={completed ? -1 : 0}
                className={`flashcard vocab-loader__card ${flipped ? "flashcard--flipped" : ""}`}
                onClick={completed ? undefined : handleFlip}
                onKeyDown={(e) => {
                  if (completed) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleFlip();
                  }
                }}
                aria-label={flipped ? "翻回单词正面" : "查看释义"}
              >
                <div className="flashcard__face flashcard__front">
                  <div className="flashcard__term">
                    <div className="flashcard__term-row">
                      <h2 className="flashcard__word">{current.word}</h2>
                    </div>
                  </div>
                  <p className="flashcard__prompt">稍后将自动展示释义，先认一认这个词</p>
                </div>

                <div className="flashcard__face flashcard__back">
                  <div className="flashcard__badge flashcard__badge--neutral">释义</div>
                  <ul className="flashcard__definitions">
                    <li>{current.meaning}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="vocab-loader__hint">加载词库中，请稍候…</p>
        )}

        <p className={`vocab-loader__message ${dataReady && !completed ? "vocab-loader__message--emphasis" : ""}`}>
          {statusMessage}
        </p>

        <div className="vocab-loader__progress">
          <div className={progressClass} />
        </div>
      </div>
    </div>
  );
}
