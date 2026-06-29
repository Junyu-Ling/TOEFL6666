import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { sendVocabChat } from "../services/aiChat";
import { createDictationSession } from "../utils/speechRecognition";
import RichAiContent from "./RichAiContent";
import {
  GENERAL_CHAT_KEY,
  getWordKey,
  displayWordKey,
  loadChatEntry,
  saveChatEntry,
  clearChatEntry,
  searchChatHistory,
} from "../services/aiChatHistory";

const WELCOME = {
  role: "assistant",
  content: "你好，我是词汇助教。可以问我词义辨析、用法、近反义词等英语单词相关问题。",
  welcome: true,
};

const SILENCE_STOP_MS = 2000;

function formatTimestamp(at) {
  if (!at) return "";
  const date = new Date(at);
  const now = new Date();
  const time = date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === now.toDateString()) return time;
  return `${date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })} ${time}`;
}

function withWelcome(messages) {
  return messages.length ? messages : [WELCOME];
}

function createMessage(role, content) {
  return { role, content, at: Date.now() };
}

export default function VocabAssistant({ currentWord, micGranted }) {
  const practiceWordKey = getWordKey(currentWord?.word);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("chat");
  const [activeWordKey, setActiveWordKey] = useState(practiceWordKey);
  const [storedDefinitions, setStoredDefinitions] = useState(currentWord?.definitions ?? []);
  const [messages, setMessages] = useState(() => withWelcome(loadChatEntry(practiceWordKey).messages));
  const [historyQuery, setHistoryQuery] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dictating, setDictating] = useState(false);
  const [dictationHint, setDictationHint] = useState("");
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const skipSaveRef = useRef(false);
  const dictationRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const inputValueRef = useRef("");
  const loadingRef = useRef(false);

  const historyItems = useMemo(() => searchChatHistory(historyQuery), [historyQuery, messages, view]);

  const chatContext = useMemo(() => {
    if (activeWordKey === GENERAL_CHAT_KEY) return null;
    return {
      currentWord: displayWordKey(activeWordKey),
      definitions: storedDefinitions,
    };
  }, [activeWordKey, storedDefinitions]);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    inputValueRef.current = input;
  }, [input]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  const stopDictation = useCallback(() => {
    clearTimeout(silenceTimerRef.current);
    dictationRef.current?.stop();
    dictationRef.current = null;
    setDictating(false);
    setDictationHint("");
  }, []);

  const handleSend = useCallback(
    async (e, answerText) => {
      e?.preventDefault?.();
      const text = (answerText ?? inputValueRef.current).trim();
      if (!text || loadingRef.current) return;

      stopDictation();
      const userMessage = createMessage("user", text);
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setInput("");
      inputValueRef.current = "";
      setError(null);
      setLoading(true);

      try {
        const { reply } = await sendVocabChat({
          messages: nextMessages.filter((m) => (m.role === "user" || m.role === "assistant") && !m.welcome),
          context: chatContext,
        });
        setMessages((prev) => [...prev, createMessage("assistant", reply)]);
      } catch (err) {
        setError(err.message || "发送失败，请稍后重试");
      } finally {
        setLoading(false);
      }
    },
    [messages, chatContext, stopDictation]
  );

  const scheduleSilenceStop = useCallback(() => {
    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      stopDictation();
      const text = inputValueRef.current.trim();
      if (text && !loadingRef.current) {
        handleSend(undefined, text);
      } else {
        inputRef.current?.focus();
      }
    }, SILENCE_STOP_MS);
  }, [stopDictation, handleSend]);

  const startDictation = useCallback(() => {
    if (!micGranted || loadingRef.current || dictating) return;

    setError(null);
    setDictationHint("正在聆听…");
    setInput("");
    inputValueRef.current = "";

    const session = createDictationSession({
      lang: "zh-CN",
      onInterim: (text) => {
        setInput(text);
        inputValueRef.current = text;
        setDictationHint(text);
        scheduleSilenceStop();
      },
      onFinal: (text) => {
        setInput(text);
        inputValueRef.current = text;
        setDictationHint("");
        scheduleSilenceStop();
      },
      onError: (err) => {
        if (err.message === "未检测到语音") {
          scheduleSilenceStop();
          return;
        }
        setError(err.message || "语音输入失败");
        stopDictation();
      },
    });

    if (!session) {
      setError("当前浏览器不支持语音识别");
      return;
    }

    dictationRef.current = session;
    session.start();
    setDictating(true);
    scheduleSilenceStop();
  }, [micGranted, dictating, scheduleSilenceStop, stopDictation]);

  const loadWordSession = useCallback((wordKey, definitions = []) => {
    skipSaveRef.current = true;
    stopDictation();
    const entry = loadChatEntry(wordKey);
    setActiveWordKey(wordKey);
    setStoredDefinitions(definitions.length ? definitions : entry.definitions);
    setMessages(withWelcome(entry.messages));
    setError(null);
    setInput("");
    setView("chat");
  }, [stopDictation]);

  useEffect(() => {
    const entry = loadChatEntry(practiceWordKey);
    loadWordSession(practiceWordKey, currentWord?.definitions ?? entry.definitions);
  }, [practiceWordKey, currentWord?.word, loadWordSession]);

  useEffect(() => {
    if (activeWordKey === practiceWordKey && currentWord?.definitions?.length) {
      setStoredDefinitions(currentWord.definitions);
    }
  }, [activeWordKey, practiceWordKey, currentWord?.definitions]);

  useEffect(() => {
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    const definitions =
      activeWordKey === practiceWordKey
        ? currentWord?.definitions ?? storedDefinitions
        : storedDefinitions;
    saveChatEntry(activeWordKey, messages, definitions);
  }, [messages, activeWordKey, storedDefinitions, practiceWordKey, currentWord?.definitions]);

  useEffect(() => {
    if (open && view === "chat") {
      scrollToBottom();
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, view, scrollToBottom]);

  useEffect(() => {
    if (view === "chat") scrollToBottom();
  }, [messages, loading, view, scrollToBottom]);

  useEffect(() => {
    if (!open) stopDictation();
    return () => stopDictation();
  }, [open, stopDictation]);

  function handleClear() {
    if (!window.confirm(`确定清空「${displayWordKey(activeWordKey)}」的对话记录吗？`)) return;
    stopDictation();
    clearChatEntry(activeWordKey);
    skipSaveRef.current = true;
    setMessages([WELCOME]);
    setError(null);
    setInput("");
  }

  function handleSelectHistory(wordKey) {
    const entry = loadChatEntry(wordKey);
    const defs =
      wordKey === practiceWordKey ? (currentWord?.definitions ?? entry.definitions) : entry.definitions;
    loadWordSession(wordKey, defs);
  }

  return (
    <div className="vocab-assistant" aria-live="polite">
      {open && (
        <section className="vocab-assistant__panel" aria-label="词汇 AI 助手">
          <header className="vocab-assistant__header">
            <div>
              <strong>词汇 AI</strong>
              <span className="vocab-assistant__context">
                {view === "history"
                  ? "历史记录"
                  : activeWordKey === GENERAL_CHAT_KEY
                    ? "通用对话"
                    : `当前词：${displayWordKey(activeWordKey)}`}
              </span>
            </div>
            <div className="vocab-assistant__header-actions">
              <button
                type="button"
                className={`vocab-assistant__icon-btn ${view === "history" ? "vocab-assistant__icon-btn--active" : ""}`}
                onClick={() => setView((v) => (v === "history" ? "chat" : "history"))}
              >
                历史
              </button>
              {view === "chat" && (
                <button type="button" className="vocab-assistant__icon-btn" onClick={handleClear} title="清空当前词对话">
                  清空
                </button>
              )}
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

          {view === "history" ? (
            <div className="vocab-assistant__history">
              <input
                className="vocab-assistant__history-search"
                type="search"
                placeholder="搜索单词…"
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
              />
              {historyItems.length === 0 ? (
                <p className="vocab-assistant__history-empty">暂无历史记录</p>
              ) : (
                <ul className="vocab-assistant__history-list">
                  {historyItems.map((item) => (
                    <li key={item.wordKey}>
                      <button
                        type="button"
                        className={`vocab-assistant__history-item ${item.wordKey === activeWordKey ? "vocab-assistant__history-item--active" : ""}`}
                        onClick={() => handleSelectHistory(item.wordKey)}
                      >
                        <span className="vocab-assistant__history-word">{item.label}</span>
                        <span className="vocab-assistant__history-meta">
                          {item.messageCount} 条 · {formatTimestamp(item.updatedAt)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <>
              <div ref={listRef} className="vocab-assistant__messages">
                {messages.map((msg, i) => (
                  <div
                    key={`${msg.role}-${msg.at ?? i}`}
                    className={`vocab-assistant__bubble-wrap vocab-assistant__bubble-wrap--${msg.role}`}
                  >
                    <div className={`vocab-assistant__bubble vocab-assistant__bubble--${msg.role}`}>
                      {msg.role === "assistant" ? (
                        <RichAiContent content={msg.content} />
                      ) : (
                        msg.content
                      )}
                    </div>
                    {!msg.welcome && msg.at && (
                      <time className="vocab-assistant__time" dateTime={new Date(msg.at).toISOString()}>
                        {formatTimestamp(msg.at)}
                      </time>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="vocab-assistant__bubble-wrap vocab-assistant__bubble-wrap--assistant">
                    <div className="vocab-assistant__bubble vocab-assistant__bubble--assistant vocab-assistant__bubble--pending">
                      <span className="spinner" />
                      思考中…
                    </div>
                  </div>
                )}
              </div>

              {error && <p className="vocab-assistant__error">{error}</p>}

              {dictationHint && <p className="vocab-assistant__dictation-hint">{dictationHint}</p>}

              <form className="vocab-assistant__form" onSubmit={handleSend}>
                <div className="vocab-assistant__input-wrap">
                  <textarea
                    ref={inputRef}
                    className="vocab-assistant__input"
                    rows={2}
                    placeholder={micGranted ? "输入或语音提问…" : "问词义、用法、易混词…"}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                    disabled={loading || dictating}
                  />
                  {micGranted && (
                    <button
                      type="button"
                      className={`voice-btn voice-btn--dictate vocab-assistant__voice-btn ${dictating ? "voice-btn--active" : ""}`}
                      onClick={startDictation}
                      disabled={loading || dictating}
                      title="语音输入"
                      aria-label="语音输入"
                    >
                      <MicIcon />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="btn btn--primary vocab-assistant__send"
                  disabled={loading || dictating || !input.trim()}
                >
                  发送
                </button>
              </form>
            </>
          )}
        </section>
      )}

      <button
        type="button"
        className={`vocab-assistant__fab ${open ? "vocab-assistant__fab--open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "关闭词汇 AI" : "打开词汇 AI"}
      >
        {open ? (
          "×"
        ) : (
          <img
            src="/ai-assistant-icon.png"
            alt=""
            className="vocab-assistant__fab-icon"
            width={64}
            height={64}
          />
        )}
      </button>
    </div>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  );
}
