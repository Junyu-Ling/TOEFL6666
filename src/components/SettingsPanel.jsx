import { useSettings } from "../context/SettingsContext";

export default function SettingsPanel() {
  const {
    settings,
    systemVoices,
    settingsOpen,
    setSettingsOpen,
    setTheme,
    setSystemVoiceURI,
    setAutoReadOnNewWord,
  } = useSettings();

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
