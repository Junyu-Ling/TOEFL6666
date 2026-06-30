import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { sendVocabChat } from "../services/aiChat";
import { extractTextFromUpload, getSupportedUploadHint, isSupportedTextUpload } from "../services/ocr";
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
  content:
    "你好，我是词汇与 **2026 新托福** 助教。可问我：单词辨析、用法、近反义词，以及 **新托福结构、1–6 分制、四科题型与改革变化**（2026-01-21 起）。",
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

function createMessage(role, content, extra = {}) {
  return { role, content, at: Date.now(), ...extra };
}

function buildOutgoingContent(text, attachments) {
  const parts = [];
  for (const item of attachments) {
    if (!item.text?.trim()) continue;
    parts.push(`[来自文件「${item.name}」]\n${item.text.trim()}`);
  }
  const trimmed = String(text || "").trim();
  if (trimmed) parts.push(trimmed);
  return parts.join("\n\n");
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
  const [attachments, setAttachments] = useState([]);
  const [fileProcessing, setFileProcessing] = useState(false);
  const [panelSize, setPanelSize] = useState(loadPanelSize);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const skipSaveRef = useRef(false);
  const dictationRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const inputValueRef = useRef("");
  const loadingRef = useRef(false);
  const fileProcessingRef = useRef(false);
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
    fileProcessingRef.current = fileProcessing;
  }, [fileProcessing]);

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
      const readyAttachments = attachments.filter((item) => item.status === "ready" && item.text?.trim());
      const outgoing = buildOutgoingContent(text, readyAttachments);
      if (!outgoing || loadingRef.current || fileProcessing) return;

      stopDictation();
      const userMessage = createMessage("user", outgoing, {
        attachments: readyAttachments.map(({ id, name, source }) => ({ id, name, source })),
      });
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setInput("");
      inputValueRef.current = "";
      setAttachments([]);
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
    [messages, chatContext, stopDictation, attachments, fileProcessing]
  );

  const handleRemoveAttachment = useCallback((id) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const processUploadFile = useCallback(async (file) => {
    if (!file || fileProcessingRef.current || loadingRef.current) return;

    if (!isSupportedTextUpload(file)) {
      setError(getSupportedUploadHint());
      return;
    }

    const attachmentId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setAttachments((prev) => [
      ...prev,
      { id: attachmentId, name: file.name, text: "", status: "processing", source: null },
    ]);
    setError(null);
    setFileProcessing(true);

    try {
      const result = await extractTextFromUpload(file);
      setAttachments((prev) =>
        prev.map((item) =>
          item.id === attachmentId
            ? {
                ...item,
                text: result.text,
                status: "ready",
                source: result.source,
              }
            : item
        )
      );
    } catch (err) {
      setAttachments((prev) => prev.filter((item) => item.id !== attachmentId));
      setError(err.message || "文件识别失败");
    } finally {
      setFileProcessing(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, []);

  const handleFilePick = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      await processUploadFile(file);
    },
    [processUploadFile]
  );

  const handlePaste = useCallback(
    (event) => {
      if (loadingRef.current || fileProcessingRef.current) return;

      const clipboard = event.clipboardData;
      if (!clipboard) return;

      const imageItem = Array.from(clipboard.items || []).find(
        (item) => item.kind === "file" && item.type.startsWith("image/")
      );
      if (!imageItem) return;

      const blob = imageItem.getAsFile();
      if (!blob) return;

      event.preventDefault();
      const subtype = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
      const file = new File([blob], `粘贴图片-${Date.now()}.${subtype}`, {
        type: blob.type || "image/png",
      });

      void processUploadFile(file);
    },
    [processUploadFile]
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
    setAttachments([]);
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
    setAttachments([]);
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
                  <ChatMessageRow key={`${msg.role}-${msg.at ?? i}`} msg={msg} />
                ))}
                {loading && (
                  <ChatMessageRow
                    msg={{ role: "assistant", pending: true, content: "思考中…" }}
                  />
                )}
              </div>

              {error && <p className="vocab-assistant__error">{error}</p>}

              {dictationHint && <p className="vocab-assistant__dictation-hint">{dictationHint}</p>}

              <form className="vocab-assistant__form" onSubmit={handleSend}>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="vocab-assistant__file-input"
                  accept=".txt,.md,.csv,.json,.pdf,.jpg,.jpeg,.png,.webp,.gif,.bmp,text/plain,text/markdown,text/csv,application/json,application/pdf,image/*"
                  onChange={handleFilePick}
                  tabIndex={-1}
                  aria-hidden
                />
                {(attachments.length > 0 || fileProcessing) && (
                  <ul className="vocab-assistant__attachments" aria-label="已上传文件">
                    {attachments.map((item) => (
                      <li key={item.id} className="vocab-assistant__attachment">
                        <span className="vocab-assistant__attachment-name" title={item.name}>
                          {item.status === "processing" ? (
                            <>
                              <span className="spinner spinner--inline" />
                              识别中：{item.name}
                            </>
                          ) : (
                            <>
                              {item.source === "ocr" ? "OCR" : "文本"} · {item.name}
                            </>
                          )}
                        </span>
                        {item.status === "ready" && (
                          <button
                            type="button"
                            className="vocab-assistant__attachment-remove"
                            onClick={() => handleRemoveAttachment(item.id)}
                            aria-label={`移除 ${item.name}`}
                          >
                            ×
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="vocab-assistant__composer">
                  <button
                    type="button"
                    className="vocab-assistant__upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading || dictating || fileProcessing}
                    title={getSupportedUploadHint()}
                    aria-label="上传含文字的文件"
                  >
                    <AttachIcon />
                  </button>
                  <div className="vocab-assistant__input-wrap">
                    <textarea
                      ref={inputRef}
                      className="vocab-assistant__input"
                      rows={2}
                      placeholder={
                        micGranted
                          ? "输入、上传文件、Ctrl+V 粘贴图片或语音提问…"
                          : "问词义、用法、易混词；可上传文件或 Ctrl+V 粘贴图片…"
                      }
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onPaste={handlePaste}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend(e);
                        }
                      }}
                      disabled={loading || dictating || fileProcessing}
                    />
                    {micGranted && (
                      <button
                        type="button"
                        className={`voice-btn voice-btn--dictate vocab-assistant__voice-btn ${dictating ? "voice-btn--active" : ""}`}
                        onClick={startDictation}
                        disabled={loading || dictating || fileProcessing}
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
                    disabled={
                      loading ||
                      dictating ||
                      fileProcessing ||
                      (!input.trim() && !attachments.some((item) => item.status === "ready" && item.text?.trim()))
                    }
                  >
                    发送
                  </button>
                </div>
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

function AttachIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden>
      <path d="M16.5 6.5v9.25a4.25 4.25 0 1 1-8.5 0V5.75a2.75 2.75 0 1 1 5.5 0v9.5a1.25 1.25 0 1 1-2.5 0V6.5h-1.5v8.75a2.75 2.75 0 1 0 5.5 0V5.75a4.25 4.25 0 0 0-8.5 0v10a5.75 5.75 0 1 0 11.5 0V6.5h-1.5z" />
    </svg>
  );
}

function BotAvatar() {
  return (
    <div className="vocab-assistant__avatar vocab-assistant__avatar--bot" aria-hidden>
      <img src="/ai-assistant-icon.png" alt="" />
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="vocab-assistant__avatar vocab-assistant__avatar--user" aria-hidden>
      我
    </div>
  );
}

function ChatMessageRow({ msg }) {
  const isUser = msg.role === "user";
  const isPending = Boolean(msg.pending);

  return (
    <div className={`vocab-assistant__message-row vocab-assistant__message-row--${msg.role}`}>
      {!isUser && <BotAvatar />}
      <div className="vocab-assistant__message-body">
        <div
          className={`vocab-assistant__bubble vocab-assistant__bubble--${msg.role}${
            isPending ? " vocab-assistant__bubble--pending" : ""
          }`}
        >
          {isPending ? (
            <>
              <span className="spinner" />
              {msg.content}
            </>
          ) : msg.role === "assistant" ? (
            <RichAiContent content={msg.content} />
          ) : (
            <p className="vocab-assistant__user-text">{msg.content}</p>
          )}
        </div>
        {!msg.welcome && msg.at && (
          <time className="vocab-assistant__time" dateTime={new Date(msg.at).toISOString()}>
            {formatTimestamp(msg.at)}
          </time>
        )}
      </div>
      {isUser && <UserAvatar />}
    </div>
  );
}
