import { appendBookDefinitions } from "../utils/definitions";
import { compactWordBookEntry } from "../shared/wordBook";
import { normalizeAppMode } from "../utils/appMode";
import { loadSettings } from "./settings.js";

let currentAppMode = normalizeAppMode(loadSettings().appMode);

export function setStorageAppMode(appMode) {
  currentAppMode = normalizeAppMode(appMode);
}

export function getStorageAppMode() {
  return currentAppMode;
}

function storageSuffix(appMode = currentAppMode) {
  return normalizeAppMode(appMode) === "sat" ? "_sat" : "";
}

function recognizedKey(appMode = currentAppMode) {
  return `toefl666${storageSuffix(appMode)}_recognized`;
}

function unrecognizedKey(appMode = currentAppMode) {
  return `toefl666${storageSuffix(appMode)}_unrecognized`;
}

function progressKey(appMode = currentAppMode) {
  return `toefl666${storageSuffix(appMode)}_progress`;
}

const DEFAULT_PROGRESS = {
  activeListId: null,
  activeTab: "practice",
  isReviewMode: false,
  isRecognizedReviewMode: false,
  reviewShuffle: false,
  listProgress: {},
  bookPractices: {
    unrecognized: null,
    recognized: null,
    bank: null,
  },
  bookPracticePaused: {
    unrecognized: false,
    recognized: false,
    bank: false,
  },
};

function readList(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function isQuotaExceededError(err) {
  return (
    err instanceof DOMException &&
    (err.name === "QuotaExceededError" || err.code === 22)
  );
}

function writeList(key, list) {
  const payload = JSON.stringify(list);
  try {
    localStorage.setItem(key, payload);
  } catch (err) {
    if (isQuotaExceededError(err) && key.endsWith("_recognized")) {
      const compact = list.map(compactWordBookEntry);
      localStorage.setItem(key, JSON.stringify(compact));
      return;
    }
    throw err;
  }
}

function migrateRecognizedList(list, appMode = currentAppMode) {
  if (!list.some((item) => item.ai_feedback)) return list;
  const compact = list.map(compactWordBookEntry);
  try {
    writeList(recognizedKey(appMode), compact);
  } catch {
    return list;
  }
  return compact;
}

export function loadRecognized(appMode = currentAppMode) {
  return migrateRecognizedList(readList(recognizedKey(appMode)), appMode);
}

export function loadUnrecognized(appMode = currentAppMode) {
  const list = readList(unrecognizedKey(appMode));
  return list.map((item) => ({
    ...item,
    wrongCount: item.wrongCount ?? 1,
  }));
}

export function saveRecognized(list, appMode = currentAppMode) {
  writeList(recognizedKey(appMode), list.map(compactWordBookEntry));
}

export function saveUnrecognized(list, appMode = currentAppMode) {
  writeList(unrecognizedKey(appMode), list);
}

export function loadProgress(appMode = currentAppMode) {
  try {
    const raw = localStorage.getItem(progressKey(appMode));
    if (!raw) return { ...DEFAULT_PROGRESS, listProgress: {} };
    return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PROGRESS, listProgress: {} };
  }
}

export function saveProgress(progress, appMode = currentAppMode) {
  localStorage.setItem(progressKey(appMode), JSON.stringify(progress));
}

export const EMPTY_BOOK_PRACTICES = {
  unrecognized: null,
  recognized: null,
  bank: null,
};

/** 单个词本练习会话（生词本 / 熟词本各一份，互不影响）。 */
export function normalizeBookPracticeSession(raw) {
  if (!raw || !Array.isArray(raw.queue) || raw.queue.length === 0) return null;

  const queue = raw.queue
    .filter((item) => item?.word && Array.isArray(item.definitions))
    .map(({ word, definitions, sourceListId }) => ({
      word,
      definitions,
      ...(sourceListId ? { sourceListId } : {}),
    }));

  if (queue.length === 0) return null;

  const index = typeof raw.index === "number" ? raw.index : 0;
  const session = {
    queue,
    index: Math.min(Math.max(index, 0), queue.length - 1),
  };
  if (Array.isArray(raw.listIds) && raw.listIds.length > 0) {
    session.listIds = raw.listIds.filter(Boolean);
  } else if (raw.listId) {
    session.listIds = [raw.listId];
  }
  return session;
}

/** @deprecated 兼容旧版单一 bookPractice 字段 */
export function normalizeBookPractice(raw) {
  if (!raw || (raw.type !== "unrecognized" && raw.type !== "recognized")) return null;
  const session = normalizeBookPracticeSession(raw);
  if (!session) return null;
  return { type: raw.type, ...session };
}

/** 同时恢复生词本、熟词本、词库练习进度。 */
export function loadBookPractices(saved = {}) {
  const result = { ...EMPTY_BOOK_PRACTICES };

  if (saved.bookPractices && typeof saved.bookPractices === "object") {
    result.unrecognized = normalizeBookPracticeSession(saved.bookPractices.unrecognized);
    result.recognized = normalizeBookPracticeSession(saved.bookPractices.recognized);
    result.bank = normalizeBookPracticeSession(saved.bookPractices.bank);
  }

  const legacy = normalizeBookPractice(saved.bookPractice);
  if (legacy?.type === "unrecognized" && !result.unrecognized) {
    result.unrecognized = { queue: legacy.queue, index: legacy.index };
  }
  if (legacy?.type === "recognized" && !result.recognized) {
    result.recognized = { queue: legacy.queue, index: legacy.index };
  }

  return result;
}

export function loadBookPracticePaused(saved = {}, bookPractices = EMPTY_BOOK_PRACTICES) {
  const paused = saved.bookPracticePaused;
  return {
    unrecognized: Boolean(paused?.unrecognized) && Boolean(bookPractices.unrecognized),
    recognized: Boolean(paused?.recognized) && Boolean(bookPractices.recognized),
    bank: Boolean(paused?.bank) && Boolean(bookPractices.bank),
  };
}

export function getSavedIndex(listProgress, listId) {
  const saved = listProgress[listId]?.currentIndex;
  return typeof saved === "number" && saved >= 0 ? saved : 0;
}

export function patchListProgress(listProgress, listId, currentIndex) {
  return {
    ...listProgress,
    [listId]: { currentIndex, updatedAt: Date.now() },
  };
}

export function buildWordRecord(wordData, aiResult) {
  const record = {
    word: wordData.word,
    definitions: wordData.definitions,
    ai_feedback: appendBookDefinitions(aiResult.ai_feedback, wordData.definitions),
    savedAt: Date.now(),
  };
  if (wordData.sourceListId) {
    record.sourceListId = wordData.sourceListId;
  }
  if (aiResult.memory_trick) {
    record.memory_trick = aiResult.memory_trick;
  }
  return record;
}

export function buildRecognizedRecord(wordData, aiResult, priorWrongCount) {
  const record = buildWordRecord(wordData, aiResult);
  if (typeof priorWrongCount === "number" && priorWrongCount > 0) {
    record.wrongCount = priorWrongCount;
  }
  return record;
}

export function upsertWord(list, record) {
  const filtered = list.filter((item) => item.word !== record.word);
  return [...filtered, record];
}

export function removeWord(list, word) {
  return list.filter((item) => item.word !== word);
}

export function toBookQueueItem(item) {
  return {
    word: item.word,
    definitions: item.definitions,
    ...(item.sourceListId ? { sourceListId: item.sourceListId } : {}),
  };
}

/** 进行中的词本练习队列：追加新词（已存在则跳过）。 */
export function appendToBookQueue(session, item) {
  if (!session?.queue) return session;
  if (!item?.word) return session;
  if (session.queue.some((entry) => entry.word === item.word)) return session;
  return {
    ...session,
    queue: [...session.queue, toBookQueueItem(item)],
  };
}

/** 进行中的词本练习队列：移除已掌握/移出词本的词，并校正当前进度。 */
export function removeFromBookQueue(session, word) {
  if (!session?.queue?.length) return session;
  const removeIndex = session.queue.findIndex((entry) => entry.word === word);
  if (removeIndex < 0) return session;

  const queue = session.queue.filter((entry) => entry.word !== word);
  if (queue.length === 0) return null;

  let index = session.index;
  if (removeIndex < index) index -= 1;
  else if (removeIndex === index) index = Math.min(index, queue.length - 1);

  return {
    queue,
    index: Math.max(0, index),
  };
}

export function shuffleArray(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function sortByWrongCount(items) {
  return [...items].sort((a, b) => (b.wrongCount ?? 0) - (a.wrongCount ?? 0));
}

export function seededShuffle(items, seed) {
  const copy = [...items];
  let state = seed >>> 0;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
