import { useMemo } from "react";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { APP_MODE_LABELS, getAlternateAppMode, isTabAvailableInMode } from "../utils/appMode";
import { getUserProfile } from "../utils/userProfile";
import UserAvatar from "./UserAvatar";

const TABS = [
  { id: "practice", label: "练习" },
  { id: "bank", label: "词库" },
  { id: "lexgrid", label: "词格" },
  { id: "unrecognized", label: "生词本" },
  { id: "recognized", label: "熟词本" },
  { id: "familiar-obscure", label: "熟词僻义" },
  { id: "reading-vocab", label: "阅读词汇" },
  { id: "reading-fill", label: "阅读填词" },
];

export default function Navbar({ activeTab, onTabChange, counts, streak, onStreakClick, onExamModeSwitch }) {
  const { settings, setSettingsOpen } = useSettings();
  const { user, loading: authLoading } = useAuth();
  const profile = useMemo(() => getUserProfile(user), [user]);
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
        <span className="navbar__brand-icon navbar__brand-icon--emoji" aria-hidden>
          {appMode === "sat" ? "🌙" : "☀️"}
        </span>
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
          className={`navbar__account ${profile ? "navbar__account--signed-in" : ""}`}
          onClick={() => setSettingsOpen(true)}
          aria-label={profile ? `打开账号：${profile.name}` : "登录或注册"}
          title={profile ? profile.name : "登录 / 注册"}
        >
          <UserAvatar
            name={profile?.name || "登录"}
            avatarUrl={profile?.avatarUrl}
            size={32}
            className="navbar__account-avatar"
          />
          <span className="navbar__account-name">
            {authLoading ? "…" : profile?.name || "登录"}
          </span>
        </button>
      </div>
    </nav>
  );
}
