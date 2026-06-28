export function formatBookDefinitions(definitions) {
  return (definitions || []).filter(Boolean).join("；");
}

export function appendBookDefinitions(feedback, definitions) {
  const book = formatBookDefinitions(definitions);
  if (!book) return feedback;
  return `${feedback} 书上释义：${book}`;
}
