import { useMemo, useState } from "react";
import {
  STREAK_MILESTONES,
  EXAM_TYPES,
  toDateKey,
  parseDateKey,
  getMonthGrid,
  getNextMilestone,
  getExamsOnDate,
  getUpcomingExams,
  formatCountdown,
  setExamMark,
  clearExamMark,
} from "../services/streak";

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

export default function StreakPanel({ open, onClose, streak, onStreakChange }) {
  const today = useMemo(() => toDateKey(), []);
  const todayDate = useMemo(() => parseDateKey(today), [today]);
  const [viewMonth, setViewMonth] = useState(() => ({
    year: todayDate.getFullYear(),
    month: todayDate.getMonth(),
  }));
  const [selectedDate, setSelectedDate] = useState(null);

  const loginSet = useMemo(() => new Set(streak.loginDates ?? []), [streak.loginDates]);
  const examMarks = streak.examMarks ?? {};
  const upcomingExams = useMemo(() => getUpcomingExams(examMarks), [examMarks]);
  const monthCells = useMemo(
    () => getMonthGrid(viewMonth.year, viewMonth.month),
    [viewMonth.year, viewMonth.month]
  );

  const nextMilestone = getNextMilestone(streak.currentStreak ?? 0);
  const daysToNext = nextMilestone ? nextMilestone.days - (streak.currentStreak ?? 0) : 0;
  const selectedExams = selectedDate ? getExamsOnDate(examMarks, selectedDate) : [];

  function shiftMonth(delta) {
    setViewMonth((prev) => {
      const date = new Date(prev.year, prev.month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
    setSelectedDate(null);
  }

  function handleMarkExam(type) {
    if (!selectedDate) return;
    onStreakChange?.(setExamMark(type, selectedDate));
    setSelectedDate(null);
  }

  function handleClearExam(type) {
    onStreakChange?.(clearExamMark(type));
    setSelectedDate(null);
  }

  if (!open) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <aside className="streak-panel" onClick={(e) => e.stopPropagation()}>
        <header className="streak-panel__header">
          <div>
            <h2>学习日历</h2>
            <p className="streak-panel__subtitle">每天打开应用点亮火苗 · 点击日期标记考试</p>
          </div>
          <button type="button" className="settings-panel__close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>

        <section className="streak-panel__stats">
          <div className="streak-stat streak-stat--primary">
            <span className="streak-stat__emoji" aria-hidden>
              🔥
            </span>
            <div className="streak-stat__body">
              <strong className="streak-stat__value">{streak.currentStreak ?? 0}</strong>
              <span className="streak-stat__label">连续天数</span>
            </div>
          </div>
          <div className="streak-stat">
            <strong>{streak.longestStreak ?? 0}</strong>
            <span>最长连续</span>
          </div>
          <div className="streak-stat">
            <strong>{streak.totalDays ?? 0}</strong>
            <span>累计打卡</span>
          </div>
        </section>

        {streak.loggedInToday && (
          <p className="streak-panel__today-badge">今日已打卡 · 火苗已点亮</p>
        )}

        {upcomingExams.length > 0 && (
          <section className="streak-exams">
            <h3>考试提醒</h3>
            <ul className="streak-exams__list">
              {upcomingExams.map((exam) => (
                <li
                  key={exam.id}
                  className={`streak-exam streak-exam--${exam.id} ${exam.daysLeft <= 7 ? "streak-exam--soon" : ""}`}
                >
                  <span className="streak-exam__emoji">{exam.emoji}</span>
                  <div className="streak-exam__body">
                    <strong>{exam.label}考试</strong>
                    <span>{exam.dateKey}</span>
                  </div>
                  <span className="streak-exam__countdown">{formatCountdown(exam.dateKey)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {nextMilestone && (
          <p className="streak-panel__next">
            再坚持 <strong>{daysToNext}</strong> 天，解锁「{nextMilestone.emoji} {nextMilestone.title}」
          </p>
        )}

        <section className="streak-calendar">
          <div className="streak-calendar__nav">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => shiftMonth(-1)}>
              ‹
            </button>
            <h3>
              {viewMonth.year} 年 {viewMonth.month + 1} 月
            </h3>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => shiftMonth(1)}>
              ›
            </button>
          </div>

          <div className="streak-calendar__weekdays">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="streak-calendar__grid">
            {monthCells.map((dateKey, index) => {
              if (!dateKey) {
                return <span key={`empty-${index}`} className="streak-day streak-day--empty" />;
              }

              const logged = loginSet.has(dateKey);
              const exams = getExamsOnDate(examMarks, dateKey);
              const isToday = dateKey === today;
              const isFuture = dateKey > today;
              const isSelected = dateKey === selectedDate;
              const dayNum = parseDateKey(dateKey).getDate();

              return (
                <button
                  key={dateKey}
                  type="button"
                  className={[
                    "streak-day",
                    logged && "streak-day--logged",
                    exams.length > 0 && "streak-day--exam",
                    isToday && "streak-day--today",
                    isFuture && "streak-day--future",
                    isSelected && "streak-day--selected",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setSelectedDate((prev) => (prev === dateKey ? null : dateKey))}
                  title={
                    exams.length
                      ? `${dateKey} · ${exams.map((e) => e.label).join("、")}`
                      : logged
                        ? `${dateKey} 已打卡`
                        : dateKey
                  }
                >
                  <span className="streak-day__num">{dayNum}</span>
                  <span className="streak-day__marks">
                    {logged && <span className="streak-day__flame">🔥</span>}
                    {exams.map((exam) => (
                      <span key={exam.id} className={`streak-day__exam streak-day__exam--${exam.id}`}>
                        {exam.short}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedDate && (
            <div className="streak-mark-menu">
              <p className="streak-mark-menu__title">
                标记 <strong>{selectedDate}</strong>
              </p>
              <div className="streak-mark-menu__actions">
                {Object.values(EXAM_TYPES).map((exam) => (
                  <button
                    key={exam.id}
                    type="button"
                    className={`btn btn--ghost btn--sm streak-mark-btn streak-mark-btn--${exam.id}`}
                    onClick={() => handleMarkExam(exam.id)}
                  >
                    {exam.emoji} {exam.label}考试
                  </button>
                ))}
              </div>
              {selectedExams.length > 0 && (
                <div className="streak-mark-menu__clear">
                  {selectedExams.map((exam) => (
                    <button
                      key={exam.id}
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => handleClearExam(exam.id)}
                    >
                      清除{exam.label}标记
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <section className="streak-milestones">
          <h3>连续打卡奖励</h3>
          <ul className="streak-milestones__list">
            {STREAK_MILESTONES.map((milestone) => {
              const unlocked = (streak.longestStreak ?? 0) >= milestone.days;
              return (
                <li
                  key={milestone.days}
                  className={`streak-milestone ${unlocked ? "streak-milestone--unlocked" : ""}`}
                >
                  <span className="streak-milestone__emoji">{milestone.emoji}</span>
                  <div className="streak-milestone__body">
                    <strong>{milestone.title}</strong>
                    <span>{milestone.desc}</span>
                  </div>
                  <span className="streak-milestone__days">{milestone.days} 天</span>
                </li>
              );
            })}
          </ul>
        </section>
      </aside>
    </div>
  );
}
