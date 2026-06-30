/** Separator row like |---|---| or | --- | --- | */
const TABLE_SEPARATOR = /\|[-:\s|]+\|/;

function unwrapMarkdownFences(text) {
  const trimmed = String(text || "").trim();
  const match = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);
  return match ? match[1].trim() : trimmed;
}

/**
 * AI replies often emit markdown tables on one line. GFM needs one row per line.
 */
export function normalizeMarkdownTables(text) {
  const source = unwrapMarkdownFences(text);
  if (!TABLE_SEPARATOR.test(source) || !/\|/.test(source)) {
    return source;
  }
  return source
    .replace(/\|\s*\|\s*(?=-{3,})/g, "|\n|")
    .replace(/\|\s+\|\s*(?=[a-zA-Z\u4e00-\u9fff(])/g, "|\n| ");
}

function countTableColumns(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return 0;
  return trimmed.slice(1, -1).split("|").length;
}

function isSeparatorRow(line) {
  const trimmed = String(line || "").trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|") && /---/.test(trimmed);
}

/** GFM rejects tables when header and separator column counts differ. */
function alignTableSeparators(text) {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length - 1; i++) {
    const headerCols = countTableColumns(lines[i]);
    if (headerCols === 0 || !isSeparatorRow(lines[i + 1])) continue;
    const sepCols = countTableColumns(lines[i + 1]);
    if (sepCols !== headerCols) {
      lines[i + 1] = `|${Array(headerCols).fill("---").join("|")}|`;
    }
  }
  return lines.join("\n");
}

export function prepareAiMarkdown(content) {
  return alignTableSeparators(normalizeMarkdownTables(content));
}
