/** 词本条目精简：去掉 ai_feedback 等冗余字段，降低 localStorage / 同步体积。 */
export function compactWordBookEntry(item) {
  const compact = {
    word: item.word,
    definitions: Array.isArray(item.definitions) ? item.definitions : [],
    savedAt: item.savedAt || Date.now(),
  };
  if (item.sourceListId) compact.sourceListId = item.sourceListId;
  if (item.wrongCount > 0) compact.wrongCount = item.wrongCount;
  if (item.memory_trick) compact.memory_trick = item.memory_trick;
  return compact;
}

export function compactWordBookList(list) {
  return Array.isArray(list) ? list.map(compactWordBookEntry) : [];
}
