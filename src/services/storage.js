import { appendBookDefinitions } from "../utils/definitions";

const RECOGNIZED_KEY = "toefl666_recognized";
const UNRECOGNIZED_KEY = "toefl666_unrecognized";
const PROGRESS_KEY = "toefl666_progress";

const DEFAULT_PROGRESS = {
  activeListId: null,
  activeTab: "practice",
  isReviewMode: false,
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
  return readList(UNRECOGNIZED_KEY);
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
