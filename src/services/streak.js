const STREAK_KEY = "toefl666_streak";

export const STREAK_MILESTONES = [
  { days: 3, title: "初燃", emoji: "🔥", desc: "连续学习 3 天" },
  { days: 7, title: "一周坚持", emoji: "⭐", desc: "连续学习 7 天" },
  { days: 14, title: "双周达人", emoji: "🌟", desc: "连续学习 14 天" },
  { days: 30, title: "月度学霸", emoji: "🏆", desc: "连续学习 30 天" },
  { days: 60, title: "不灭之火", emoji: "💎", desc: "连续学习 60 天" },
  { days: 100, title: "百炼成钢", emoji: "👑", desc: "连续学习 100 天" },
];

export const EXAM_TYPES = {
  toefl: { id: "toefl", label: "托福", short: "托", emoji: "📝" },
  sat: { id: "sat", label: "SAT", short: "S", emoji: "📋" },
};

const DEFAULT_STREAK = {
  loginDates: [],
  longestStreak: 0,
  examMarks: [],
  calendarSync: { token: "", icsEnabled: false, googleEnabled: false },
};

export function toDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(dateKey, delta) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + delta);
  return toDateKey(date);
}

export function computeStreak(loginDates) {
  const set = new Set(loginDates);
  if (set.size === 0) return 0;

  const today = toDateKey();
  const yesterday = addDays(today, -1);
  const anchor = set.has(today) ? today : set.has(yesterday) ? yesterday : null;
  if (!anchor) return 0;

  let streak = 0;
  let cursor = anchor;
  while (set.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function daysUntil(dateKey) {
  const today = parseDateKey(toDateKey());
  const target = parseDateKey(dateKey);
  return Math.round((target - today) / 86400000);
}

export function formatCountdown(dateKey) {
  const days = daysUntil(dateKey);
  if (days > 0) return `还有 ${days} 天`;
  if (days === 0) return "就是今天";
  return `已过 ${Math.abs(days)} 天`;
}

function createExamId(type, dateKey) {
  return `${type}-${dateKey}-${Date.now().toString(36)}`;
}

function stableExamId(entry, index) {
  if (entry.id) return entry.id;
  return `${entry.type}-${entry.dateKey}-${index}`;
}

export function normalizeExamMarks(examMarks) {
  if (Array.isArray(examMarks)) {
    return examMarks
      .filter((entry) => entry?.dateKey && EXAM_TYPES[entry.type])
      .map((entry, index) => ({
        id: stableExamId(entry, index),
        type: entry.type,
        dateKey: entry.dateKey,
      }))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.type.localeCompare(b.type));
  }

  if (examMarks && typeof examMarks === "object") {
    return Object.entries(examMarks)
      .filter(([type, dateKey]) => dateKey && EXAM_TYPES[type])
      .map(([type, dateKey]) => ({
        id: `${type}-${dateKey}`,
        type,
        dateKey,
      }));
  }

  return [];
}

let memoryStreakCache = null;

function createCalendarToken() {
  const bytes = new Uint8Array(18);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export function normalizeCalendarSync(value) {
  const token = String(value?.token || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return {
    token: token.length >= 20 ? token : "",
    icsEnabled: Boolean(value?.icsEnabled && token.length >= 20),
    googleEnabled: Boolean(value?.googleEnabled),
    lastSyncedAt: Number(value?.lastSyncedAt) || 0,
    lastSynced: {
      loginDates: Array.isArray(value?.lastSynced?.loginDates) ? value.lastSynced.loginDates : [],
      examMarks: Array.isArray(value?.lastSynced?.examMarks) ? value.lastSynced.examMarks : [],
    },
  };
}

function serializeStreak(data) {
  return {
    loginDates: Array.isArray(data.loginDates) ? [...data.loginDates].sort() : [],
    longestStreak: data.longestStreak ?? 0,
    examMarks: normalizeExamMarks(data.examMarks),
    calendarSync: normalizeCalendarSync(data.calendarSync),
  };
}

function notifyCalendarChanged(payload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("toefl666-calendar-changed", { detail: payload }));
}

function writeStreakRaw(data) {
  const payload = serializeStreak(data);
  memoryStreakCache = payload;
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(payload));
  } catch {
    // localStorage unavailable (private mode / quota) — keep in-memory for session
  }
  return payload;
}

function readStreakRaw() {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) {
      const data = { ...DEFAULT_STREAK, ...JSON.parse(raw) };
      return writeStreakRaw(data);
    }
  } catch {
    // fall through to memory / default
  }

  if (memoryStreakCache) {
    return serializeStreak(memoryStreakCache);
  }

  const empty = { ...DEFAULT_STREAK, loginDates: [], examMarks: [], calendarSync: normalizeCalendarSync(null) };
  memoryStreakCache = serializeStreak(empty);
  return memoryStreakCache;
}

function buildStreakSnapshot(data) {
  const loginDates = Array.isArray(data.loginDates) ? [...data.loginDates].sort() : [];
  const currentStreak = computeStreak(loginDates);
  const today = toDateKey();

  return {
    loginDates,
    currentStreak,
    longestStreak: Math.max(data.longestStreak ?? 0, currentStreak),
    totalDays: loginDates.length,
    loggedInToday: loginDates.includes(today),
    examMarks: normalizeExamMarks(data.examMarks),
    calendarSync: normalizeCalendarSync(data.calendarSync),
  };
}

export function loadStreak() {
  return buildStreakSnapshot(readStreakRaw());
}

export function refreshStreak() {
  return loadStreak();
}

export function saveStreak(data, { syncCalendar = true } = {}) {
  const payload = writeStreakRaw(data);
  if (syncCalendar) notifyCalendarChanged(payload);
  return payload;
}

export function enableIcsCalendarSync() {
  const raw = readStreakRaw();
  const prev = normalizeCalendarSync(raw.calendarSync);
  const next = {
    ...raw,
    calendarSync: {
      ...prev,
      token: prev.token || createCalendarToken(),
      icsEnabled: true,
    },
  };
  saveStreak(next);
  return buildStreakSnapshot(next);
}

export function disableIcsCalendarSync() {
  const raw = readStreakRaw();
  const next = {
    ...raw,
    calendarSync: { ...normalizeCalendarSync(raw.calendarSync), icsEnabled: false },
  };
  saveStreak(next, { syncCalendar: false });
  return buildStreakSnapshot(next);
}

export function setGoogleCalendarSyncEnabled(enabled) {
  const raw = readStreakRaw();
  const next = {
    ...raw,
    calendarSync: { ...normalizeCalendarSync(raw.calendarSync), googleEnabled: Boolean(enabled) },
  };
  saveStreak(next, { syncCalendar: Boolean(enabled) });
  return buildStreakSnapshot(next);
}

export function applyGoogleCalendarPull(remote) {
  if (!remote) return loadStreak();
  const raw = readStreakRaw();
  const lastLogin = new Set(raw.calendarSync?.lastSynced?.loginDates || []);
  const remoteLogin = new Set(remote.loginDates || []);
  const loginDates = new Set(raw.loginDates || []);
  for (const dateKey of lastLogin) {
    if (!remoteLogin.has(dateKey)) loginDates.delete(dateKey);
  }
  for (const dateKey of remoteLogin) {
    if (dateKey <= toDateKey()) loginDates.add(dateKey);
  }

  const lastExams = new Set((raw.calendarSync?.lastSynced?.examMarks || []).map((mark) => mark.id));
  const remoteExams = new Map((remote.examMarks || []).map((mark) => [mark.id, mark]));
  const exams = new Map((raw.examMarks || []).map((mark) => [mark.id, mark]));
  for (const id of lastExams) {
    if (!remoteExams.has(id)) exams.delete(id);
  }
  for (const [id, mark] of remoteExams) {
    if (!exams.has(id)) exams.set(id, mark);
  }

  const nextLoginDates = [...loginDates].sort();
  const next = {
    ...raw,
    loginDates: nextLoginDates,
    longestStreak: Math.max(raw.longestStreak ?? 0, computeStreak(nextLoginDates)),
    examMarks: [...exams.values()],
    calendarSync: {
      ...normalizeCalendarSync(raw.calendarSync),
      googleEnabled: true,
      lastSyncedAt: Date.now(),
      lastSynced: {
        loginDates: [...remoteLogin].sort(),
        examMarks: remote.examMarks || [],
      },
    },
  };
  saveStreak(next, { syncCalendar: false });
  return buildStreakSnapshot(next);
}

export function markGoogleCalendarSynced(streakLike = loadStreak()) {
  const raw = readStreakRaw();
  const next = {
    ...raw,
    calendarSync: {
      ...normalizeCalendarSync(raw.calendarSync),
      googleEnabled: true,
      lastSyncedAt: Date.now(),
      lastSynced: {
        loginDates: streakLike.loginDates || raw.loginDates || [],
        examMarks: streakLike.examMarks || raw.examMarks || [],
      },
    },
  };
  saveStreak(next, { syncCalendar: false });
  return buildStreakSnapshot(next);
}

export function addExamMark(type, dateKey) {
  const raw = readStreakRaw();
  const examMarks = [
    ...normalizeExamMarks(raw.examMarks),
    { id: createExamId(type, dateKey), type, dateKey },
  ];
  const next = { ...raw, examMarks };
  saveStreak(next);
  return buildStreakSnapshot(next);
}

export function removeExamMark(id) {
  const raw = readStreakRaw();
  const examMarks = normalizeExamMarks(raw.examMarks).filter((entry) => entry.id !== id);
  const next = { ...raw, examMarks };
  saveStreak(next);
  return buildStreakSnapshot(next);
}

export function getExamsOnDate(examMarks, dateKey) {
  return normalizeExamMarks(examMarks)
    .filter((entry) => entry.dateKey === dateKey)
    .map((entry) => ({
      ...EXAM_TYPES[entry.type],
      ...entry,
    }));
}

export function getUpcomingExams(examMarks) {
  return normalizeExamMarks(examMarks)
    .map((entry) => ({
      ...EXAM_TYPES[entry.type],
      ...entry,
      daysLeft: daysUntil(entry.dateKey),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft || a.dateKey.localeCompare(b.dateKey));
}

export function getNearestExamOfType(examMarks, type) {
  return getUpcomingExams(examMarks).find((exam) => exam.type === type && exam.daysLeft >= 0) ?? null;
}

export function recordVisit() {
  const raw = readStreakRaw();
  const today = toDateKey();
  const loginSet = new Set(raw.loginDates);
  const isNewToday = !loginSet.has(today);

  if (isNewToday) {
    loginSet.add(today);
  }

  const loginDates = [...loginSet].sort();
  const currentStreak = computeStreak(loginDates);
  const longestStreak = Math.max(raw.longestStreak ?? 0, currentStreak);

  const next = {
    ...raw,
    loginDates,
    longestStreak,
    examMarks: raw.examMarks,
  };
  saveStreak(next);

  return {
    ...buildStreakSnapshot(next),
    isNewToday,
  };
}

export function getMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();
  const cells = [];

  for (let i = 0; i < startPad; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(toDateKey(new Date(year, month, day)));
  }
  return cells;
}

export function getUnlockedMilestones(longestStreak) {
  return STREAK_MILESTONES.filter((m) => longestStreak >= m.days);
}

export function getNextMilestone(currentStreak) {
  return STREAK_MILESTONES.find((m) => currentStreak < m.days) ?? null;
}
