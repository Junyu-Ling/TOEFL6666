import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { sendVocabChat } from "../services/aiChat";
import { createDictationSession } from "../utils/speechRecognition";
import RichAiContent from "./RichAiContent";
import RobotFabIcon from "./RobotFabIcon";
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
const PANEL_SIZE_KEY = "toefl666_vocab_assistant_size";
const DEFAULT_PANEL_SIZE = { width: 352, height: 448 };
const MIN_PANEL_SIZE = { width: 280, height: 300 };
const PANEL_VIEWPORT_MARGIN = { x: 32, y: 96 };

function getMaxPanelSize() {
  if (typeof window === "undefined") {
    return { width: DEFAULT_PANEL_SIZE.width, height: DEFAULT_PANEL_SIZE.height };
  }
  return {
    width: window.innerWidth - PANEL_VIEWPORT_MARGIN.x,
    height: window.innerHeight - PANEL_VIEWPORT_MARGIN.y,
  };
}

function clampPanelSize(width, height) {
  const max = getMaxPanelSize();
  return {
    width: Math.round(Math.min(max.width, Math.max(MIN_PANEL_SIZE.width, width))),
    height: Math.round(Math.min(max.height, Math.max(MIN_PANEL_SIZE.height, height))),
  };
}

function loadPanelSize() {
  try {
    const raw = localStorage.getItem(PANEL_SIZE_KEY);
    if (!raw) return clampPanelSize(DEFAULT_PANEL_SIZE.width, DEFAULT_PANEL_SIZE.height);
    const parsed = JSON.parse(raw);
    return clampPanelSize(Number(parsed.width) || DEFAULT_PANEL_SIZE.width, Number(parsed.height) || DEFAULT_PANEL_SIZE.height);
  } catch {
    return clampPanelSize(DEFAULT_PANEL_SIZE.width, DEFAULT_PANEL_SIZE.height);
  }
}

function savePanelSize(size) {
  localStorage.setItem(PANEL_SIZE_KEY, JSON.stringify(size));
}

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
  const [panelSize, setPanelSize] = useState(loadPanelSize);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const skipSaveRef = useRef(false);
  const dictationRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const inputValueRef = useRef("");
  const loadingRef = useRef(false);
  const panelSizeRef = useRef(panelSize);

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

  useEffect(() => {
    panelSizeRef.current = panelSize;
  }, [panelSize]);

  useEffect(() => {
    function handleWindowResize() {
      setPanelSize((prev) => {
        const next = clampPanelSize(prev.width, prev.height);
        if (next.width === prev.width && next.height === prev.height) return prev;
        savePanelSize(next);
        return next;
      });
    }

    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, []);

  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const start = {
      x: e.clientX,
      y: e.clientY,
      width: panelSizeRef.current.width,
      height: panelSizeRef.current.height,
    };

    function onMove(ev) {
      const dx = start.x - ev.clientX;
      const dy = start.y - ev.clientY;
      setPanelSize(clampPanelSize(start.width + dx, start.height + dy));
    }

    function onUp() {
      savePanelSize(panelSizeRef.current);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, []);

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
        <section
          className="vocab-assistant__panel"
          style={{ width: panelSize.width, height: panelSize.height }}
          aria-label="词汇 AI 助手"
        >
          <div
            className="vocab-assistant__resize-handle"
            onPointerDown={handleResizeStart}
            role="separator"
            aria-orientation="both"
            aria-label="拖动调整对话框大小"
            title="拖动左上角调整大小"
          />
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
          <RobotFabIcon className="vocab-assistant__fab-icon" />
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
