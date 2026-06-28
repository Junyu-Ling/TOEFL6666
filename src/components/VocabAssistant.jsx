import { useState, useRef, useEffect, useCallback } from "react";
import { sendVocabChat } from "../services/aiChat";

const WELCOME = {
  role: "assistant",
  content: "你好，我是词汇助教。可以问我词义辨析、用法、近反义词等英语单词相关问题。",
};

export default function VocabAssistant({ currentWord }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const context =
    currentWord?.word
      ? { currentWord: currentWord.word, definitions: currentWord.definitions }
      : null;

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    if (open) {
      scrollToBottom();
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  async function handleSend(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const { reply } = await sendVocabChat({
        messages: nextMessages.filter((m) => m.role === "user" || m.role === "assistant"),
        context,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err.message || "发送失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setMessages([WELCOME]);
    setError(null);
    setInput("");
  }

  return (
    <div className="vocab-assistant" aria-live="polite">
      {open && (
        <section className="vocab-assistant__panel" aria-label="词汇 AI 助手">
          <header className="vocab-assistant__header">
            <div>
              <strong>词汇 AI</strong>
              {context && (
                <span className="vocab-assistant__context">当前词：{context.currentWord}</span>
              )}
            </div>
            <div className="vocab-assistant__header-actions">
              <button type="button" className="vocab-assistant__icon-btn" onClick={handleClear} title="清空对话">
                清空
              </button>
              <button
                type="button"
                className="vocab-assistant__icon-btn"
                onClick={() => setOpen(false)}
                aria-label="关闭"
              >
                ×
              </button>
            </div>
          </header>

          <div ref={listRef} className="vocab-assistant__messages">
            {messages.map((msg, i) => (
              <div
                key={`${msg.role}-${i}`}
                className={`vocab-assistant__bubble vocab-assistant__bubble--${msg.role}`}
              >
                {msg.content}
              </div>
            ))}
            {loading && (
              <div className="vocab-assistant__bubble vocab-assistant__bubble--assistant vocab-assistant__bubble--pending">
                <span className="spinner" />
                思考中…
              </div>
            )}
          </div>

          {error && <p className="vocab-assistant__error">{error}</p>}

          <form className="vocab-assistant__form" onSubmit={handleSend}>
            <textarea
              ref={inputRef}
              className="vocab-assistant__input"
              rows={2}
              placeholder="问词义、用法、易混词…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={loading}
            />
            <button type="submit" className="btn btn--primary vocab-assistant__send" disabled={loading || !input.trim()}>
              发送
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className={`vocab-assistant__fab ${open ? "vocab-assistant__fab--open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "关闭词汇 AI" : "打开词汇 AI"}
      >
        {open ? "×" : "AI"}
      </button>
    </div>
  );
}
