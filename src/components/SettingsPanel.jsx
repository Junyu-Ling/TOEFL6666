import { useState, useEffect, useRef } from "react";
import { useSettings } from "../context/SettingsContext";
import { stopGameKeyBubble } from "../utils/appKeyboard";
import {
  CORRECT_SOUND_OPTIONS,
  WRONG_SOUND_OPTIONS,
  previewAnswerSound,
} from "../utils/answerSounds";
import ExamScoreSection from "./ExamScoreSection";

function clampDelayInput(value) {
  const n = Number(String(value).trim());
  if (!Number.isFinite(n)) return null;
  return Math.min(60, Math.max(0, Math.round(n)));
}

export default function SettingsPanel() {
  const {
    settings,
    systemVoices,
    settingsOpen,
    setSettingsOpen,
    setTheme,
    setSystemVoiceURI,
    setAutoReadOnNewWord,
    setAutoDictateOnNewWord,
    setAutoAdvanceAfterFlip,
    setAutoAdvanceDelaySec,
    setPracticeStyle,
    setHideWordFirst,
    setAnswerSounds,
    setAnswerSoundCorrect,
    setAnswerSoundWrong,
    setWordsPerRound,
    setEnableRoundReview,
  } = useSettings();

  const [delayDraft, setDelayDraft] = useState(String(settings.autoAdvanceDelaySec));
  const [wordsPerRoundDraft, setWordsPerRoundDraft] = useState(String(settings.wordsPerRound));
  const panelRef = useRef(null);

  useEffect(() => {
    if (!settingsOpen || !panelRef.current) return;
    panelRef.current.focus({ preventScroll: true });
  }, [settingsOpen]);

  useEffect(() => {
    if (settingsOpen) {
      setDelayDraft(String(settings.autoAdvanceDelaySec));
      setWordsPerRoundDraft(String(settings.wordsPerRound));
    }
  }, [settings.autoAdvanceDelaySec, settings.wordsPerRound, settingsOpen]);

  function commitDelayDraft() {
    const trimmed = delayDraft.trim();
    if (trimmed === "") {
      setDelayDraft(String(settings.autoAdvanceDelaySec));
      return;
    }
    const clamped = clampDelayInput(trimmed);
    if (clamped == null) {
      setDelayDraft(String(settings.autoAdvanceDelaySec));
      return;
    }
    setDelayDraft(String(clamped));
    if (clamped !== settings.autoAdvanceDelaySec) {
      setAutoAdvanceDelaySec(clamped);
    }
  }

  function commitWordsPerRoundDraft() {
    const trimmed = wordsPerRoundDraft.trim();
    if (trimmed === "") {
      setWordsPerRoundDraft(String(settings.wordsPerRound));
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n <= 0) {
      setWordsPerRoundDraft(String(settings.wordsPerRound));
      return;
    }
    const clamped = Math.min(100, Math.max(5, Math.round(n)));
    setWordsPerRoundDraft(String(clamped));
    if (clamped !== settings.wordsPerRound) {
      setWordsPerRound(clamped);
    }
  }

  if (!settingsOpen) return null;

  return (
    <div className="settings-overlay" onClick={() => setSettingsOpen(false)} onKeyDown={stopGameKeyBubble}>
      <aside
        ref={panelRef}
        tabIndex={-1}
        className="settings-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="settings-panel__header">
          <h2>设置</h2>
          <button type="button" className="settings-panel__close" onClick={() => setSettingsOpen(false)}>
            ×
          </button>
        </header>

        <section className="settings-section settings-section--compact">
          <h3>外观</h3>
          <div className="theme-toggle">
            <button
              type="button"
              className={`theme-toggle__btn ${settings.theme === "light" ? "theme-toggle__btn--active" : ""}`}
              onClick={() => setTheme("light")}
            >
              浅色
            </button>
            <button
              type="button"
              className={`theme-toggle__btn ${settings.theme === "dark" ? "theme-toggle__btn--active" : ""}`}
              onClick={() => setTheme("dark")}
            >
              深色
            </button>
          </div>
        </section>

        <details className="settings-group" open>
          <summary className="settings-group__summary">
            <span className="settings-group__title">练习</span>
            <span className="settings-group__meta">
              {settings.hideWordFirst && settings.practiceStyle !== "recall"
                ? "听写后写释义"
                : settings.practiceStyle === "recall"
                  ? "默念核对"
                  : "输入批改"}
            </span>
          </summary>
          <div className="settings-group__body">
            <div className="settings-field">
              <span>练习方式</span>
              <div className="theme-toggle">
                <button
                  type="button"
                  className={`theme-toggle__btn ${settings.practiceStyle !== "recall" ? "theme-toggle__btn--active" : ""}`}
                  onClick={() => setPracticeStyle("type")}
                >
                  输入批改
                </button>
                <button
                  type="button"
                  className={`theme-toggle__btn ${settings.practiceStyle === "recall" ? "theme-toggle__btn--active" : ""}`}
                  onClick={() => setPracticeStyle("recall")}
                >
                  默念核对
                </button>
              </div>
            </div>
            {settings.practiceStyle !== "recall" ? (
              <label className="settings-toggle-row">
                <span className="settings-toggle-row__text">
                  <strong>先隐藏单词</strong>
                  <small>听音默写英文后再写中文释义</small>
                </span>
                <span className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.hideWordFirst}
                    onChange={(e) => setHideWordFirst(e.target.checked)}
                  />
                  <span className="toggle-switch__track" aria-hidden="true" />
                </span>
              </label>
            ) : null}
            <label className="settings-toggle-row">
              <span className="settings-toggle-row__text">
                <strong>答对 / 答错音效</strong>
              </span>
              <span className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.answerSounds}
                  onChange={(e) => setAnswerSounds(e.target.checked)}
                />
                <span className="toggle-switch__track" aria-hidden="true" />
              </span>
            </label>
            {settings.answerSounds ? (
              <>
                <div className="settings-field settings-field--spaced">
                  <span>答对音效</span>
                  <div className="settings-sound-row">
                    <select
                      value={settings.answerSoundCorrect}
                      onChange={(e) => setAnswerSoundCorrect(e.target.value)}
                    >
                      {CORRECT_SOUND_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="settings-action-btn settings-sound-row__preview"
                      onClick={() => previewAnswerSound(true, settings.answerSoundCorrect)}
                    >
                      试听
                    </button>
                  </div>
                </div>
                <div className="settings-field settings-field--spaced">
                  <span>答错音效</span>
                  <div className="settings-sound-row">
                    <select
                      value={settings.answerSoundWrong}
                      onChange={(e) => setAnswerSoundWrong(e.target.value)}
                    >
                      {WRONG_SOUND_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="settings-action-btn settings-sound-row__preview"
                      onClick={() => previewAnswerSound(false, settings.answerSoundWrong)}
                    >
                      试听
                    </button>
                  </div>
                </div>
              </>
            ) : null}
            <label className="settings-toggle-row">
              <span className="settings-toggle-row__text">
                <strong>切换单词时自动朗读</strong>
              </span>
              <span className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.autoReadOnNewWord}
                  onChange={(e) => setAutoReadOnNewWord(e.target.checked)}
                />
                <span className="toggle-switch__track" aria-hidden="true" />
              </span>
            </label>
            <label className="settings-toggle-row">
              <span className="settings-toggle-row__text">
                <strong>切换单词时自动开麦</strong>
              </span>
              <span className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.autoDictateOnNewWord}
                  onChange={(e) => setAutoDictateOnNewWord(e.target.checked)}
                />
                <span className="toggle-switch__track" aria-hidden="true" />
              </span>
            </label>
            <label className="settings-toggle-row">
              <span className="settings-toggle-row__text">
                <strong>翻面后自动下一个</strong>
              </span>
              <span className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.autoAdvanceAfterFlip}
                  onChange={(e) => setAutoAdvanceAfterFlip(e.target.checked)}
                />
                <span className="toggle-switch__track" aria-hidden="true" />
              </span>
            </label>
            {settings.autoAdvanceAfterFlip && (
              <label className="settings-field">
                <span>翻面后停留（秒）</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={delayDraft}
                  onChange={(e) => setDelayDraft(e.target.value)}
                  onBlur={commitDelayDraft}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitDelayDraft();
                      e.currentTarget.blur();
                    }
                  }}
                />
              </label>
            )}
            <label className="settings-toggle-row">
              <span className="settings-toggle-row__text">
                <strong>分轮背诵模式</strong>
                <span className="settings-toggle-row__hint">每轮背完后回到开头复习一遍</span>
              </span>
              <span className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.enableRoundReview}
                  onChange={(e) => setEnableRoundReview(e.target.checked)}
                />
                <span className="toggle-switch__track" aria-hidden="true" />
              </span>
            </label>
            {settings.enableRoundReview && (
              <label className="settings-field">
                <span>每轮单词数</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={wordsPerRoundDraft}
                  onChange={(e) => setWordsPerRoundDraft(e.target.value)}
                  onBlur={commitWordsPerRoundDraft}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitWordsPerRoundDraft();
                      e.currentTarget.blur();
                    }
                  }}
                  placeholder="5-100"
                />
              </label>
            )}
          </div>
        </details>

        <ExamScoreSection />

        <details className="settings-group">
          <summary className="settings-group__summary">
            <span className="settings-group__title">朗读</span>
            <span className="settings-group__meta">
              {settings.systemVoiceURI ? "已选音色" : "自动选择"}
              {systemVoices.length > 0 && (
                <span className="settings-group__count">（{systemVoices.length} 个可用）</span>
              )}
            </span>
          </summary>
          <div className="settings-group__body">
            <label className="settings-field">
              <span>朗读音色</span>
              <select
                value={settings.systemVoiceURI}
                onChange={(e) => setSystemVoiceURI(e.target.value)}
                className="settings-field__voice-select"
              >
                <option value="">🎯 智能选择（推荐）</option>
                
                {(() => {
                  const premiumVoices = systemVoices.filter((v) => 
                    /google|microsoft|natural|premium|enhanced|neural/i.test(v.name)
                  );
                  const standardVoices = systemVoices.filter((v) => 
                    !/google|microsoft|natural|premium|enhanced|neural|compact|eloquence|super-compact|legacy|bad\s+news|bubbles|cellos|deranged|good\s+news|jester|organ|superstar|trinoids|whisper|zarvox/i.test(v.name)
                  );
                  const lowQualityVoices = systemVoices.filter((v) => 
                    /compact|eloquence|super-compact|legacy|bad\s+news|bubbles|cellos|deranged|good\s+news|jester|organ|superstar|trinoids|whisper|zarvox/i.test(v.name)
                  );
                  
                  return (
                    <>
                      {premiumVoices.length > 0 && (
                        <optgroup label="⭐ 高级音色">
                          {premiumVoices.map((voice) => (
                            <option key={voice.voiceURI} value={voice.voiceURI}>
                              {voice.name} · {voice.lang}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      
                      {standardVoices.length > 0 && (
                        <optgroup label="🎙️ 标准音色">
                          {standardVoices.map((voice) => (
                            <option key={voice.voiceURI} value={voice.voiceURI}>
                              {voice.name} · {voice.lang}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      
                      {lowQualityVoices.length > 0 && (
                        <optgroup label="💬 基础音色">
                          {lowQualityVoices.map((voice) => (
                            <option key={voice.voiceURI} value={voice.voiceURI}>
                              {voice.name} · {voice.lang}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  );
                })()}
              </select>
            </label>
            
            {systemVoices.length === 0 && (
              <p className="settings-field__hint settings-field__hint--warning">
                ⚠️ 未检测到可用的朗读声音
              </p>
            )}
            
            {systemVoices.length < 5 && systemVoices.length > 0 && (
              <details className="settings-field__help">
                <summary className="settings-field__help-title">
                  💡 如何添加更多声音？
                </summary>
                <div className="settings-field__help-content">
                  <p><strong>Windows 10/11：</strong></p>
                  <ol>
                    <li>打开「设置」→「时间和语言」→「语音」</li>
                    <li>点击「添加语音」</li>
                    <li>搜索并安装英语声音包（推荐：Microsoft David、Zira、Mark）</li>
                  </ol>
                  
                  <p><strong>macOS：</strong></p>
                  <ol>
                    <li>打开「系统偏好设置」→「辅助功能」→「朗读内容」</li>
                    <li>点击「系统声音」→「自定义」</li>
                    <li>下载英语声音（推荐：Samantha、Alex、Allison）</li>
                  </ol>
                  
                  <p><strong>Chrome/Edge：</strong></p>
                  <p>可使用 Google 云端高级声音，无需额外安装</p>
                </div>
              </details>
            )}
          </div>
        </details>
      </aside>
    </div>
  );
}
