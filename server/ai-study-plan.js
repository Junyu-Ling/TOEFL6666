import { chatCompletion, streamChatCompletion } from "./ai-client.js";
import { TOEFL_2026_KNOWLEDGE } from "./toefl2026-knowledge.js";

const SAT_KNOWLEDGE = `
## SAT（Digital SAT）要点

| 项目 | 内容 |
| --- | --- |
| 形式 | 机考（Bluebook），自适应 |
| 结构 | **Reading and Writing** + **Math** 两大部分 |
| 时长 | 约 2 小时 14 分钟（含休息） |
| 分数 | 每科 **200–800**，总分 **400–1600**（两科相加） |
| R&W | 阅读 comprehension + 文法/修辞/词汇语境；54 题，64 分钟，分 2 模块 |
| Math | 代数、进阶数学、数据分析、几何；44 题，70 分钟，分 2 模块；部分题可用计算器 |
| 备考 | 官方 Bluebook 模考；错题按题型（信息题/推断/词汇/语法/数学概念）归类复盘 |
`;

const SYSTEM_PROMPT = `你是专业的托福 / SAT 备考规划师，服务于 TOEFL 6·6·6·6 背单词应用用户。

任务：根据用户实考分数、目标分数与学习数据，输出**个性化提分计划**。

要求：
1. 用清晰中文，Markdown 排版（表格、列表、粗体），便于前端渲染。
2. 先简要诊断：总分差距、最薄弱科目、各科目与目标的差值。
3. 按优先级给出 2–4 周可执行的提分计划（每日/每周任务要具体）。
4. 结合本应用功能给建议：单词练习、生词本/熟词本、词格 LexGrid、阅读词汇配对等。
5. 托福默认按 **2026 新托福（1–6 分制，四科平均为总分）** 解读；用户明确旧版 0–120 时再换算说明。
6. 不要编造院校政策；数字与策略要合理、可执行。
7. 不要输出 HTML；不要把整段包在 \`\`\`markdown 代码块里。`;

function createConfigError(message, status = 500) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function formatScoreBlock(examType, payload) {
  if (examType === "sat") {
    const { currentScores, targetTotal } = payload;
    return `考试：SAT
当前分数：
- 阅读与文法：${currentScores?.readingWriting ?? "未填"}
- 数学：${currentScores?.math ?? "未填"}
- 总分：${currentScores?.total ?? "未填"}
目标总分：${targetTotal ?? "未填"}`;
  }

  const { currentScores, targetTotal } = payload;
  return `考试：托福（2026 新格式 1–6 分制）
当前分数：
- 阅读：${currentScores?.reading ?? "未填"}
- 听力：${currentScores?.listening ?? "未填"}
- 口语：${currentScores?.speaking ?? "未填"}
- 写作：${currentScores?.writing ?? "未填"}
- 总分（四科平均）：${currentScores?.total ?? "未填"}
目标总分：${targetTotal ?? "未填"}`;
}

function buildUserPrompt(payload) {
  const {
    examType,
    currentScores,
    targetTotal,
    vocabProgress,
    examDates,
    daysUntilExam,
  } = payload;

  const lines = [
    formatScoreBlock(examType, { currentScores, targetTotal }),
    "",
    "学习数据：",
    `- 熟词本：${vocabProgress?.recognized ?? 0} 词`,
    `- 生词本：${vocabProgress?.unrecognized ?? 0} 词`,
  ];

  if (examDates?.length) {
    lines.push(`- 已标记考试日期：${examDates.join("、")}`);
  }
  if (typeof daysUntilExam === "number") {
    lines.push(`- 距最近一场考试：${daysUntilExam} 天`);
  }

  lines.push("", "请分析薄弱点并制定针对性提分计划。");
  return lines.join("\n");
}

function buildMessages(payload) {
  const examType = payload?.examType === "sat" ? "sat" : "toefl";
  const knowledge = examType === "sat" ? SAT_KNOWLEDGE : TOEFL_2026_KNOWLEDGE;

  return [
    { role: "system", content: `${SYSTEM_PROMPT}\n\n${knowledge}` },
    { role: "user", content: buildUserPrompt({ ...payload, examType }) },
  ];
}

function validatePayload(payload) {
  const examType = payload?.examType === "sat" ? "sat" : "toefl";
  const currentScores = payload?.currentScores || {};
  const targetTotal = payload?.targetTotal;

  if (examType === "sat") {
    if (currentScores.total == null) {
      throw createConfigError("请先填写完整的 SAT 实考分数", 400);
    }
    if (targetTotal == null) {
      throw createConfigError("请先填写 SAT 目标总分", 400);
    }
    return;
  }

  if (currentScores.total == null) {
    throw createConfigError("请先填写完整的托福实考分数（四门）", 400);
  }
  if (targetTotal == null) {
    throw createConfigError("请先填写托福目标总分", 400);
  }
}

export async function generateStudyPlan(payload, config = {}) {
  validatePayload(payload);
  const text = await chatCompletion({
    config,
    maxTokens: 4096,
    temperature: 0.4,
    messages: buildMessages(payload),
  });
  return { plan: text.trim() };
}

export async function* streamStudyPlan(payload, config = {}) {
  validatePayload(payload);
  yield* streamChatCompletion({
    config,
    maxTokens: 4096,
    temperature: 0.4,
    messages: buildMessages(payload),
  });
}
