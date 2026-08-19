import { useEffect, useState } from "react";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { APP_MODE_LABELS, getAlternateAppMode, isTabAvailableInMode } from "../utils/appMode";
import { syncService, SYNC_STATUS_EVENT } from "../services/syncService";

const TABS = [
  { id: "practice", label: "练习" },
  { id: "bank", label: "词库" },
  { id: "lexgrid", label: "词格" },
  { id: "unrecognized", label: "生词本" },
  { id: "recognized", label: "熟词本" },
  { id: "sat-vocab", label: "SAT词汇" },
  { id: "transition-words", label: "过渡词" },
  { id: "familiar-obscure", label: "熟词僻义" },
  { id: "reading-vocab", label: "阅读词汇" },
  { id: "reading-fill", label: "阅读填词" },
];

export default function Navbar({ activeTab, onTabChange, counts, streak, onStreakClick, onExamModeSwitch, onLoginClick }) {
  const { settings, setSettingsOpen } = useSettings();
  const { user, syncing, signOut } = useAuth();
  const appMode = settings.appMode ?? "toefl";
  const alternateMode = getAlternateAppMode(appMode);
  const loggedInToday = streak?.loggedInToday;
  const [paired, setPaired] = useState(() => syncService.isPaired());
  const [pairingCode, setPairingCode] = useState(() => syncService.getPairingCode());

  useEffect(() => {
    function onStatus(event) {
      const detail = event.detail || syncService.getStatus();
      setPaired(syncService.isPaired());
      setPairingCode(detail.code || syncService.getPairingCode());
    }
    window.addEventListener(SYNC_STATUS_EVENT, onStatus);
    return () => window.removeEventListener(SYNC_STATUS_EVENT, onStatus);
  }, []);

  const settingsTitle = paired
    ? `打开设置 · 已配对 ${pairingCode}`
    : "打开设置";

  return (
    <nav className="navbar">
      <button
        type="button"
        className="navbar__brand"
        onClick={() => onExamModeSwitch?.(alternateMode)}
        aria-label={`当前 ${APP_MODE_LABELS[appMode]}，点击切换到 ${APP_MODE_LABELS[alternateMode]}`}
        title={`切换到 ${APP_MODE_LABELS[alternateMode]}`}
      >
        <strong>{APP_MODE_LABELS[appMode]}</strong>
        <span className="navbar__brand-hint" aria-hidden>⇄</span>
      </button>

      <div className="navbar__tabs">
        {TABS.filter((tab) => isTabAvailableInMode(tab.id, appMode)).map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`navbar__tab ${activeTab === tab.id ? "navbar__tab--active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
            {tab.id === "unrecognized" && counts.unrecognized > 0 && (
              <span className="navbar__badge">{counts.unrecognized}</span>
            )}
            {tab.id === "recognized" && counts.recognized > 0 && (
              <span className="navbar__badge navbar__badge--green">{counts.recognized}</span>
            )}
          </button>
        ))}
      </div>

      <div className="navbar__actions">
        {user ? (
          <button
            type="button"
            className="navbar__user"
            onClick={signOut}
            title={`已登录：${user.phone ?? user.email ?? ""}\n点击退出登录`}
            aria-label="用户账号，点击退出"
          >
            <span className="navbar__user-avatar" aria-hidden>👤</span>
            <span className="navbar__user-phone">
              {syncing ? "同步中…" : (user.phone ? user.phone.slice(-4) : "已登录")}
            </span>
          </button>
        ) : (
          <button
            type="button"
            className="navbar__login"
            onClick={onLoginClick}
            aria-label="登录账号"
            title="登录/注册"
          >
            登录
          </button>
        )}

        <button
          type="button"
          className={`navbar__streak ${loggedInToday ? "navbar__streak--active" : ""}`}
          onClick={onStreakClick}
          aria-label={`连续学习 ${streak?.currentStreak ?? 0} 天，打开学习日历`}
        >
          <span className="navbar__streak-flame" aria-hidden>
            <span className="navbar__streak-flame-inner">🔥</span>
          </span>
          <span className="navbar__streak-count">{streak?.currentStreak ?? 0}</span>
          <span className="navbar__streak-label">天</span>
        </button>

        <button
          type="button"
          className={`navbar__settings ${paired ? "navbar__settings--synced" : ""}`}
          onClick={() => setSettingsOpen(true)}
          aria-label={settingsTitle}
          title={settingsTitle}
        >
          {paired ? <span className="navbar__settings-dot" aria-hidden /> : null}
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm9.4 4a7.4 7.4 0 01-.1 1l2 1.5-2 3.5-2.3-.9a7.6 7.6 0 01-2.6 1.5l-.4 2.5H9.9l-.4-2.5a7.6 7.6 0 01-2.6-1.5l-2.3.9-2-3.5 2-1.5a7.4 7.4 0 010-2l-2-1.5 2-3.5 2.3.9a7.6 7.6 0 012.6-1.5l.4-2.5h4.2l.4 2.5a7.6 7.6 0 012.6 1.5l2.3-.9 2 3.5-2 1.5c.07.3.1.7.1 1z" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
