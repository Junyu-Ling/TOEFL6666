import { useEffect, useState, useMemo } from "react";

const WORDS = [
  { word: "ephemeral", hint: "短暂的" },
  { word: "eloquent", hint: "雄辩的" },
  { word: "resilient", hint: "有韧性的" },
  { word: "pragmatic", hint: "务实的" },
  { word: "ubiquitous", hint: "无处不在的" },
  { word: "meticulous", hint: "一丝不苟的" },
];

const MESSAGES = [
  "正在唤醒词库…",
  "加载高频词汇…",
  "整理闪卡练习…",
  "校准 AI 助教…",
  "Ready to learn!",
];

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export default function VocabLoadingScreen() {
  const [wordIndex, setWordIndex] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const current = WORDS[wordIndex];

  useEffect(() => {
    const flipTimer = setInterval(() => setFlipped((v) => !v), 1400);
    return () => clearInterval(flipTimer);
  }, []);

  useEffect(() => {
    const wordTimer = setInterval(() => {
      setWordIndex((i) => (i + 1) % WORDS.length);
      setFlipped(false);
    }, 2800);
    return () => clearInterval(wordTimer);
  }, []);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length);
    }, 2200);
    return () => clearInterval(msgTimer);
  }, []);

  const particles = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      char: LETTERS[i % LETTERS.length],
      left: `${(i * 17 + 7) % 100}%`,
      delay: `${(i * 0.35) % 4}s`,
      duration: `${4 + (i % 5)}s`,
      size: 0.75 + (i % 4) * 0.15,
    }));
  }, []);

  return (
    <div className="vocab-loader" aria-live="polite" aria-busy="true">
      <div className="vocab-loader__bg" aria-hidden />

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
        <p className="vocab-loader__brand">TOEFL 6·6·6·6</p>

        <div className={`vocab-loader__scene ${flipped ? "vocab-loader__scene--flipped" : ""}`}>
          <div className="vocab-loader__card">
            <div className="vocab-loader__face vocab-loader__face--front">
              <span className="vocab-loader__label">Word</span>
              <strong>{current.word}</strong>
            </div>
            <div className="vocab-loader__face vocab-loader__face--back">
              <span className="vocab-loader__label">释义</span>
              <strong>{current.hint}</strong>
            </div>
          </div>
        </div>

        <div className="vocab-loader__orbit" aria-hidden>
          {WORDS.slice(0, 4).map((item, i) => (
            <span key={item.word} className="vocab-loader__orbit-word" style={{ "--i": i }}>
              {item.word}
            </span>
          ))}
        </div>

        <p className="vocab-loader__message">{MESSAGES[messageIndex]}</p>

        <div className="vocab-loader__progress">
          <div className="vocab-loader__progress-bar" />
        </div>
      </div>
    </div>
  );
}
