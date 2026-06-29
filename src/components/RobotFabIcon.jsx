export default function RobotFabIcon({ className = "" }) {
  return (
    <svg
      className={`robot-fab-icon ${className}`.trim()}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <rect x="29" y="11" width="6" height="9" rx="3" fill="white" />
      <circle cx="32" cy="10" r="4.5" fill="white" />
      <circle cx="13" cy="33" r="5.5" fill="white" />
      <circle cx="51" cy="33" r="5.5" fill="white" />
      <rect x="15" y="19" width="34" height="27" rx="13.5" fill="white" />
      <path d="M27.5 46h9l4.5 8.5-9 0.5z" fill="white" />
      <ellipse className="robot-fab-icon__eye" cx="24.5" cy="32" rx="3.6" ry="5.8" fill="#2f80ed" />
      <ellipse className="robot-fab-icon__eye robot-fab-icon__eye--right" cx="39.5" cy="32" rx="3.6" ry="5.8" fill="#2f80ed" />
    </svg>
  );
}
