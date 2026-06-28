import { appendBookDefinitions } from "../utils/definitions";

const RECOGNIZED_KEY = "toefl666_recognized";
const UNRECOGNIZED_KEY = "toefl666_unrecognized";
const PROGRESS_KEY = "toefl666_progress";

const DEFAULT_PROGRESS = {
  activeListId: null,
  activeTab: "practice",
  isReviewMode: false,
  reviewShuffle: false,
  listProgress: {},
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
  return {
    word: wordData.word,
    definitions: wordData.definitions,
    ai_feedback: appendBookDefinitions(aiResult.ai_feedback, wordData.definitions),
    savedAt: Date.now(),
  };
}

export function upsertWord(list, record) {
  const filtered = list.filter((item) => item.word !== record.word);
  return [...filtered, record];
}

export function removeWord(list, word) {
  return list.filter((item) => item.word !== word);
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
