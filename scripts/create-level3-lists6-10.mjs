import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../public/api/wordlists");

const LISTS = {
  6: `
atmosphere: n. 大气；氛围
originality: n. 独创性
regulation: n. 规定，管理
reinvent: v. 彻底改变，重新定义
adventure: n. 冒险活动
faint: adj. 微弱的；v. 昏倒
faculty: n. 全体教员；n. 才能；n. 官能
purity: n. 纯净，纯洁
statistical: adj. 统计的
kneel: v. 跪下
utilize: v. 利用
persuasive: adj. 有说服力的
invade: v. 入侵
ruin: v. 破坏；n. 废墟
approve: v. 赞成，批准
shallow: adj. 浅的；adj. 肤浅的
dealer: n. 经销商，交易人
poisonous: adj. 有毒的
reliable: adj. 可靠的
lengthen: v. 延长
organism: n. 有机体
unstable: adj. 不稳定的
massive: adj. 大规模的
imaginative: adj. 富于想象力的
string: n. 细绳，弦；n. 弦乐器；v. 给……上弦
myth: n. 神话传说；n. (普遍的)错误观点
summary: n. 总结
project: n. (研究)项目；v. 投掷，投影；v. 预测
angular: adj. 有尖角的
combine: v. 使结合
reveal: v. 披露，展现
fatty: adj. 脂肪的，高脂的
preparedness: n. 准备状态
plural: adj. 复数的
attempt: n. 企图
dare: v. 敢
means: n. 方法；n. 财富
wool: n. 羊毛，绒线
reward: n. 报答，酬劳
analyze: v. 分析
vote: v. 投票
walkway: n. 走道
transfer: v. 转移；v. 转让
noticeable: adj. 明显的
fold: n. 褶皱；v. 折叠
label: n. 标签；v. 贴标签于；v. 归类
unexplored: adj. 未经勘探的
mechanization: n. 机械化
discount: n. 折扣，贴现；v. 打折出售；v. 不予考虑
permission: n. 许可
transform: v. 改变
explosive: n. 炸药；adj. 爆炸性的
systematic: adj. 系统的
misfortune: n. 厄运，不幸
engagement: n. 订婚；n. 交战
mismatch: n. 不匹配
conquer: v. 征服，攻克
option: n. 选择
skyscraper: n. 摩天大楼
consume: v. 吃，喝，消化；v. 消耗，消费
cap: n. 帽子；n. 上限；n. (蘑菇的)上部
complex: adj. 复杂的；n. 复合物；n. 建筑群
expressive: adj. 表现情感或思想的
greet: v. 招呼
inconvenient: adj. 不方便的
puzzle: n. 难题；v. 使……困惑
dense: adj. 密度大的；adj. 浓密的
guidance: n. 指导
unimproved: adj. 未改善的
flexible: adj. 灵活的
schedule: v. 安排；n. 日程表
threaten: v. 威胁
radiate: v. 辐射；v. 散发
initially: adv. 起初
logical: adj. 逻辑的；adj. 合乎逻辑的
security: n. 安全，安全措施；n. 保安部门；n. 证券
overcome: v. 击败；v. 克服(困难)
probability: n. 可能性；n. 概率
occurrence: n. (事件的)发生
extent: n. 程度
localize: v. 确定……的地点；v. 使局部化，使本土化
trace: n. 痕迹；v. 查出，追溯；v. 描摹
warrior: n. 武士
tone: n. 音调；n. 口气；v. (使事情)变得缓和
investor: n. 投资者
inherit: v. 继承；v. 遗传
division: n. 分开，分配；n. 除法；n. 部门
confusing: adj. 令人疑惑的
relativity: n. 相对性
sketch: v. 草拟；n. 草图，素描
scope: n. 范围；n. 考量
permanent: adj. 永恒不变的
measurement: n. 尺寸，测量
focus: v. 聚焦；n. 焦点；v. 集中(注意力)
debate: n. 辩论
accessible: adj. 易接近的，易获得的；adj. 可理解的
pretend: v. 假装
examine: v. 检查
pro: n. 专业人员；n. 益处
historic: adj. 历史性的
`.trim(),
  7: `
redistribution: n. 重新分配
supernatural: adj. 超自然的
resistance: n. 抵抗(力)
hemisphere: n. 半球
coach: v. 训练；n. 教练；n. 轿式马车，长途客车，经济舱
sole: adj. 惟一的；n. 鞋底，脚底，底
rush: v. 冲；n. 仓促行动
connect: v. 连接
reluctant: adj. 不情愿的
convince: v. 说服，使……信服
emotion: n. 情绪；n. 感性
athletics: n. 田径运动
plug: n. 插头，塞子；v. 塞住，插入插座
reorganize: v. 重新组织
neat: adj. 整齐的，巧妙的
astonish: v. 使惊奇
spotlight: n. 聚光灯；v. 用聚光灯照，突出
digestive: adj. 助消化的
found: v. 创立
reschedule: v. 将……改期
imply: v. 暗示
polish: v. 擦亮；n. 波兰语，波兰人，波兰的；adj. 精湛
insignificant: adj. 微不足道的
paste: n. 面团，浆糊；v. 粘贴
favor: v. 赞同，偏袒；n. 特殊照顾，好处；n. 善举
voyage: n. 航行
biodiversity: n. 生物多样性
examination: n. 检查；n. 考试
urge: v. 催促；n. 强烈的意愿
independent: adj. 独立的
criticize: v. 批评
divider: n. 隔板
impression: n. 印象；n. 滑稽模仿
inclusion: n. 包括
thrive: v. 茁壮成长
redirect: v. 使……改变方向
definitely: adv. 确实地
depress: v. 使沮丧；v. 使萧条
discipline: n. 纪律，惩罚；v. 训导，惩罚；n. 学科
curriculum: n. 课程体系
botany: n. 植物学
majority: n. 大多数者
explode: v. 爆炸
shuttle: n. 往返运输；n. 太空穿梭机
bark: v. 吠，咆哮；n. 树皮
medium: n. 媒介；adj. 中等
illustrate: v. 阐释；v. 插图
interrupt: v. 打断
wipe: v. 擦去
continuity: n. 连续性
consist: v. 由……组成
maintain: v. 维持，供养；v. 坚称
refill: v. 重新注满
cliff: n. 悬崖
extraordinary: adj. 非凡的
extra: adj. 额外的，多余的；n. 额外的事物
minimize: v. 将……减少到最低限度；v. 轻描淡写
connection: n. 连接；n. 关系
faulty: adj. 有缺陷的，错误的
heroic: adj. 英勇的；adj. 与传说中的英雄有关的
cattle: n. 牛
mass: n. (物理中的)质量；n. 普通大众；adj. 大规模的
universal: adj. 普遍的；adj. 宇宙的
inadequate: adj. 不够的
destination: n. 目的地
general: adj. 普遍的，总的；n. 将官
realization: n. 实现；n. 意识
impact: n. 撞击；n. 影响
oven: n. 烤箱
handy: adj. 好用的
ecosystem: n. 生态系统
participate: v. 参与
laboratory: n. 实验室
define: v. 给……下定义
awareness: n. 意识
nutritious: adj. 有营养的
con: n. 诈骗；n. 反对
mill: n. 磨坊，厂
resource: n. 资源
terrify: v. 使恐惧
gathering: n. 聚会；adj. 渐增的
acceptance: n. 接受
unsupported: adj. 无支援的
projector: n. 幻灯机
overtime: n. 加班时间，加时赛；v. 加班
appoint: v. 任命
certify: v. 证明
heighten: v. 加高；v. 增强
indication: n. 迹象
factual: adj. 事实的
refer: v. 表示，指代；v. 涉及；v. 参考
perfection: n. 完美
experimental: adj. 试验性的
charge: n. (收取)费用；n. 指控；v. 主管
currency: n. 货币
variety: n. 各种各样
fate: n. 命运
brief: adj. 短暂的；adj. 简洁的
satellite: n. (人造)卫星
civil: adj. 公民的，民用的；adj. 文明的；adj. 民事的
`.trim(),
  8: `
labor: n. 劳动；n. 劳工
comparative: adj. 相对的；adj. 比较的
considerate: adj. 体贴的
comical: adj. 滑稽的
preservation: n. 保存；n. 防腐
flatten: v. 把……压平
concern: n. 担心；v. 与……有关
modernization: n. 现代化
nutrient: n. 营养物
pave: v. 铺
nest: n. 窝；v. 筑巢
economical: adj. 经济的，节省的
micro: adj. 微观的
invisible: adj. 看不见的
quantify: v. 量化
defend: v. 保卫；v. 为……辩解
donate: v. 捐赠
outline: n. 轮廓；v. 画轮廓，打草图；v. 概述
biographer: n. 传记作者
command: n. 命令
profile: n. 侧面，形象；v. 简要介绍
harvest: n. 收成；v. 收割
graceful: adj. 优雅的
column: n. 柱子；n. 专栏
regularize: v. 使规范化
loner: n. 独来独往的人
spoil: v. 糟蹋；n. 战利品；v. 溺爱
significant: adj. 重要的
concrete: n. 混凝土；adj. 具体的，实在的
civilization: n. 文明；n. 开化过程
incline: v. 使倾向于；v. 弯，倾斜；n. 斜坡
extreme: n. 极端；adj. 极端的
consideration: n. 考虑；n. 考虑因素
considerable: adj. 相当大的
concentrate: v. 集中
object: n. 物品，对象；v. 反对
scale: n. 秤；n. 等级，规模，比例；v. 按比例调整大小
predictive: adj. 预测性的
divorce: n. 离婚；v. 分离
fiction: n. 虚构文学
tissue: n. 组织；n. 纸巾
wise: adj. 明智的
headquarters: n. 总部
comparison: n. 比较
slip: v. 滑脱；v. 轻巧地移动
sue: v. 起诉
probable: adj. 很可能的
redefine: v. 重新定义
preference: n. 偏爱
dependence: n. 依靠；n. 成瘾
shipyard: n. 造船厂
occupation: n. 职业；n. 占据
expand: v. 扩大
migrate: v. 迁移
bother: v. 打扰；v. (为做某事)承受麻烦
buildup: n. 积累
settlement: n. 定居点；n. 协议
simplicity: n. 简单
critique: n. 评论
intend: v. 计划；v. 意指
consult: v. 咨询
sort: n. 类；v. 整理
harsh: adj. 严苛的，尖锐的
construction: n. 建造
stock: n. 库存；n. 股票；adj. 标准的，普通的
reflect: v. 反映；v. 反射；v. 深思
spot: n. 点，污渍；v. 发现
disregard: v. 不理会；n. 忽视
somewhat: adv. 有点
prolong: v. 延长
humanity: n. 人性；n. 人类
magnet: n. 磁铁；n. 有吸引力的东西或人
perform: v. 表现，运行；v. 正式进行，施行(某事)
portion: n. 一部分
grant: v. 准予，授予；n. 拨款
mobile: adj. 可移动的
survey: n. 勘查；n. (数据)调查
imperfection: n. 缺陷
mythical: adj. 虚构的；adj. 神话的
series: n. 一系列
theme: n. 主题
restless: adj. 躁动的
far-reaching: adj. 影响面广的
routine: n. 惯例；adj. 常规的
inhabitant: n. 居民
detect: v. 查明
drip: v. 滴下；n. 液滴
prime: adj. 首要的；adj. 最好的；n. 盛年
physiological: adj. 生理上的
reunite: v. (使……)再联合
manufacture: v. (大量)生产
harbor: n. 港湾；v. 藏匿
conceal: v. 隐藏
fame: n. 名声
reduction: n. 减少
context: n. 情境；n. 上下文
obtain: v. 获得
rapid: adj. 快速的
draft: n. 打草稿；v. 征募；n. 气流
output: n. 产量；n. 输出
`.trim(),
  9: `
spectator: n. 观众
corporation: n. 大公司
democracy: n. 民主
disrupt: v. 打断
resident: n. 居民；adj. 常住的
persuade: v. 说服
ancestor: n. 祖先
statistics: n. 统计数字
coexist: v. 共存
arise: v. 发生，出现
session: n. 会议；n. 学期，上课时间；n. 一段时间
totality: n. 全体
conflict: n. 冲突
productive: adj. 高产的；adj. 富有成效的
illusion: n. 幻觉
nutrition: n. 营养(作用)
pot: n. 锅，茶壶，罐
folk: n. 人们；adj. 民间的
petroleum: n. 石油
willingness: n. 乐意
unify: v. 统一
exhibit: v. 展现
bold: adj. 大胆的；adj. 醒目的；n. 粗体
unquestionable: adj. 无疑的
host: v. 主持；n. 主人；n. 宿主
agriculture: n. 农业
roll: v. 翻滚；n. 花名册
widespread: adj. 广泛的
breadth: n. 宽度，广度
partnership: n. 合伙关系，合伙人身份
publicity: n. 媒体关注度；n. 宣传
solely: adv. 完全地
humble: adj. 谦逊的；adj. 低下的；v. 羞辱，击败
diligently: adv. 勤勉地
flame: n. 火焰
unpredictable: adj. 不可预测的
cope: v. 应付
immigrate: v. (从外部)移民
domestic: adj. 国内的；adj. 家务的
monument: n. 纪念碑，纪念物
profitable: adj. 盈利的；adj. 富有成效的
luxury: n. 奢侈，奢侈品
positive: adj. 确定的；adj. 积极的；adj. 正的，阳性的
incoming: adj. 将到的；adj. 刚收到的；adj. 新上任的
graphical: adj. 图形的
imaginary: adj. 虚构的
rate: n. 速度，率；v. 给……评级
firmly: adv. 牢牢地；adv. 坚决地
slice: v. 把……切成薄片；n. 一片
navigate: v. 航行，驾驶；v. 导航
temporary: adj. 暂时的
restrain: v. 抑制
comparable: adj. 相似的；adj. 有可比性的
individualism: n. 个人主义
rural: adj. 农村的
tidy: adj. 整洁的；v. 收拾
limitation: n. 限制；n. 局限
fashionable: adj. 时髦的
generate: v. 产生
protective: adj. 防护性的；adj. 有保护欲的
upstream: adv. 往上游；adj. 在上游的
dramatic: adj. 戏剧的；adj. 急剧的
supplier: n. 供货商
geologist: n. 地质学家
drought: n. 旱灾
flyer: n. 传单；n. 飞行员
elevate: v. 抬高
instability: n. 不稳定
fountain: n. 喷泉
convenience: n. 方便
embarrass: v. 使尴尬
performance: n. 表演；n. 执行；n. 性能
ridiculous: adj. 可笑的
specialization: n. 专业化
diversity: n. 多样性，差异性
civilian: n. 平民
imitate: v. 模仿
philosopher: n. 哲学家
innovate: v. 革新
deprive: v. 剥夺
workshop: n. 车间；n. 研讨班
outweigh: v. 比……重
welfare: n. 福利(事业)；n. 幸福
hallway: n. 走廊
frequency: n. 频率
log: n. 原木；v. 伐木；v. 记录
longevity: n. 长寿
modest: adj. 谦虚的；adj. 有节制的
notion: n. 意见；n. 念头
breast: n. 胸部
uneducated: adj. 未受教育的
abstract: adj. 抽象的；n. 摘要
financial: adj. 财政的
advocate: v. 拥护；n. 拥护者
grain: n. 谷物；n. 小颗粒，小晶体
endure: v. 忍受；v. 持续存在
enhance: v. 增强
ambitious: adj. 有志向的
notable: adj. 值得注意的
observe: v. 观察
`.trim(),
  10: `
introductory: adj. 引导的，序言的
forgetful: adj. 疏忽的
automobile: n. 汽车
effective: adj. 有效的
detector: n. 探测器
reliance: n. 依赖
strictly: adv. 严格地
lengthy: adj. 漫长的
royal: adj. 皇室的；n. 皇室成员
mere: adj. 仅仅
address: n. 讲话；v. 处理；n. 地址
elect: v. 选举；adj. 精心挑选的
signature: n. 签名；n. 鲜明特征
likelihood: n. 可能性
mountainous: adj. 多山的；adj. 巨大的
calendar: n. 日历
joint: n. 关节，接合处；adj. 联合的
justice: n. 公正；n. 司法
publication: n. 出版物
negative: adj. 否定的，负面的；adj. 消极的；adj. 负的，阴性的
twinkle: v. 闪烁
contract: n. 合同；v. 收缩；v. 感染
restrictive: adj. 限制性的
memorable: adj. 难忘的
proof: n. 证据，验证; suffix. (后缀)可以抵抗的
texture: n. 质地
originate: v. 起源；v. 创作
emigrate: v. 移居国外
curve: n. 曲线；v. 使……弯曲，沿曲线前进
investigate: v. 研究调查
electronics: n. 电子学，电子器件
defensive: adj. 防御的；adj. 有戒心的
outstanding: adj. 杰出的，突出的
precise: adj. 准确的
practical: adj. 实用的
status: n. 状况；n. 地位
graduation: n. 毕业；n. 毕业典礼
determination: n. 决心
enroll: v. 招生；v. 注册参加
legendary: adj. 传说的；adj. 赫赫有名的
browse: v. 浏览；v. (吃)嫩枝叶
slightly: adv. 稍微
dimension: n. 尺寸，面积；n. 维度；n. 方面
weed: n. 野草；v. 除草
necessity: n. 必需品；n. 必要
emergency: n. 紧急情况
journalism: n. 新闻业，新闻报道
steady: adj. 稳定的
auditorium: n. 礼堂
translate: v. 翻译；v. 转换
unaware: adj. 未意识到的
triumph: n. 胜利
reform: n. 改革
terminal: n. 终点(站)；adj. 终端(的)；adj. 晚期的
calculate: v. 计算
inspiration: n. 灵感
interrelationship: n. 相互关联
realm: n. 领域
theory: n. 学说，理论
herd: n. 兽群；v. 放牧
dive: v. 跳水，潜水；v. 俯冲
absorb: v. 吸收
finance: n. 财政；v. 为……提供资金
decoration: n. 装饰
genius: n. 天才
leak: n. 裂缝；v. 渗漏；v. 泄露
annual: adj. 年度的
uncommon: adj. 不寻常的
superior: adj. 高级的
resist: v. 抗拒
fascinate: v. 迷住
peek: v. 偷看
covering: n. 遮盖物
make-up: n. 构成；n. 化妆
decline: n. 下降；v. 恶化；v. 婉拒
intense: adj. 剧烈的
military: adj. 军队的；n. 军方
participant: n. 参与者
fortune: n. 运气，命运；n. 大笔财产
administer: v. 管理
lighten: v. 照亮；v. 变轻，缓和
route: n. 路线；v. 按路线发送
genetic: adj. 基因的
unity: n. 统一的状态；n. 整体性
unite: v. 联合
instantly: adv. 立即
release: v. 释放；n. 发行，声明
leaflet: n. 传单
tolerate: v. 容许，忍受
typical: adj. 典型的
vapor: n. 蒸汽；v. 蒸发
sink: v. 下沉；v. 沦落
tie: v. 捆，绑；n. 关联；n. 领带
craft: n. 手艺；v. 熟练地制作；n. 船，飞船
channel: n. 水渠；v. 引导；n. 电视频道
faith: n. 信仰；n. 信任
diagram: n. 示意图
relevant: adj. 有关的，恰当的
disprove: v. 证明……是虚假的
shade: n. 色度，细微差别；n. 阴影；v. 遮挡
toxic: adj. 有毒的
slope: n. 斜坡；v. 使倾斜
association: n. 协会；n. 关联
vision: n. 视力；n. 眼力；n. 幻想
accomplish: v. 成就
suffer: v. 遭受；v. 受苦
priority: n. 优先(的)
remainder: n. 剩余物；n. 廉价出售
foresee: v. 预见
revenue: n. 收入
usage: n. 习俗，用法；n. 习语
appreciate: v. 感谢；v. 欣赏；v. 升值
embrace: v. 拥抱；v. 欣然接受
severe: adj. 严重的
summarize: v. 总结
survival: n. 生存
represent: v. 代表；v. 相当于；v. 声称
ecology: n. 生态学
`.trim(),
};

function parseLine(line) {
  const colon = line.indexOf(":");
  const word = line.slice(0, colon).trim();
  const defs = line
    .slice(colon + 1)
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean);
  return { word, definitions: defs };
}

const updatedAt = new Date().toISOString().slice(0, 10);
const manifestPath = path.join(dir, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

for (const [listNum, raw] of Object.entries(LISTS)) {
  const list = Number(listNum);
  const words = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => parseLine(line));

  const data = {
    meta: {
      level: 3,
      list,
      title: `Level 3 · List ${list}`,
      updatedAt,
    },
    words,
  };

  const outPath = path.join(dir, `level3-list${list}.json`);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));

  manifest.lists = manifest.lists.filter((l) => l.id !== `level3-list${list}`);
  manifest.lists.push({
    id: `level3-list${list}`,
    title: data.meta.title,
    level: 3,
    list,
    wordCount: words.length,
  });

  console.log(`Created level3-list${list}.json with ${words.length} words`);
}

manifest.updatedAt = updatedAt;
manifest.lists.sort((a, b) => a.level - b.level || a.list - b.list);
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log("Updated manifest.json");
