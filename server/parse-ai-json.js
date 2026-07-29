function sanitizeJsonText(input) {
  return String(input)
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/:\s*true或false/gi, ": true")
    .replace(/:\s*false或true/gi, ": false")
    .replace(/:\s*true\s*\|\s*false/gi, ": true")
    .replace(/"type"\s*:\s*"[^"]*或[^"]*"/gi, '"type": "association"');
}

function unescapeJsonString(value) {
  return String(value || "")
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function extractJsonField(text, field) {
  const marker = `"${field}"`;
  const idx = text.indexOf(marker);
  if (idx < 0) return undefined;

  const colon = text.indexOf(":", idx + marker.length);
  if (colon < 0) return undefined;

  let pos = colon + 1;
  while (pos < text.length && /\s/.test(text[pos])) pos += 1;

  if (text.startsWith("true", pos)) return true;
  if (text.startsWith("false", pos)) return false;

  if (text[pos] !== '"') return undefined;
  pos += 1;

  let result = "";
  while (pos < text.length) {
    const ch = text[pos];
    if (ch === "\\") {
      const next = text[pos + 1];
      if (next === "n") {
        result += "\n";
        pos += 2;
        continue;
      }
      if (next === '"') {
        result += '"';
        pos += 2;
        continue;
      }
      if (next === "\\") {
        result += "\\";
        pos += 2;
        continue;
      }
      result += next || ch;
      pos += 2;
      continue;
    }
    if (ch === '"') {
      let look = pos + 1;
      while (look < text.length && /\s/.test(text[look])) look += 1;
      const next = text[look];
      if (next === "," || next === "}" || next === "]") {
        return unescapeJsonString(result);
      }
      result += '"';
      pos += 1;
      continue;
    }
    result += ch;
    pos += 1;
  }

  return unescapeJsonString(result);
}

function salvageEvaluate(text) {
  const isCorrect = extractJsonField(text, "is_correct");
  if (typeof isCorrect !== "boolean") return null;

  return {
    is_correct: isCorrect,
    ai_feedback: extractJsonField(text, "ai_feedback") || "批改完成。",
    needs_typo_clarification: extractJsonField(text, "needs_typo_clarification") === true,
    typo_clarification_question: extractJsonField(text, "typo_clarification_question") || "",
  };
}

function salvageMemoryTrick(text) {
  const type = extractJsonField(text, "type");
  const formula = extractJsonField(text, "formula");
  const content = extractJsonField(text, "content");
  const pronunciation_alert = extractJsonField(text, "pronunciation_alert");

  if (!formula && !content) return null;

  return {
    memory_trick: {
      type: typeof type === "string" ? type : "association",
      formula: formula || "",
      content: content || "",
      pronunciation_alert: pronunciation_alert || "",
    },
  };
}

function tryParseJson(text) {
  try {
    return JSON.parse(sanitizeJsonText(text));
  } catch {
    return null;
  }
}

export function parseAiJson(text) {
  let cleaned = String(text || "").trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  const direct = tryParseJson(cleaned);
  if (direct) return direct;

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    const nested = tryParseJson(match[0]);
    if (nested) return nested;
  }

  const source = match?.[0] || cleaned;
  const evaluate = salvageEvaluate(source);
  if (evaluate) return evaluate;

  const memoryTrick = salvageMemoryTrick(source);
  if (memoryTrick) return memoryTrick;

  throw new Error("AI 返回格式无效，请重试");
}
