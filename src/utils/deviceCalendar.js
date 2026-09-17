import { addDays, EXAM_TYPES } from "../services/streak";

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

export function buildExamCalendarIcs(exams) {
  const events = (Array.isArray(exams) ? exams : [exams]).filter((exam) => exam?.dateKey && exam?.type);
  const stamp = icsStamp();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TOEFL6666//Exam//ZH",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const exam of events) {
    const meta = EXAM_TYPES[exam.type] || { label: "考试" };
    const title = `${meta.label}考试`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:toefl666-${exam.type}-${exam.dateKey}-${exam.id || "mark"}@toefl6666`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(exam.dateKey)}`,
      `DTEND;VALUE=DATE:${icsDate(addDays(exam.dateKey, 1))}`,
      `SUMMARY:${icsText(title)}`,
      `DESCRIPTION:${icsText(`${title}（来自 TOEFL 6·6·6·6 学习日历）`)}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR", "");
  return lines.join("\r\n");
}

export function addExamsToDeviceCalendar(exams) {
  const list = (Array.isArray(exams) ? exams : [exams]).filter((exam) => exam?.dateKey && exam?.type);
  if (!list.length) return false;

  const ics = buildExamCalendarIcs(list);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const first = list[0];
  link.href = url;
  link.download = `${first.type}-exam-${first.dateKey}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
