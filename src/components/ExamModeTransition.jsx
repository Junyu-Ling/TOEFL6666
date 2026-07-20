import { useEffect } from "react";
import { APP_MODE_LABELS } from "../utils/appMode";

const DURATION_MS = 900;

export default function ExamModeTransition({ fromMode, toMode, onComplete }) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onComplete?.();
    }, DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  const toSat = toMode === "sat";

  return (
    <div
      className={`exam-transition ${toSat ? "exam-transition--to-sat" : "exam-transition--to-toefl"}`}
      role="status"
      aria-live="polite"
      aria-label={`正在切换到 ${APP_MODE_LABELS[toMode]}`}
    >
      <div className="exam-transition__sky" aria-hidden />
      <div className="exam-transition__stars" aria-hidden />
      <div className="exam-transition__ring" aria-hidden />

      <div className="exam-transition__stage">
        <div className="exam-transition__celestial" aria-hidden>
          <span className="exam-transition__sun">☀</span>
          <span className="exam-transition__moon">🌙</span>
        </div>

        <p className="exam-transition__from">{APP_MODE_LABELS[fromMode]}</p>
        <p className="exam-transition__to">{APP_MODE_LABELS[toMode]}</p>
      </div>
    </div>
  );
}
