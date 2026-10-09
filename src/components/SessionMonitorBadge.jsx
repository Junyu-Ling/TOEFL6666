import { memo } from "react";

function SessionMonitorBadge({ visible, watching }) {
  if (!visible) return null;
  return (
    <div
      className={`session-monitor-badge${watching ? " session-monitor-badge--live" : ""}`}
      role="status"
      aria-live="polite"
    >
      {watching ? "正在向管理员共享页面" : "管理员可查看当前页面"}
    </div>
  );
}

export default memo(SessionMonitorBadge);
