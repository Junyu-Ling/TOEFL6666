import { useEffect, useRef } from "react";
import { APP_MODE_LABELS } from "../utils/appMode";

const DURATION_MS = 1100;

export default function ExamModeTransition({ fromMode, toMode, onComplete }) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onCompleteRef.current?.();
    }, DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [fromMode, toMode]);

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
          <div className="exam-transition__sun">
            <div className="exam-transition__sun-rays" />
            <div className="exam-transition__sun-core" />
          </div>
          <div className="exam-transition__moon">
            <div className="exam-transition__moon-body" />
          </div>
        </div>

        <p className="exam-transition__from">{APP_MODE_LABELS[fromMode]}</p>
        <p className="exam-transition__to">{APP_MODE_LABELS[toMode]}</p>
      </div>
    </div>
  );
}
