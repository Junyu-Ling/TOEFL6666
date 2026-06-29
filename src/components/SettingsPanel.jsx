import { useState, useEffect, useMemo } from "react";
import { useSettings } from "../context/SettingsContext";
import { detectProvider } from "../shared/ai-providers";
import {
  exportLocalData,
  formatPairingCode,
  generatePairingCode,
  getSyncSummary,
  importLocalData,
  normalizePairingCode,
} from "../shared/sync";
import { pullSyncPayload, pushSyncPayload } from "../services/syncApi";

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
    updateAiApiSettings,
  } = useSettings();

  const [delayDraft, setDelayDraft] = useState(String(settings.autoAdvanceDelaySec));
  const [showApiKey, setShowApiKey] = useState(false);
  const [syncCodeDraft, setSyncCodeDraft] = useState("");
  const [uploadedCode, setUploadedCode] = useState("");
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncError, setSyncError] = useState("");

  const syncSummary = useMemo(() => getSyncSummary(), [settingsOpen]);

  const detectedProvider = useMemo(
    () => detectProvider(settings.aiApiKey),
    [settings.aiApiKey]
  );

  useEffect(() => {
    if (settingsOpen) {
      setDelayDraft(String(settings.autoAdvanceDelaySec));
      setSyncCodeDraft("");
      setUploadedCode("");
      setSyncMessage("");
      setSyncError("");
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

  function handleApiKeyChange(value) {
    updateAiApiSettings({ aiApiKey: value });
  }

  async function handleUploadSync() {
    setSyncBusy(true);
    setSyncError("");
    setSyncMessage("");
    try {
      const customCode = normalizePairingCode(syncCodeDraft);
      const result = await pushSyncPayload(exportLocalData(), customCode || undefined);
      setUploadedCode(result.code);
      const expires = new Date(result.expiresAt).toLocaleString("zh-CN");
      setSyncMessage(
        result.backend === "memory"
          ? `已生成配对码（开发模式，仅本机有效）。有效期至 ${expires}`
          : `已上传。配对码 7 天内有效，至 ${expires}`
      );
    } catch (err) {
      setSyncError(err.message || "上传失败");
    } finally {
      setSyncBusy(false);
    }
  }

  async function handlePullSync() {
    const code = normalizePairingCode(syncCodeDraft);
    if (code.length !== 8) {
      setSyncError("请输入 8 位配对码");
      return;
    }
    if (
      !window.confirm(
        "将用云端进度覆盖本机所有学习数据（API Key 会保留）。确定继续吗？"
      )
    ) {
      return;
    }

    setSyncBusy(true);
    setSyncError("");
    setSyncMessage("");
    try {
      const result = await pullSyncPayload(code);
      importLocalData(result.payload);
      window.location.reload();
    } catch (err) {
      setSyncError(err.message || "拉取失败");
      setSyncBusy(false);
    }
  }

  function handleGenerateCodeOnly() {
    setSyncCodeDraft(generatePairingCode());
    setUploadedCode("");
    setSyncMessage("已生成配对码，点击「上传本机进度」后才会生效");
    setSyncError("");
  }

  if (!settingsOpen) return null;

  return (
    <div className="settings-overlay" onClick={() => setSettingsOpen(false)}>
      <aside className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <header className="settings-panel__header">
          <h2>设置</h2>
          <button type="button" className="settings-panel__close" onClick={() => setSettingsOpen(false)}>
            ×
          </button>
        </header>

        <section className="settings-section">
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

        <section className="settings-section">
          <h3>练习</h3>
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
            <p className="settings-hint settings-hint--compact">
              {settings.practiceStyle === "recall"
                ? "默认不聚焦输入框，空格/Enter 翻面核对；需要时仍可点输入框打字批改"
                : "新词自动聚焦输入框（蓝色高亮），可直接打字，Enter 提交批改"}
            </p>
          </div>
          <label className="settings-toggle-row settings-toggle-row--spaced">
            <span className="settings-toggle-row__text">
              <strong>切换单词时自动朗读</strong>
              <small>关闭后仅在你点击发音按钮时朗读</small>
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
          <label className="settings-toggle-row settings-toggle-row--spaced">
            <span className="settings-toggle-row__text">
              <strong>切换单词时自动开麦</strong>
              <small>进入新词后自动开始语音输入，说完停顿 2 秒提交批改</small>
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
          <label className="settings-toggle-row settings-toggle-row--spaced">
            <span className="settings-toggle-row__text">
              <strong>翻面后自动下一个</strong>
              <small>查看背面释义或批改结果后，按设定时间自动切到下一词</small>
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
            <label className="settings-field settings-field--spaced">
              <span>翻面后停留时间（0–60 秒）</span>
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
        </section>

        <section className="settings-section">
          <h3>AI API</h3>
          <p className="settings-hint">
            粘贴 API Key 即可，自动识别厂商并用于批改与助教。留空则使用网站默认配置。Key 仅保存在本机。
          </p>
          <label className="settings-field">
            <span>API Key</span>
            <div className="settings-field-row settings-field-row--key">
              <input
                type={showApiKey ? "text" : "password"}
                value={settings.aiApiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="粘贴 Key，自动识别厂商"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                className="settings-action-btn"
                onClick={() => setShowApiKey((v) => !v)}
              >
                {showApiKey ? "隐藏" : "显示"}
              </button>
            </div>
          </label>
          {settings.aiApiKey.trim() && (
            <p className="settings-status settings-status--ok">
              {detectedProvider ? (
                <>
                  已识别为
                  <span className="ai-provider-badge">{detectedProvider.name}</span>
                  ，将自动调用
                </>
              ) : (
                "已保存 Key，将按 OpenAI 兼容接口调用"
              )}
            </p>
          )}
        </section>

        <section className="settings-section">
          <h3>进度同步</h3>
          <p className="settings-hint">
            用配对码在电脑与手机间同步学习进度（熟词本、生词本、列表进度、打卡、设置等）。
            配对码相当于密码，请勿泄露。上传后 7 天内可在另一台设备输入配对码恢复。
          </p>
          <p className="settings-hint settings-hint--compact">
            本机：熟词 {syncSummary.recognized} · 生词 {syncSummary.unrecognized}
            {syncSummary.listCount > 0 ? ` · ${syncSummary.listCount} 个列表有进度` : ""}
          </p>

          <label className="settings-field">
            <span>配对码</span>
            <div className="settings-field-row settings-field-row--key">
              <input
                type="text"
                value={syncCodeDraft}
                onChange={(e) => setSyncCodeDraft(formatPairingCode(e.target.value))}
                placeholder="留空自动生成，或输入自定义 8 位"
                autoComplete="off"
                spellCheck={false}
                maxLength={9}
              />
              <button
                type="button"
                className="settings-action-btn"
                onClick={handleGenerateCodeOnly}
                disabled={syncBusy}
              >
                生成
              </button>
            </div>
          </label>

          {uploadedCode && (
            <p className="settings-status settings-status--ok">
              当前配对码：<span className="sync-code-badge">{uploadedCode}</span>
            </p>
          )}

          <div className="settings-actions settings-actions--spaced">
            <button
              type="button"
              className="settings-action-btn settings-action-btn--primary"
              onClick={handleUploadSync}
              disabled={syncBusy}
            >
              {syncBusy ? "处理中…" : "上传本机进度"}
            </button>
            <button
              type="button"
              className="settings-action-btn"
              onClick={handlePullSync}
              disabled={syncBusy}
            >
              从配对码恢复
            </button>
          </div>

          {syncMessage && <p className="settings-status settings-status--ok">{syncMessage}</p>}
          {syncError && <p className="settings-status settings-status--error">{syncError}</p>}
        </section>

        <section className="settings-section">
          <h3>朗读音色</h3>
          <p className="settings-hint">使用系统预设英文语音朗读单词，可在下方选择具体音色。</p>
          <label className="settings-field">
            <span>预设声音</span>
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
        </section>
      </aside>
    </div>
  );
}
