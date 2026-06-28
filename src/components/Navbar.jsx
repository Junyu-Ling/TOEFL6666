import { useSettings } from "../context/SettingsContext";

const TABS = [
  { id: "practice", label: "练习" },
  { id: "unrecognized", label: "生词本" },
  { id: "recognized", label: "熟词本" },
];

export default function Navbar({ activeTab, onTabChange, counts }) {
  const { setSettingsOpen } = useSettings();

  return (
    <nav className="navbar">
      <div className="navbar__brand">
        <strong>TOEFL6·6·6·6</strong>
      </div>

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
    </nav>
  );
}
