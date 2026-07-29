import { useState, useEffect, useMemo, useRef } from "react";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { stopGameKeyBubble } from "../utils/appKeyboard";
import { getSyncSummary } from "../shared/sync";
import { getUserProfile } from "../utils/userProfile";
import { syncService, SYNC_STATUS_EVENT } from "../services/syncService";
import {
  CORRECT_SOUND_OPTIONS,
  WRONG_SOUND_OPTIONS,
  previewAnswerSound,
} from "../utils/answerSounds";
import ExamScoreSection from "./ExamScoreSection";
import UserAvatar from "./UserAvatar";

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
  } = useSettings();
  const { user, loading: authLoading, isConfigured, signInWithGoogle, signOut } = useAuth();

  const [delayDraft, setDelayDraft] = useState(String(settings.autoAdvanceDelaySec));
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [syncStatus, setSyncStatus] = useState(() => syncService.getStatus());
  const panelRef = useRef(null);

  const profile = useMemo(() => getUserProfile(user), [user]);
  const syncSummary = useMemo(() => getSyncSummary(), [settingsOpen, syncStatus.state]);

  useEffect(() => {
    function onStatus(event) {
      setSyncStatus(event.detail || syncService.getStatus());
    }
    window.addEventListener(SYNC_STATUS_EVENT, onStatus);
    return () => window.removeEventListener(SYNC_STATUS_EVENT, onStatus);
  }, []);

  useEffect(() => {
    if (settingsOpen) {
      setDelayDraft(String(settings.autoAdvanceDelaySec));
      setAuthError("");
      setAuthMessage("");
      setSyncStatus(syncService.getStatus());
    }
  }, [settings.autoAdvanceDelaySec, settingsOpen]);

  useEffect(() => {
    if (!settingsOpen || !panelRef.current) return;
    panelRef.current.focus({ preventScroll: true });
  }, [settingsOpen]);

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

  async function handleGoogleSignIn() {
    setAuthBusy(true);
    setAuthError("");
    setAuthMessage("");
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(err.message || "Google 登录失败");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    setAuthBusy(true);
    setAuthError("");
    setAuthMessage("");
    try {
      await signOut();
      setAuthMessage("已退出登录，本机进度仍保留在本地");
    } catch (err) {
      setAuthError(err.message || "退出登录失败");
    } finally {
      setAuthBusy(false);
    }
  }

  if (!settingsOpen) return null;

  return (
    <div className="settings-overlay" onClick={() => setSettingsOpen(false)} onKeyDown={stopGameKeyBubble}>
      <aside
        ref={panelRef}
        tabIndex={-1}
        className="settings-panel account-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="settings-panel__header account-panel__header">
          <h2>{profile ? "我的账号" : "登录 / 注册"}</h2>
          <button type="button" className="settings-panel__close" onClick={() => setSettingsOpen(false)}>
            ×
          </button>
        </header>

        <section className="account-panel__profile">
          {profile ? (
            <>
              <div className="account-panel__identity">
                <UserAvatar
                  name={profile.name}
                  avatarUrl={profile.avatarUrl}
                  size={56}
                  className="account-panel__avatar"
                />
                <div className="account-panel__meta">
                  <strong className="account-panel__name">{profile.name}</strong>
                  <span className="account-panel__email">{profile.email}</span>
                  <span className="account-panel__sync">
                    {syncStatus.message || "进度已绑定到此 Google 账号"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="settings-action-btn settings-action-btn--block"
                onClick={handleSignOut}
                disabled={authBusy || authLoading}
              >
                退出登录
              </button>
            </>
          ) : (
            <>
              <div className="account-panel__guest">
                <UserAvatar name="登录" avatarUrl="" size={56} className="account-panel__avatar" />
                <div className="account-panel__meta">
                  <strong className="account-panel__name">登录后即可同步进度</strong>
                  <span className="account-panel__email">
                    首次使用 Google 登录会自动完成注册；若本机已有学习记录，会自动合并到账号。
                  </span>
                </div>
              </div>
              {!isConfigured ? (
                <p className="settings-status settings-status--error">
                  未配置 Google 登录（需在环境变量中设置 Supabase）。
                </p>
              ) : (
                <button
                  type="button"
                  className="settings-action-btn settings-action-btn--primary settings-action-btn--block account-panel__google-btn"
                  onClick={handleGoogleSignIn}
                  disabled={authBusy || authLoading}
                >
                  {authBusy || authLoading ? "处理中…" : "使用 Google 登录 / 注册"}
                </button>
              )}
            </>
          )}

          {authMessage && <p className="settings-status settings-status--ok">{authMessage}</p>}
          {authError && <p className="settings-status settings-status--error">{authError}</p>}
        </section>

        {profile ? (
          <>
            <p className="account-panel__settings-lead">账号设置</p>

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
              </div>
            </details>

            <ExamScoreSection />

            <details className="settings-group">
              <summary className="settings-group__summary">
                <span className="settings-group__title">云端进度</span>
                <span className="settings-group__meta">
                  熟词 {syncSummary.recognized} · 生词 {syncSummary.unrecognized}
                </span>
              </summary>
              <div className="settings-group__body">
                <p className="settings-hint settings-hint--compact">
                  学习进度会自动同步到当前 Google 账号，换设备登录同一账号即可继续。
                </p>
              </div>
            </details>

            <details className="settings-group">
              <summary className="settings-group__summary">
                <span className="settings-group__title">朗读</span>
                <span className="settings-group__meta">
                  {settings.systemVoiceURI ? "已选音色" : "自动选择"}
                </span>
              </summary>
              <div className="settings-group__body">
                <label className="settings-field">
                  <span>朗读音色</span>
                  <select
                    value={settings.systemVoiceURI}
                    onChange={(e) => setSystemVoiceURI(e.target.value)}
                  >
                    <option value="">自动选择（推荐）</option>
                    {systemVoices.map((voice) => (
                      <option key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </details>
          </>
        ) : null}
      </aside>
    </div>
  );
}
