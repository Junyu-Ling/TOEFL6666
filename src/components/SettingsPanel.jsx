import { useState, useEffect, useMemo, useRef } from "react";
import { useSettings } from "../context/SettingsContext";
import { formatPairingCode, getSyncSummary, normalizePairingCode } from "../shared/sync";
import { pushSyncData, syncService, SYNC_STATUS_EVENT } from "../services/syncService";
import {
  CORRECT_SOUND_OPTIONS,
  WRONG_SOUND_OPTIONS,
  previewAnswerSound,
} from "../utils/answerSounds";

const SYNC_SESSION_KEY = "toefl666_last_sync";

function readLastSync() {
  try {
    return JSON.parse(sessionStorage.getItem(SYNC_SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function writeLastSync({ code, host, backend }) {
  sessionStorage.setItem(
    SYNC_SESSION_KEY,
    JSON.stringify({ code, host, backend, at: Date.now() })
  );
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

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

  const [delayDraft, setDelayDraft] = useState(String(settings.autoAdvanceDelaySec));
  const [pullCode, setPullCode] = useState("");
  const [uploadedCode, setUploadedCode] = useState("");
  const [uploadedHost, setUploadedHost] = useState("");
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncError, setSyncError] = useState("");
  const [pairingCode, setPairingCode] = useState(() => syncService.getPairingCode());
  const [syncStatus, setSyncStatus] = useState(() => syncService.getStatus());
  const panelRef = useRef(null);

  const syncSummary = useMemo(() => getSyncSummary(), [settingsOpen, syncStatus.state]);

  useEffect(() => {
    function onStatus(event) {
      setSyncStatus(event.detail || syncService.getStatus());
      const code = event.detail?.code || syncService.getPairingCode();
      if (code) setPairingCode(code);
    }
    window.addEventListener(SYNC_STATUS_EVENT, onStatus);
    return () => window.removeEventListener(SYNC_STATUS_EVENT, onStatus);
  }, []);

  useEffect(() => {
    if (!settingsOpen || !panelRef.current) return;
    panelRef.current.focus({ preventScroll: true });
  }, [settingsOpen]);

  useEffect(() => {
    if (settingsOpen) {
      setDelayDraft(String(settings.autoAdvanceDelaySec));
      setSyncError("");
      setPullCode("");
      setPairingCode(syncService.getPairingCode());
      setSyncStatus(syncService.getStatus());
      const last = readLastSync();
      if (last?.code) {
        setUploadedCode(last.code);
        setUploadedHost(last.host || "");
      }
    }
  }, [settings.autoAdvanceDelaySec, settingsOpen]);

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

  async function handleUploadSync() {
    setSyncBusy(true);
    setSyncError("");
    setSyncMessage("");
    try {
      const result = await pushSyncData();
      const host = window.location.host;
      setUploadedCode(result.code);
      setUploadedHost(host);
      writeLastSync({ code: result.code, host, backend: result.backend });
      await syncService.establishHost(result.code, {
        push: false,
        remoteUpdatedAt: result.updatedAt || Date.now(),
      });
      setPairingCode(formatPairingCode(result.code));
      const expires = new Date(result.expiresAt).toLocaleString("zh-CN");
      const copied = await copyText(result.code);
      if (result.backend === "memory") {
        setSyncMessage(
          `配对码 ${result.code}（仅 ${host} 开发环境有效）· 至 ${expires}${
            copied ? " · 已复制" : ""
          } · 本机已开启实时同步`
        );
      } else {
        setSyncMessage(
          `配对码 ${result.code} · 至 ${expires}${copied ? " · 已复制" : ""} · 另一台设备输入此码即可双向实时同步`
        );
      }
    } catch (err) {
      setSyncError(err.message || "上传失败，请稍后重试");
    } finally {
      setSyncBusy(false);
    }
  }

  async function handleLinkSync() {
    const code = normalizePairingCode(pullCode);
    if (code.length !== 8) {
      setSyncError("请输入 8 位配对码");
      return;
    }

    setSyncBusy(true);
    setSyncError("");
    setSyncMessage("");
    try {
      const merged = await syncService.linkDevice(code);
      setPairingCode(formatPairingCode(code));
      setSyncMessage(
        merged
          ? "已与云端进度合并，正在实时同步"
          : "已连接配对码，两台设备进度将自动双向同步"
      );
    } catch (err) {
      const host = window.location.host;
      const last = readLastSync();
      const hints = [
        "请确认源设备已点击「生成配对码」",
        `两台设备须打开同一网址（当前 ${host}）`,
        "请核对配对码是否抄写正确",
      ];
      if (last?.host && last.host !== host) {
        hints.unshift(`本机曾从 ${last.host} 上传，与当前 ${host} 不一致`);
      }
      setSyncError(`${err.message || "连接失败"}。${hints.join("；")}。`);
    } finally {
      setSyncBusy(false);
    }
  }

  function handleUnlink() {
    syncService.unlink();
    setPairingCode("");
    setSyncMessage("已解除实时同步");
    setSyncError("");
  }

  async function handleCopyCode() {
    const code = pairingCode || uploadedCode;
    if (!code) return;
    const ok = await copyText(code);
    setSyncMessage(ok ? `已复制 ${code}` : "复制失败，请手动复制");
    setSyncError("");
  }

  if (!settingsOpen) return null;

  return (
    <div className="settings-overlay" onClick={() => setSettingsOpen(false)}>
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
          </div>
        </details>

        <details className="settings-group">
          <summary className="settings-group__summary">
            <span className="settings-group__title">进度同步</span>
            <span className="settings-group__meta">
              熟词 {syncSummary.recognized} · 生词 {syncSummary.unrecognized}
            </span>
          </summary>
          <div className="settings-group__body">
            <p className="settings-hint settings-hint--compact">
              电脑与手机须打开同一网址（如 toefl-6666.vercel.app）。配对后两台设备会每 5 秒自动双向合并进度，无需刷新页面。
            </p>

            {pairingCode ? (
              <div className="settings-sync-card settings-sync-card--active">
                <div className="settings-sync-card__head">
                  <strong>实时同步中</strong>
                  <span>{syncStatus.message || `配对码 ${pairingCode}`}</span>
                </div>
                <p className="settings-sync-code">
                  <span className="sync-code-badge">{pairingCode}</span>
                  <button
                    type="button"
                    className="settings-action-btn settings-action-btn--inline"
                    onClick={handleCopyCode}
                  >
                    复制
                  </button>
                </p>
                <button
                  type="button"
                  className="settings-action-btn settings-action-btn--block"
                  onClick={handleUnlink}
                  disabled={syncBusy}
                >
                  解除配对
                </button>
              </div>
            ) : null}

            <div className="settings-sync-card">
              <div className="settings-sync-card__head">
                <strong>生成配对码</strong>
                <span>在本机上传进度并开启实时同步</span>
              </div>
              <button
                type="button"
                className="settings-action-btn settings-action-btn--primary settings-action-btn--block"
                onClick={handleUploadSync}
                disabled={syncBusy}
              >
                {syncBusy ? "处理中…" : "生成配对码"}
              </button>
              {uploadedCode && !pairingCode ? (
                <p className="settings-sync-code">
                  <span className="sync-code-badge">{uploadedCode}</span>
                  <button
                    type="button"
                    className="settings-action-btn settings-action-btn--inline"
                    onClick={handleCopyCode}
                  >
                    复制
                  </button>
                </p>
              ) : null}
              {uploadedHost ? (
                <p className="settings-hint settings-hint--compact">上次上传站点：{uploadedHost}</p>
              ) : null}
            </div>

            <div className="settings-sync-card">
              <div className="settings-sync-card__head">
                <strong>连接配对码</strong>
                <span>输入另一台设备的配对码，合并并持续同步</span>
              </div>
              <input
                className="settings-sync-input"
                type="text"
                value={pullCode}
                onChange={(e) => setPullCode(formatPairingCode(e.target.value))}
                placeholder="XXXX-XXXX"
                autoComplete="off"
                spellCheck={false}
                maxLength={9}
              />
              <button
                type="button"
                className="settings-action-btn settings-action-btn--block"
                onClick={handleLinkSync}
                disabled={syncBusy}
              >
                输入配对码并实时同步
              </button>
            </div>

            {syncMessage && <p className="settings-status settings-status--ok">{syncMessage}</p>}
            {syncError && <p className="settings-status settings-status--error">{syncError}</p>}
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
      </aside>
    </div>
  );
}
