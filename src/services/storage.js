import { appendBookDefinitions } from "../utils/definitions";

const RECOGNIZED_KEY = "toefl666_recognized";
const UNRECOGNIZED_KEY = "toefl666_unrecognized";
const PROGRESS_KEY = "toefl666_progress";

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
  },
  bookPracticePaused: {
    unrecognized: false,
    recognized: false,
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

function writeList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

export function loadRecognized() {
  return readList(RECOGNIZED_KEY);
}

export function loadUnrecognized() {
  const list = readList(UNRECOGNIZED_KEY);
  return list.map((item) => ({
    ...item,
    wrongCount: item.wrongCount ?? 1,
  }));
}

export function saveRecognized(list) {
  writeList(RECOGNIZED_KEY, list);
}

export function saveUnrecognized(list) {
  writeList(UNRECOGNIZED_KEY, list);
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS, listProgress: {} };
    return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PROGRESS, listProgress: {} };
  }
}

export function saveProgress(progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export const EMPTY_BOOK_PRACTICES = {
  unrecognized: null,
  recognized: null,
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
  if (raw.listId) session.listId = raw.listId;
  return session;
}

/** @deprecated 兼容旧版单一 bookPractice 字段 */
export function normalizeBookPractice(raw) {
  if (!raw || (raw.type !== "unrecognized" && raw.type !== "recognized")) return null;
  const session = normalizeBookPracticeSession(raw);
  if (!session) return null;
  return { type: raw.type, ...session };
}

/** 同时恢复生词本、熟词本两份练习进度（最多与词库练习共三个独立进度）。 */
export function loadBookPractices(saved = {}) {
  const result = { ...EMPTY_BOOK_PRACTICES };

  if (saved.bookPractices && typeof saved.bookPractices === "object") {
    result.unrecognized = normalizeBookPracticeSession(saved.bookPractices.unrecognized);
    result.recognized = normalizeBookPracticeSession(saved.bookPractices.recognized);
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
