import { chatCompletion } from "./ai-client.js";

const SYSTEM_PROMPT = `你是英语发音批改专家。根据目标单词、标准音节/重音/音标，以及语音识别转写结果，严格判断用户读音是否合格。

必须只返回 json：
{
  "is_correct": true或false,
  "expected_syllables": ["音节1", "音节2"],
  "stress_index": 0,
  "expected_ipa": "/音标/",
  "feedback": "中文反馈，最多3句、120字内",
  "issues": ["具体问题1", "具体问题2"]
}

批改标准（必须严格执行，不可宽松）：
1. 先给出该词的标准音节划分、主重音位置（stress_index 为 0-based）、美式 IPA。
2. 语音识别只能提供文本，但你要结合该词音系规律推断：读错重音、漏读/多读音节、把不发音字母读出来、元音或辅音明显不对，都应判 false。
3. 仅当转写词形与目标词一致，且从音系上判断各音节与重音均合理时，才判 true。转写成了别的词（含近音错词）必判 false。
4. 不发音字母被读出来（如 doubt 的 b、knife 的 k、psychology 的 p）必判 false，并在 issues 中说明。
5. 重音落在错误音节上必判 false（如 RE-ci-pe 而非 re-CI-pe）。
6. 某音节元音明显错误必判 false（如 recipe 读成 /riː/ 开头）。
7. issues 列出所有问题；is_correct=true 时 issues 为空数组。
8. feedback 要指出应对准哪个音节、重音在哪，便于用户改正。`;

function parseAiJson(text) {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI 返回格式无效");

    const candidate = match[0]
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2018\u2019]/g, "'");

    return JSON.parse(candidate);
  }
}

function createConfigError(message, status = 500) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function normalizeResult(raw) {
  const syllables = Array.isArray(raw.expected_syllables)
    ? raw.expected_syllables.map((s) => String(s).trim()).filter(Boolean)
    : [];

  let feedback = String(raw.feedback || "请再听标准音，逐音节跟读。").trim();
  if (feedback.length > 140) feedback = `${feedback.slice(0, 137)}…`;

  const issues = Array.isArray(raw.issues)
    ? raw.issues.map((item) => String(item).trim()).filter(Boolean).slice(0, 4)
    : [];

  const stressIndex =
    typeof raw.stress_index === "number" && raw.stress_index >= 0
      ? Math.min(raw.stress_index, Math.max(syllables.length - 1, 0))
      : 0;

  return {
    is_correct: Boolean(raw.is_correct),
    expected_syllables: syllables,
    stress_index: stressIndex,
    expected_ipa: String(raw.expected_ipa || "").trim().slice(0, 40),
    feedback,
    issues,
  };
}

export async function evaluatePronunciationWithDeepSeek(payload, config = {}) {
  const { word, transcript, alternatives, pronunciationHint } = payload || {};

  if (!word?.trim()) {
    throw createConfigError("缺少单词", 400);
  }

  const heard = String(transcript || "").trim();
  if (!heard) {
    throw createConfigError("缺少语音转写", 400);
  }

  const altList = Array.isArray(alternatives)
    ? alternatives.map((item) => String(item).trim()).filter(Boolean)
    : [];

  const hintBlock = pronunciationHint
    ? `\n读音特别提示（该词易读错）：${pronunciationHint}`
    : "";

  const text = await chatCompletion({
    config,
    maxTokens: 512,
    temperature: 0.2,
    responseFormat: "json",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `目标单词：${word.trim()}
语音识别主结果：${heard}
其他候选：${altList.length ? altList.join(" | ") : "（无）"}${hintBlock}

请严格按音节与重音批改，返回 json。`,
      },
    ],
  });

  return normalizeResult(parseAiJson(text));
}
