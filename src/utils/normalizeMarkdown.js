/** Separator row like |---|---| or | --- | --- | */
const TABLE_SEPARATOR = /\|[-:\s|]+\|/;

function unwrapMarkdownFences(text) {
  const trimmed = String(text || "").trim();
  const match = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);
  return match ? match[1].trim() : trimmed;
}

function splitInlineTableRows(text) {
  return text
    .replace(/\|\s*\|\s*(?=-{3,})/g, "|\n|")
    .replace(/\|\s*\|\s*(?=[A-Za-z\u4e00-\u9fff(])/g, "|\n| ");
}

/** 把「说明文字： | 表头 |」拆成说明 + 独立表格行 */
function detachLeadingTextFromTable(text) {
  const match = text.match(/^([\s\S]*?)(\|[^|\n]+(?:\|[^|\n]+)+\|)\s*(\|[-:\s|]+\|[\s\S]*)$/);
  if (!match) return text;

  const [, intro, headerRow, rest] = match;
  const trimmedIntro = intro.trim();
  if (!trimmedIntro || trimmedIntro.includes("|")) return text;

  return `${trimmedIntro}\n\n${headerRow}${rest}`;
}

function ensureRowTrailingPipe(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed.startsWith("|")) return line;
  if (trimmed.endsWith("|")) return trimmed;
  return `${trimmed} |`;
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

function isTableRow(line) {
  const trimmed = String(line || "").trim();
  return trimmed.startsWith("|") && trimmed.includes("|", 1);
}

/** GFM rejects tables when header and separator column counts differ. */
function alignTableSeparators(text) {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length - 1; i++) {
    const headerCols = countTableColumns(lines[i]);
    if (headerCols === 0 || !isSeparatorRow(lines[i + 1])) continue;
    const sepCols = countTableColumns(lines[i + 1]);
    if (sepCols !== headerCols) {
      lines[i + 1] = `| ${Array(headerCols).fill("---").join(" | ")} |`;
    }
  }
  return lines.join("\n");
}

function fixTableRowPipes(text) {
  return text
    .split("\n")
    .map((line) => (isTableRow(line) ? ensureRowTrailingPipe(line) : line))
    .join("\n");
}

/**
 * AI replies often emit markdown tables on one line. GFM needs one row per line.
 */
export function normalizeMarkdownTables(text) {
  const source = unwrapMarkdownFences(text);
  if (!TABLE_SEPARATOR.test(source) || !/\|/.test(source)) {
    return source;
  }

  let result = detachLeadingTextFromTable(source);
  result = splitInlineTableRows(result);
  result = fixTableRowPipes(result);
  return result;
}

export function prepareAiMarkdown(content) {
  return alignTableSeparators(normalizeMarkdownTables(content));
}
