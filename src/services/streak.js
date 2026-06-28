const STREAK_KEY = "toefl666_streak";

export const STREAK_MILESTONES = [
  { days: 3, title: "初燃", emoji: "🔥", desc: "连续学习 3 天" },
  { days: 7, title: "一周坚持", emoji: "⭐", desc: "连续学习 7 天" },
  { days: 14, title: "双周达人", emoji: "🌟", desc: "连续学习 14 天" },
  { days: 30, title: "月度学霸", emoji: "🏆", desc: "连续学习 30 天" },
  { days: 60, title: "不灭之火", emoji: "💎", desc: "连续学习 60 天" },
  { days: 100, title: "百炼成钢", emoji: "👑", desc: "连续学习 100 天" },
];

const DEFAULT_STREAK = {
  loginDates: [],
  longestStreak: 0,
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

export function loadStreak() {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { ...DEFAULT_STREAK, loginDates: [] };
    const data = { ...DEFAULT_STREAK, ...JSON.parse(raw) };
    return {
      ...data,
      loginDates: Array.isArray(data.loginDates) ? [...data.loginDates].sort() : [],
    };
  } catch {
    return { ...DEFAULT_STREAK, loginDates: [] };
  }
}

export function saveStreak(data) {
  localStorage.setItem(STREAK_KEY, JSON.stringify(data));
}

export function recordVisit() {
  const data = loadStreak();
  const today = toDateKey();
  const loginSet = new Set(data.loginDates);
  const isNewToday = !loginSet.has(today);

  if (isNewToday) {
    loginSet.add(today);
    data.loginDates = [...loginSet].sort();
  }

  const currentStreak = computeStreak(data.loginDates);
  data.longestStreak = Math.max(data.longestStreak ?? 0, currentStreak);

  saveStreak(data);

  return {
    loginDates: data.loginDates,
    currentStreak,
    longestStreak: data.longestStreak,
    totalDays: data.loginDates.length,
    loggedInToday: true,
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
