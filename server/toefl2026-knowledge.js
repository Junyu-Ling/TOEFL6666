/**
 * TOEFL iBT 2026 reform knowledge (effective test dates on/after 2026-01-21).
 * Sources: ETS score scale update, ETS TOEFL Access help center, official test blueprint summaries.
 */
export const TOEFL_2026_KNOWLEDGE = `
## 【必读】当前默认考试版本（2026-01-21 及以后）

今天是 2026 年。用户未特别说明「老托福 / 2026 年 1 月 21 日之前 / 0-120 旧版」时，**一律按 2026 改革后的 TOEFL iBT 回答**，不要默认讲旧版 2 小时、四科各 30 分相加的格式。

分界日期：
- **2026-01-21（含）及以后**：新格式（约 100 分钟、1–6 分制、阅读/听力自适应、新题型）
- **2026-01-21 之前**：旧格式（约 2 小时、0–120 总分、阅读/听力非自适应）

过渡期（约 2 年，至 2028 年前后）：新考试的成绩单同时报告 **CEFR 等级、1–6 分（总分+四科）、以及可比的 0–120 总分**，方便院校对照。旧成绩在 2 年有效期内仍被认可。

出分速度：新格式通常 **72 小时内** 出分（旧版常见 4–8 天）。

---

## 一、整场结构（新托福 iBT 2026）

| 项目 | 内容 |
| --- | --- |
| 总时长 | 约 **100 分钟**（明显短于旧版 ~2 小时） |
| 考试顺序 | **Reading → Listening → Speaking → Writing**（固定，不可调换） |
| 休息 | **无 scheduled break**（无官方中场休息） |
| 形式 | 机考；考点或 Home Edition，内容一致 |
| 语言 | 全英文 |

### 各 Section 时间、题量、题型（官方 Test Blueprint 口径）

| Section | 时长 | 题量/任务 | 主要题型 |
| --- | --- | --- | --- |
| **Reading 阅读** | **35 分钟** | 约 20 题，**2 个自适应模块** | Complete the Words（补全单词字母）；Read in Daily Life（邮件/通知/日程等日常文本）；Read an Academic Passage（学术篇章，约 600–700 词） |
| **Listening 听力** | **29 分钟** | 约 28 题，**2 个自适应模块** | Choose a Response（短句选最佳回应）；Conversation（对话）；Announcement（公告）；Academic Talk（学术讲座，可有图表） |
| **Speaking 口语** | **16 分钟** | **4 个任务**（约 7 轮作答） | **Listen and Repeat**（听句复述，测发音/流利度）；**Take an Interview**（面试式 3 问：观点、二选一、情境描述） |
| **Writing 写作** | **20 分钟** | **3 个任务** | **Build a Sentence**（词块排序成句）；**Write an Email**（约 100–130 词邮件）；**Write for an Academic Discussion**（约 100–150 词学术讨论回应） |

### 与旧版对比（用户问「改了什么」时用）

| 维度 | 旧版（2026-01-21 前） | 新版（2026-01-21 起） |
| --- | --- | --- |
| 总时长 | ~2 小时 | ~100 分钟 |
| 阅读/听力 | 线性，人人同卷 | **多阶段自适应**（见下） |
| 口语 | Independent + 3 Integrated | Listen and Repeat + Take an Interview |
| 写作 | Integrated 作文 + Independent 作文 | Build a Sentence + Email + Academic Discussion |
| 总分 | 四科 0–30 **相加**得 0–120 | 四科 1–6 **平均**（见下） |

---

## 二、自适应（Multistage Adaptive Testing，仅 Reading & Listening）

- 每个 adaptive section 分 **Stage 1（routing 模块）** 与 **Stage 2**。
- Stage 1 表现决定进入 Stage 2 的 **较难或较易** 题组；二阶段难度影响最终 scaled score 的上限空间（答对难题权重更高）。
- **Speaking、Writing 不自适应**，所有考生任务结构相同，按 rubric 评分。
- 备考提示：Reading/Listening 前半程（Stage 1）稳定发挥很重要；听力 **音频只播一遍、一般不能回听**，笔记仍允许。

---

## 三、评分：1–6 分制（2026 核心变化）

### 基本规则（ETS 官方）
- 四科（Reading / Listening / Speaking / Writing）各报告 **1.0–6.0**，步长 **0.5**。
- **总分 = 四科平均分，四舍五入到最近的 0.5 档**（不是旧版四科相加）。
  - 例：四科平均 5.125 → 总分 **5.0**；平均 5.25 → 总分 **5.5**。
- 1–6 分与 **CEFR（A1–C2）直接对齐**；同一分数在四科含义更一致（例如 5 分在各科均对应 C1 档能力描述）。

### CEFR 与 1–6 对照（ETS 官方表，四科与总分同档）

| CEFR | 1–6 分数（总分/四科） |
| --- | --- |
| C2 | 6.0 |
| C1 | 5.5 / 5.0 |
| B2 | 4.5 / 4.0 |
| B1 | 3.5 / 3.0 |
| A2 | 2.5 / 2.0 |
| A1 | 1.5 / 1.0 |

### 院校常见要求换算（ETS 建议，旧 0–120 → 新 1–6）

| 旧总分要求 (0–120) | 建议新总分 (1–6) |
| --- | --- |
| 100 | **5.0** |
| 90 | **4.5** |
| 80 | **4.0** |
| 70 | **3.5** |

### 1–6 总分与旧 0–120 区间对照（ETS 官方，便于读成绩单）

| 新总分 1–6 | 约等于旧总分 0–120 |
| --- | --- |
| 6.0 | 114+ |
| 5.5 | 107+ |
| 5.0 | 95+ |
| 4.5 | 86+ |
| 4.0 | 72+ |
| 3.5 | 58+ |
| 3.0 | 44+ |

成绩单（过渡期）：同时可见 **CEFR、1–6（四科+总分）、可比 0–120 总分**。

---

## 四、各 Section 评分要点（简述）

**Reading / Listening**：机评；除正确率外，自适应难度计入 scaled score。  
**Speaking**：Delivery（发音/流利）、Language Use、Topic Development；Listen and Repeat 侧重 Delivery；Interview 三项都看。人机结合（SpeechRater + 人工）。  
**Writing**：Task Achievement、Coherence、Lexical Resource、Grammar；Build a Sentence 多为自动判分；Email 与 Academic Discussion 为 e-rater + 人工。

---

## 五、回答策略（给 AI 自己）

1. 用户问「托福考什么 / 结构 / 时间 / 分数 / 改革 / 怎么备考」→ **先讲 2026 新格式**，再按需对比旧版。
2. 用户问单词、词义、用法、近反义词 → 正常词汇助教；可顺带联系 **新题型**（如 Complete the Words、Listen and Repeat、Academic Discussion 所需词汇）。
3. 用户明确说「我考的是旧版 / 2025 年的成绩 / 只有 0–120」→ 再讲旧版或换算表。
4. **不要**在未被问及时大段科普旧 Independent/Integrated 口语写作流程当作「当前考试」。
5. 数字以 ETS 官方为准；第三方模考网站的「Stage 2 封顶 4.0 分」等细节若与 ETS 表述冲突，以 ETS「难度影响分数潜力」为准，可说明存在自适应路由机制。
6. 不确定的院校 cutoff、具体题数微调 → 建议查目标院校与 ets.org 最新公告。
`;
