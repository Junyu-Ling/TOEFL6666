import { useEffect, useMemo, useRef, useState } from "react";
import { stopGameKeyBubble } from "../utils/appKeyboard";
import { addExamsToDeviceCalendar } from "../utils/deviceCalendar";
import {
  copyCalendarFeedUrl,
  getGoogleSubscribeUrl,
  getOutlookSubscribeUrl,
  syncStudyCalendarNow,
} from "../services/calendarSync";
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
  addExamMark,
  removeExamMark,
  enableIcsCalendarSync,
} from "../services/streak";

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

const NAV_ITEMS = [
  { id: "calendar", label: "日历", hint: "点日期标记托福或 SAT 考试，可以把这场考试加到电脑日历。" },
  { id: "exams", label: "考试", hint: "已标记的考试可以加到 Windows / Mac 日历；AI 会按最近一场托福倒计时排计划。" },
  { id: "rewards", label: "奖励", hint: "连续打卡会解锁这些称号。" },
];

export default function StreakPanel({ open, onClose, streak, onStreakChange }) {
  const today = useMemo(() => toDateKey(), []);
  const todayDate = useMemo(() => parseDateKey(today), [today]);
  const panelRef = useRef(null);
  const [section, setSection] = useState("calendar");
  const [syncNote, setSyncNote] = useState("");
  const [viewMonth, setViewMonth] = useState(() => ({
    year: todayDate.getFullYear(),
    month: todayDate.getMonth(),
  }));
  const [selectedDate, setSelectedDate] = useState(null);

  const loginSet = useMemo(() => new Set(streak.loginDates ?? []), [streak.loginDates]);
  const examMarks = streak.examMarks ?? [];
  const upcomingExams = useMemo(
    () => getUpcomingExams(examMarks).filter((exam) => exam.daysLeft >= 0),
    [examMarks]
  );
  const monthCells = useMemo(
    () => getMonthGrid(viewMonth.year, viewMonth.month),
    [viewMonth.year, viewMonth.month]
  );

  const nextMilestone = getNextMilestone(streak.currentStreak ?? 0);
  const daysToNext = nextMilestone ? nextMilestone.days - (streak.currentStreak ?? 0) : 0;
  const selectedExams = selectedDate ? getExamsOnDate(examMarks, selectedDate) : [];
  const currentNav = NAV_ITEMS.find((item) => item.id === section) || NAV_ITEMS[0];
  const calendarSync = streak.calendarSync || {};
  const icsEnabled = Boolean(calendarSync.icsEnabled && calendarSync.token);

  async function publishExamCalendar(nextStreak = streak) {
    try {
      await syncStudyCalendarNow(nextStreak);
    } catch (err) {
      setSyncNote(err.message || "电脑日历更新失败");
    }
  }

  function handleMarkExam(type) {
    if (!selectedDate) return;
    let next = addExamMark(type, selectedDate);
    if (!next.calendarSync?.icsEnabled) {
      next = enableIcsCalendarSync();
    }
    onStreakChange?.(next);
    addExamsToDeviceCalendar({ type, dateKey: selectedDate });
    setSyncNote("已把这场考试加到电脑日历，可在下载的日历文件里打开。");
    publishExamCalendar(next);
  }

  async function handleSyncExamsToDevice() {
    if (!upcomingExams.length) return;
    const next = enableIcsCalendarSync();
    onStreakChange?.(next);
    addExamsToDeviceCalendar(upcomingExams);
    setSyncNote("已下载考试日历。再用下面的订阅，电脑日历会跟着新的标记更新。");
    await publishExamCalendar(next);
  }

  async function handleCopyFeed() {
    const next = enableIcsCalendarSync();
    onStreakChange?.(next);
    const ok = await copyCalendarFeedUrl(next.calendarSync?.token).catch(() => false);
    setSyncNote(ok ? "订阅链接已复制，可粘贴到 Windows 日历的“从网络订阅”。" : "复制失败，请手动订阅 Outlook 或 Google 日历。");
    await publishExamCalendar(next);
  }

  useEffect(() => {
    if (!open || !panelRef.current) return;
    panelRef.current.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function shiftMonth(delta) {
    setViewMonth((prev) => {
      const date = new Date(prev.year, prev.month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
    setSelectedDate(null);
  }

  function handleRemoveExam(id) {
    const next = removeExamMark(id);
    onStreakChange?.(next);
    if (next.calendarSync?.icsEnabled) {
      setSyncNote("已移除这场考试，订阅的电脑日历会随后更新。");
      publishExamCalendar(next);
    }
  }

  if (!open) return null;

  return (
    <div className="settings-overlay" lang="zh-CN" onKeyDown={stopGameKeyBubble}>
      <div
        ref={panelRef}
        tabIndex={-1}
        className="settings-shell streak-panel"
        role="dialog"
        aria-modal="true"
        aria-label="学习日历"
      >
        <aside className="settings-nav">
          <nav className="settings-nav__list" aria-label="学习日历分类">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`settings-nav__item${item.id === section ? " settings-nav__item--active" : ""}`}
                onClick={() => setSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="settings-main">
          <header className="settings-main__header">
            <div>
              <h2>{currentNav.label}</h2>
              <p>{currentNav.hint}</p>
            </div>
            <button type="button" className="settings-panel__close" onClick={onClose} aria-label="关闭学习日历">
              ×
            </button>
          </header>

          <div className="settings-main__body streak-page">
            {section === "calendar" ? (
              <div className="streak-calendar-layout">
                <section className="streak-calendar settings-card">
                  <div className="streak-calendar__nav">
                    <button type="button" className="streak-calendar__shift" onClick={() => shiftMonth(-1)} aria-label="上个月">
                      ‹
                    </button>
                    <h3>
                      {viewMonth.year} 年 {viewMonth.month + 1} 月
                    </h3>
                    <button type="button" className="streak-calendar__shift" onClick={() => shiftMonth(1)} aria-label="下个月">
                      ›
                    </button>
                  </div>

                  <div className="streak-device-cal">
                    <div className="streak-device-cal__copy">
                      <strong>考试标记 → 电脑日历</strong>
                      <span>
                        {upcomingExams.length
                          ? `把已标记的 ${upcomingExams.length} 场考试加到 Windows / Mac 日历`
                          : "先点日期标记托福或 SAT，再加到电脑日历"}
                      </span>
                      {syncNote ? <span>{syncNote}</span> : null}
                    </div>
                    <div className="streak-device-cal__actions">
                      <button
                        type="button"
                        className="streak-device-cal__btn"
                        disabled={!upcomingExams.length}
                        onClick={handleSyncExamsToDevice}
                      >
                        加到电脑日历
                      </button>
                      {icsEnabled ? (
                        <>
                          <a
                            className="streak-device-cal__btn streak-device-cal__btn--ghost"
                            href={getOutlookSubscribeUrl(calendarSync.token)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Outlook
                          </a>
                          <a
                            className="streak-device-cal__btn streak-device-cal__btn--ghost"
                            href={getGoogleSubscribeUrl(calendarSync.token)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Google 日历
                          </a>
                          <button type="button" className="streak-device-cal__btn streak-device-cal__btn--ghost" onClick={handleCopyFeed}>
                            复制订阅
                          </button>
                        </>
                      ) : null}
                    </div>
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
                      const visibleExams = exams.slice(0, 2);
                      const hiddenCount = exams.length - visibleExams.length;

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
                            {visibleExams.map((exam) => (
                              <span key={exam.id} className={`streak-day__exam streak-day__exam--${exam.type}`}>
                                {exam.short}
                              </span>
                            ))}
                            {hiddenCount > 0 && <span className="streak-day__more">+{hiddenCount}</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedDate ? (
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
                            {exam.emoji} 添加{exam.label}考试
                          </button>
                        ))}
                      </div>
                      {selectedExams.length > 0 ? (
                        <ul className="streak-mark-menu__list">
                          {selectedExams.map((exam) => (
                            <li key={exam.id} className="streak-mark-menu__item">
                              <span>
                                {exam.emoji} {exam.label}考试
                              </span>
                              <div className="streak-mark-menu__item-actions">
                                <button
                                  type="button"
                                  className="btn btn--ghost btn--sm"
                                  onClick={() => addExamsToDeviceCalendar(exam)}
                                >
                                  加到电脑日历
                                </button>
                                <button
                                  type="button"
                                  className="btn btn--ghost btn--sm"
                                  onClick={() => handleRemoveExam(exam.id)}
                                >
                                  移除
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                </section>

                <aside className="streak-calendar-side">
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

                  {streak.loggedInToday ? (
                    <p className="streak-panel__today-badge">今日已打卡 · 火苗已点亮</p>
                  ) : null}

                  {nextMilestone ? (
                    <p className="streak-panel__next">
                      再坚持 <strong>{daysToNext}</strong> 天，解锁「{nextMilestone.emoji} {nextMilestone.title}」
                    </p>
                  ) : null}
                </aside>
              </div>
            ) : null}

            {section === "exams" ? (
              upcomingExams.length ? (
                <section className="streak-exams">
                  <div className="streak-device-cal">
                    <div className="streak-device-cal__copy">
                      <strong>考试标记 → 电脑日历</strong>
                      <span>把这些考试加到 Windows / Mac 日历</span>
                    </div>
                    <button type="button" className="streak-device-cal__btn" onClick={handleSyncExamsToDevice}>
                      全部加到电脑日历
                    </button>
                  </div>
                  <ul className="streak-exams__list">
                    {upcomingExams.map((exam) => (
                      <li
                        key={exam.id}
                        className={`streak-exam streak-exam--${exam.type} ${exam.daysLeft <= 7 ? "streak-exam--soon" : ""}`}
                      >
                        <span className="streak-exam__emoji">{exam.emoji}</span>
                        <div className="streak-exam__body">
                          <strong>{exam.label}考试</strong>
                          <span>{exam.dateKey}</span>
                        </div>
                        <span className="streak-exam__countdown">{formatCountdown(exam.dateKey)}</span>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => addExamsToDeviceCalendar(exam)}
                        >
                          加到电脑日历
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => handleRemoveExam(exam.id)}
                        >
                          移除
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                <div className="settings-card">
                  <p className="settings-hint settings-hint--compact">还没有标记考试。去日历里点一个日期，就能加上托福或 SAT。</p>
                  <button type="button" className="settings-action-btn settings-action-btn--primary" onClick={() => setSection("calendar")}>
                    去日历标记
                  </button>
                </div>
              )
            ) : null}

            {section === "rewards" ? (
              <section className="streak-milestones">
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
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
