import { useState, useEffect, useMemo } from "react";
import { useSettings } from "../context/SettingsContext";
import { AI_PROVIDERS, buildProviderDefaults, detectProvider, getProviderById } from "../shared/ai-providers";

function clampDelayInput(value) {
  const n = Number(String(value).trim());
  if (!Number.isFinite(n)) return null;
  return Math.min(60, Math.max(0, Math.round(n)));
}

function applyProviderDefaults(settings, { apiKey, baseUrl, providerId } = {}) {
  const key = (apiKey ?? settings.aiApiKey).trim();
  const url = (baseUrl ?? settings.aiBaseUrl).trim();
  const defaults = buildProviderDefaults(key, url, providerId ?? settings.aiProviderId);
  return {
    aiProviderId: defaults.providerId,
    aiBaseUrl: url || defaults.baseUrl,
    aiModel: settings.aiModel.trim() || defaults.model,
  };
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
    setUseCustomAiApi,
    updateAiApiSettings,
  } = useSettings();

  const [delayDraft, setDelayDraft] = useState(String(settings.autoAdvanceDelaySec));
  const [showApiKey, setShowApiKey] = useState(false);

  const detectedProvider = useMemo(
    () => detectProvider(settings.aiApiKey, settings.aiBaseUrl),
    [settings.aiApiKey, settings.aiBaseUrl]
  );

  const activeProvider = useMemo(
    () => getProviderById(settings.aiProviderId) || detectedProvider,
    [settings.aiProviderId, detectedProvider]
  );

  useEffect(() => {
    if (settingsOpen) {
      setDelayDraft(String(settings.autoAdvanceDelaySec));
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
    const nextKey = value;
    const patch = { aiApiKey: nextKey };
    if (nextKey.trim()) {
      Object.assign(patch, applyProviderDefaults(settings, { apiKey: nextKey }));
    }
    updateAiApiSettings(patch);
  }

  function handleBaseUrlChange(value) {
    const patch = { aiBaseUrl: value };
    if (value.trim() || settings.aiApiKey.trim()) {
      Object.assign(patch, applyProviderDefaults(settings, { baseUrl: value }));
    }
    updateAiApiSettings(patch);
  }

  function handleProviderChange(providerId) {
    const provider = getProviderById(providerId);
    const patch = {
      aiProviderId: providerId,
      aiBaseUrl: provider?.baseUrl || settings.aiBaseUrl,
    };
    if (!settings.aiModel.trim() && provider?.defaultModel) {
      patch.aiModel = provider.defaultModel;
    }
    updateAiApiSettings(patch);
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
          <label className="settings-toggle-row">
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
            可使用自己的 API Key 进行批改与词汇问答。Key 仅保存在本机，随请求经本站代理转发，不会写入代码仓库。
            未开启时仍使用服务端默认配置（DeepSeek 环境变量）。
          </p>
          <label className="settings-toggle-row">
            <span className="settings-toggle-row__text">
              <strong>使用自备 API</strong>
              <small>开启后批改与 AI 助教将使用下方配置</small>
            </span>
            <span className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.useCustomAiApi}
                onChange={(e) => setUseCustomAiApi(e.target.checked)}
              />
              <span className="toggle-switch__track" aria-hidden="true" />
            </span>
          </label>

          {settings.useCustomAiApi && (
            <>
              <label className="settings-field settings-field--spaced">
                <span>API Key</span>
                <div className="settings-field-row settings-field-row--key">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={settings.aiApiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder="粘贴 Key，将自动识别厂商"
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

              {(activeProvider || settings.aiApiKey.trim()) && (
                <p className="settings-status settings-status--ok">
                  识别厂商：
                  <span className="ai-provider-badge">{activeProvider?.name || "未识别"}</span>
                  {detectedProvider && settings.aiProviderId && detectedProvider.id !== settings.aiProviderId
                    ? "（已手动选择其它厂商）"
                    : ""}
                </p>
              )}

              <label className="settings-field settings-field--spaced">
                <span>厂商（可手动覆盖自动识别）</span>
                <select
                  value={settings.aiProviderId || activeProvider?.id || "custom"}
                  onChange={(e) => handleProviderChange(e.target.value)}
                >
                  {AI_PROVIDERS.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="settings-field settings-field--spaced">
                <span>Base URL</span>
                <input
                  type="url"
                  value={settings.aiBaseUrl}
                  onChange={(e) => handleBaseUrlChange(e.target.value)}
                  placeholder={activeProvider?.baseUrl || "https://api.example.com/v1"}
                  spellCheck={false}
                />
              </label>

              <label className="settings-field settings-field--spaced">
                <span>Model</span>
                <input
                  type="text"
                  value={settings.aiModel}
                  onChange={(e) => updateAiApiSettings({ aiModel: e.target.value })}
                  placeholder={activeProvider?.defaultModel || "模型名称"}
                  spellCheck={false}
                />
              </label>

              <p className="settings-hint settings-hint--compact">
                支持 OpenAI、DeepSeek、Anthropic、智谱、通义、Moonshot、硅基流动、Groq、OpenRouter、Google
                Gemini、豆包、百川、MiniMax、腾讯混元、百度千帆、Mistral、xAI、Azure OpenAI 及任意 OpenAI
                兼容接口。
              </p>
            </>
          )}
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
