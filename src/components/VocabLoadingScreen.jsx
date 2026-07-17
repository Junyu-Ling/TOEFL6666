import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import loadingWordsData from "../data/loadingWords.json";

const MESSAGES = [
  "正在唤醒词库…",
  "加载高频词汇…",
  "整理闪卡练习…",
  "校准 AI 助教…",
  "Ready to learn!",
];

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

export default function VocabLoadingScreen() {
  const [current, setCurrent] = useState(() => pickRandomWord(null));
  const [flipped, setFlipped] = useState(false);
  const [judged, setJudged] = useState(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const advanceTimerRef = useRef(null);

  const goToNextWord = useCallback(() => {
    setFlipped(false);
    setJudged(null);
    setCurrent((prev) => pickRandomWord(prev?.word));
  }, []);

  useEffect(() => {
    return () => window.clearTimeout(advanceTimerRef.current);
  }, []);

  const handleFlip = useCallback(() => {
    setFlipped((prev) => !prev);
  }, []);

  const handleJudge = useCallback(
    (know) => {
      if (judged) return;
      setJudged(know ? "know" : "unknown");
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = window.setTimeout(goToNextWord, 900);
    },
    [goToNextWord, judged]
  );

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length);
    }, 2200);
    return () => clearInterval(msgTimer);
  }, []);

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

  const cardStateClass = judged === "know" ? "flashcard--correct" : judged === "unknown" ? "flashcard--wrong" : "";

  return (
    <div className="vocab-loader" aria-live="polite" aria-busy="true">
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
          <span className="vocab-loader__brand-text">TOEFL 6·6·6·6</span>
        </p>

        {current && (
          <div className="vocab-loader__scene-wrap">
            <div className="flashcard-scene vocab-loader__scene">
              <div
                role="button"
                tabIndex={0}
                className={`flashcard vocab-loader__card ${flipped ? "flashcard--flipped" : ""} ${cardStateClass}`}
                onClick={judged ? undefined : handleFlip}
                onKeyDown={(e) => {
                  if (judged) return;
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
                  <p className="flashcard__prompt">点击卡片查看释义，顺手认一认这个词</p>
                </div>

                <div className="flashcard__face flashcard__back">
                  <div className="flashcard__badge flashcard__badge--neutral">释义</div>
                  <ul className="flashcard__definitions">
                    <li>{current.meaning}</li>
                  </ul>
                  <p className="flashcard__mark-prompt">你认识这个词吗？</p>
                  <div className="flashcard__mark-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="btn btn--mark btn--mark-ok"
                      disabled={Boolean(judged)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJudge(true);
                      }}
                    >
                      认识
                    </button>
                    <button
                      type="button"
                      className="btn btn--mark btn--mark-fail"
                      disabled={Boolean(judged)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJudge(false);
                      }}
                    >
                      不认识
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="vocab-loader__message">{MESSAGES[messageIndex]}</p>

        <div className="vocab-loader__progress">
          <div className="vocab-loader__progress-bar" />
        </div>
      </div>
    </div>
  );
}
