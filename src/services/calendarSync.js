import { isCalendarToken } from "../shared/studyCalendarIcs";

let publishTimer = 0;
let googleTimer = 0;
let googleConnected = null;
let syncing = false;

function feedUrl(token) {
  return `${window.location.origin}/api/calendar/feed.ics?token=${encodeURIComponent(token)}`;
}

export function getCalendarFeedUrl(token) {
  if (!isCalendarToken(token)) return "";
  return feedUrl(token);
}

export function getGoogleSubscribeUrl(token) {
  const ics = getCalendarFeedUrl(token);
  if (!ics) return "";
  const webcal = ics.replace(/^https:/, "webcal:").replace(/^http:/, "webcal:");
  return `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(webcal)}`;
}

export function getOutlookSubscribeUrl(token) {
  const ics = getCalendarFeedUrl(token);
  if (!ics) return "";
  return `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(ics)}&name=${encodeURIComponent("TOEFL 6·6·6·6")}`;
}

export function startGoogleCalendarConnect() {
  window.location.href = "/api/auth/google/calendar";
}

export async function fetchGoogleCalendarStatus() {
  const res = await fetch("/api/calendar/google-status", { credentials: "include" });
  if (!res.ok) {
    googleConnected = false;
    return { connected: false };
  }
  const data = await res.json().catch(() => ({}));
  googleConnected = Boolean(data.connected);
  return { connected: googleConnected };
}

export function isGoogleCalendarConnected() {
  return googleConnected === true;
}

async function publishIcsFeed(streak) {
  const token = streak?.calendarSync?.token;
  if (!streak?.calendarSync?.icsEnabled || !isCalendarToken(token)) return null;
  const res = await fetch("/api/calendar/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      loginDates: streak.loginDates || [],
      examMarks: streak.examMarks || [],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "发布日历订阅失败");
  return data;
}

async function pushGoogleCalendar(streak) {
  if (googleConnected === false && !streak?.calendarSync?.googleEnabled) return null;
  const res = await fetch("/api/calendar/google-sync", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      loginDates: streak.loginDates || [],
      examMarks: streak.examMarks || [],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    googleConnected = false;
    return null;
  }
  if (!res.ok) throw new Error(data.error || "同步到 Google 日历失败");
  googleConnected = true;
  return data;
}

export async function pullGoogleCalendar() {
  const res = await fetch("/api/calendar/google-pull", { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    googleConnected = false;
    return null;
  }
  if (!res.ok) throw new Error(data.error || "读取 Google 日历失败");
  googleConnected = true;
  return data;
}

export async function disconnectGoogleCalendar() {
  const res = await fetch("/api/calendar/google-disconnect", {
    method: "POST",
    credentials: "include",
  });
  googleConnected = false;
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "取消 Google 日历同步失败");
  }
}

export async function syncStudyCalendarNow(streak) {
  if (syncing) return;
  syncing = true;
  try {
    await publishIcsFeed(streak);
    await pushGoogleCalendar(streak);
  } finally {
    syncing = false;
  }
}

export function scheduleStudyCalendarSync(streak) {
  if (!streak?.calendarSync?.icsEnabled && !streak?.calendarSync?.googleEnabled && googleConnected !== true) {
    return;
  }
  window.clearTimeout(publishTimer);
  window.clearTimeout(googleTimer);
  publishTimer = window.setTimeout(() => {
    syncStudyCalendarNow(streak).catch((err) => {
      console.warn("[calendarSync]", err.message || err);
    });
  }, 500);
}

export function listenStudyCalendarChanges() {
  function onChange(event) {
    scheduleStudyCalendarSync(event.detail || {});
  }
  window.addEventListener("toefl666-calendar-changed", onChange);
  return () => window.removeEventListener("toefl666-calendar-changed", onChange);
}

export async function copyCalendarFeedUrl(token) {
  const url = getCalendarFeedUrl(token);
  if (!url) return false;
  await navigator.clipboard.writeText(url);
  return true;
}
