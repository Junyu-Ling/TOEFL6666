import { useMemo, useState } from "react";
import {
  STREAK_MILESTONES,
  toDateKey,
  parseDateKey,
  getMonthGrid,
  getNextMilestone,
} from "../services/streak";

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

export default function StreakPanel({ open, onClose, streak }) {
  const today = useMemo(() => toDateKey(), []);
  const todayDate = useMemo(() => parseDateKey(today), [today]);
  const [viewMonth, setViewMonth] = useState(() => ({
    year: todayDate.getFullYear(),
    month: todayDate.getMonth(),
  }));

  const loginSet = useMemo(() => new Set(streak.loginDates ?? []), [streak.loginDates]);
  const monthCells = useMemo(
    () => getMonthGrid(viewMonth.year, viewMonth.month),
    [viewMonth.year, viewMonth.month]
  );

  const nextMilestone = getNextMilestone(streak.currentStreak ?? 0);
  const daysToNext = nextMilestone ? nextMilestone.days - (streak.currentStreak ?? 0) : 0;

  function shiftMonth(delta) {
    setViewMonth((prev) => {
      const date = new Date(prev.year, prev.month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  }

  if (!open) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <aside className="streak-panel" onClick={(e) => e.stopPropagation()}>
        <header className="streak-panel__header">
          <div>
            <h2>学习日历</h2>
            <p className="streak-panel__subtitle">每天打开应用，点亮一颗火苗</p>
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
            <div>
              <strong>{streak.currentStreak ?? 0}</strong>
              <span>连续天数</span>
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
              const isToday = dateKey === today;
              const isFuture = dateKey > today;
              const dayNum = parseDateKey(dateKey).getDate();

              return (
                <span
                  key={dateKey}
                  className={[
                    "streak-day",
                    logged && "streak-day--logged",
                    isToday && "streak-day--today",
                    isFuture && "streak-day--future",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  title={logged ? `${dateKey} 已打卡` : dateKey}
                >
                  <span className="streak-day__num">{dayNum}</span>
                  {logged && <span className="streak-day__flame">🔥</span>}
                </span>
              );
            })}
          </div>
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
