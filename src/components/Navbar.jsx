import { useSettings } from "../context/SettingsContext";
import { APP_MODE_LABELS, getAlternateAppMode } from "../utils/appMode";

const TABS = [
  { id: "practice", label: "练习" },
  { id: "bank", label: "词库" },
  { id: "lexgrid", label: "词格" },
  { id: "unrecognized", label: "生词本" },
  { id: "recognized", label: "熟词本" },
  { id: "reading-vocab", label: "阅读词汇" },
];

export default function Navbar({ activeTab, onTabChange, counts, streak, onStreakClick, onExamModeSwitch }) {
  const { settings, setSettingsOpen } = useSettings();
  const appMode = settings.appMode ?? "toefl";
  const alternateMode = getAlternateAppMode(appMode);
  const loggedInToday = streak?.loggedInToday;

  return (
    <nav className="navbar">
      <button
        type="button"
        className="navbar__brand"
        onClick={() => onExamModeSwitch?.(alternateMode)}
        aria-label={`当前 ${APP_MODE_LABELS[appMode]}，点击切换到 ${APP_MODE_LABELS[alternateMode]}`}
        title={`切换到 ${APP_MODE_LABELS[alternateMode]}`}
      >
        <span className="navbar__brand-icon" aria-hidden>
          {appMode === "sat" ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12 3a7 7 0 100 14 7 7 0 000-14zm0 16a9 9 0 010-18 9 9 0 010 18z" opacity="0.35" />
              <path d="M12 2.5a1 1 0 011 1v1.2a1 1 0 11-2 0V3.5a1 1 0 011-1zm0 15.3a1 1 0 011 1v1.2a1 1 0 11-2 0v-1.2a1 1 0 011-1zM4.8 12a1 1 0 011-1h1.2a1 1 0 110 2H5.8a1 1 0 01-1-1zm15.2 0a1 1 0 011-1h1.2a1 1 0 110 2h-1.2a1 1 0 01-1-1zM6.4 6.4a1 1 0 011.4 0l.85.85a1 1 0 11-1.42 1.42l-.85-.85a1 1 0 010-1.42zm10.9 10.9a1 1 0 011.4 0l.85.85a1 1 0 11-1.42 1.42l-.85-.85a1 1 0 010-1.42zM17.6 6.4a1 1 0 010 1.42l-.85.85a1 1 0 11-1.42-1.42l.85-.85a1 1 0 011.42 0zM7.25 17.25a1 1 0 010 1.42l-.85.85a1 1 0 11-1.42-1.42l.85-.85a1 1 0 011.42 0z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <circle cx="12" cy="12" r="4.5" />
              <path d="M12 1.5v2.2M12 20.3v2.2M4.2 4.2l1.55 1.55M18.25 18.25l1.55 1.55M1.5 12h2.2M20.3 12h2.2M4.2 19.8l1.55-1.55M18.25 5.75l1.55-1.55" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            </svg>
          )}
        </span>
        <strong>{APP_MODE_LABELS[appMode]}</strong>
        <span className="navbar__brand-hint" aria-hidden>⇄</span>
      </button>

      <div className="navbar__tabs">
        {TABS.map((tab) => (
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
          className="navbar__settings"
          onClick={() => setSettingsOpen(true)}
          aria-label="打开设置"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm9.4 4a7.4 7.4 0 01-.1 1l2 1.5-2 3.5-2.3-.9a7.6 7.6 0 01-2.6 1.5l-.4 2.5H9.9l-.4-2.5a7.6 7.6 0 01-2.6-1.5l-2.3.9-2-3.5 2-1.5a7.4 7.4 0 010-2l-2-1.5 2-3.5 2.3.9a7.6 7.6 0 012.6-1.5l.4-2.5h4.2l.4 2.5a7.6 7.6 0 012.6 1.5l2.3-.9 2 3.5-2 1.5c.07.3.1.7.1 1z" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
