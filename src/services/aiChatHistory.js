const AI_CHAT_HISTORY_KEY = "toefl666_ai_chat_history";
export const GENERAL_CHAT_KEY = "__general__";

function readStore() {
  try {
    const raw = localStorage.getItem(AI_CHAT_HISTORY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStore(store) {
  localStorage.setItem(AI_CHAT_HISTORY_KEY, JSON.stringify(store));
}

export function getWordKey(word) {
  const trimmed = word?.trim();
  return trimmed ? trimmed.toLowerCase() : GENERAL_CHAT_KEY;
}

export function displayWordKey(key) {
  return key === GENERAL_CHAT_KEY ? "通用" : key;
}

export function loadChatEntry(wordKey) {
  const entry = readStore()[wordKey];
  if (!entry) return { messages: [], definitions: [] };
  if (Array.isArray(entry)) {
    return { messages: entry, definitions: [] };
  }
  return {
    messages: Array.isArray(entry.messages) ? entry.messages : [],
    definitions: Array.isArray(entry.definitions) ? entry.definitions : [],
  };
}

export function saveChatEntry(wordKey, messages, definitions = []) {
  const store = readStore();
  const persistable = messages.filter((m) => !m.welcome);

  if (persistable.length === 0) {
    delete store[wordKey];
    writeStore(store);
    return;
  }

  const lastAt = persistable[persistable.length - 1]?.at ?? Date.now();
  store[wordKey] = {
    messages: persistable,
    definitions: definitions ?? [],
    updatedAt: lastAt,
  };
  writeStore(store);
}

export function clearChatEntry(wordKey) {
  const store = readStore();
  delete store[wordKey];
  writeStore(store);
}

export function listChatHistoryIndex() {
  const store = readStore();
  return Object.entries(store)
    .map(([wordKey, entry]) => {
      const messages = Array.isArray(entry) ? entry : entry.messages ?? [];
      const updatedAt = Array.isArray(entry) ? messages.at(-1)?.at ?? 0 : entry.updatedAt ?? 0;
      return {
        wordKey,
        label: displayWordKey(wordKey),
        messageCount: messages.length,
        updatedAt,
      };
    })
    .filter((item) => item.messageCount > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function searchChatHistory(query) {
  const q = query.trim().toLowerCase();
  const items = listChatHistoryIndex();
  if (!q) return items;
  return items.filter((item) => item.label.toLowerCase().includes(q) || item.wordKey.includes(q));
}
