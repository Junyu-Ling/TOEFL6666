const EXAM_LABELS = {
  toefl: "托福",
  sat: "SAT",
};

function icsDate(dateKey) {
  return String(dateKey || "").replace(/-/g, "");
}

function icsStamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function icsText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function addDays(dateKey, delta) {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  date.setDate(date.getDate() + delta);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function pushEvent(lines, { uid, dateKey, summary, description }) {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
  lines.push(
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${icsStamp()}`,
    `DTSTART;VALUE=DATE:${icsDate(dateKey)}`,
    `DTEND;VALUE=DATE:${icsDate(addDays(dateKey, 1))}`,
    "TRANSP:TRANSPARENT",
    `SUMMARY:${icsText(summary)}`,
    `DESCRIPTION:${icsText(description)}`,
    "END:VEVENT"
  );
}

export function buildStudyCalendarIcs({ loginDates = [], examMarks = [] } = {}) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TOEFL6666//Study Calendar//ZH",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:TOEFL 6·6·6·6",
    "X-WR-CALDESC:学习打卡火花与考试日期",
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
    "X-PUBLISHED-TTL:PT15M",
  ];

  const dates = [...new Set((loginDates || []).filter(Boolean))].sort();
  for (const dateKey of dates) {
    pushEvent(lines, {
      uid: `toefl666-streak-${dateKey}@toefl6666`,
      dateKey,
      summary: "🔥 学习打卡",
      description: "TOEFL 6·6·6·6 连续学习火花",
    });
  }

  for (const exam of examMarks || []) {
    if (!exam?.dateKey || !EXAM_LABELS[exam.type]) continue;
    const label = EXAM_LABELS[exam.type];
    pushEvent(lines, {
      uid: `toefl666-exam-${exam.type}-${exam.dateKey}-${exam.id || "mark"}@toefl6666`,
      dateKey: exam.dateKey,
      summary: `📝 ${label}考试`,
      description: `${label}考试（来自 TOEFL 6·6·6·6 学习日历）`,
    });
  }

  lines.push("END:VCALENDAR", "");
  return lines.join("\r\n");
}

export function isCalendarToken(value) {
  return /^[a-zA-Z0-9_-]{20,64}$/.test(String(value || ""));
}

export function nextAllDayDate(dateKey) {
  return addDays(dateKey, 1);
}

export { EXAM_LABELS };
