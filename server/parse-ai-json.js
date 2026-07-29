export function parseAiJson(text) {
  let cleaned = String(text || "").trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  const sanitize = (input) =>
    String(input)
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/:\s*true或false/gi, ": true")
      .replace(/:\s*false或true/gi, ": false")
      .replace(/:\s*true\s*\|\s*false/gi, ": true")
      .replace(/"type"\s*:\s*"[^"]*或[^"]*"/gi, '"type": "association"');

  try {
    return JSON.parse(sanitize(cleaned));
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI 返回格式无效，请重试");

    try {
      return JSON.parse(sanitize(match[0]));
    } catch {
      throw new Error("AI 返回格式无效，请重试");
    }
  }
}
