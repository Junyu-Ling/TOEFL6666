import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../public/api/wordlists");

const LEVEL = 4;

const LISTS = {
  8: `
unequaled: adj. 空前的
harshness: n. 恶劣
fiber: n. 纤维
immigrant: n. 移民
immune: adj. 免疫的
distress: n. 痛苦
institution: n. 设立
argumentative: adj. 好争论的，议论文的
filter: v. 过滤
renewable: adj. 可再生的
nonetheless: adv. 尽管如此
composer: n. 作曲家
utilization: n. 利用
stellar: adj. 恒星的
enlist: v. 入伍
stun: v. 使震惊
formulate: v. 构想
mute: adj. 缄默的
intermediate: adj. 中间的
plum: n. 李子; adj. 称心如意的
wreck: v. 毁坏; n. 沉船; n. 失事
sensory: adj. 感觉的
irresistible: adj. 不可抗拒的
showcase: v. 展示
unobtainable: adj. 得不到的
ration: v. 定量供应
moderate: adj. 温和的，节制的
peak: n. 山顶，巅峰
hormone: n. 激素
per capita: adj. 人均
conversion: n. 转化
miscalculate: v. 算错
recurrence: n. 再现
ironic: adj. 讽刺的
progression: n. 发展
mimic: v. 模仿
hallmark: n. 特点
forehead: n. 前额
dictate: v. 发号施令
endeavor: n. 努力
longitude: n. 经度
drama: n. 戏剧
infect: v. 传染
symptom: n. 症状
ceremonial: adj. 仪式的
latitude: n. 纬度
sacred: adj. 神圣的
chill: adj. 寒冷的; n. 寒冷
taxation: n. 征税
gross: adj. 粗俗的
vibrant: adj. 充满生机的
consequence: n. 结果; n. 重要性
compensate: v. 补偿
harmonious: adj. 和谐的
plumb: adj. 垂直的
stimulate: v. 刺激
format: n. 样式
practicality: n. 可行性
hay: n. 干草
spill: v. 溢出
blast: n. 爆炸
infinite: adj. 无限的
inquire: v. 询问
split: v. 分开
merge: v. 合并
abbreviate: v. 缩短
vague: adj. 模糊的
ditch: v. 抛弃; n. 排水沟
respective: adj. 各自的
roast: v. 烤
tablet: n. 写字板
adequate: adj. 足够的
ray: n. 光线
barren: adj. 贫瘠的
disgust: n. 厌恶
mythic: adj. 神话的
shrinkage: n. 缩水
pesticide: n. 杀虫剂
oversee: v. 监督
correspond: v. 相符; v. 相当于; v. 通信
droplet: n. 小滴
dissolve: v. 溶解
rehearsal: n. 排练; n. 复述
pore: n. 孔
synthesis: n. 合成
improbable: adj. 不大可能发生的
reproduce: v. 繁殖
irrelevant: adj. 不相关的
catalyst: n. 催化剂
transit: n. 运输
rib: n. 肋骨
spark: v. 引发; v. 冒火花; n. 火花
merchant: n. 商人
encircle: v. 围绕
glow: n. 光亮
chamber: n. 洞穴; n. 房间
plow: n. 犁
windmill: n. 风车
ecologist: n. 生态学家
asteroid: n. 小行星
`.trim(),
  9: `
compile: v. 汇编
disharmony: n. 不一致
thermal: adj. 热的
comprehensive: adj. 全面的
transplant: v. 移植
craze: n. 狂热
differentiate: v. 区分
facial: adj. 面部的; n. 美容
strive: v. 力争
bounce: v. 反弹
violet: adj. 紫罗兰的; n. 紫罗兰
ratio: n. 比例
acidity: n. 酸性
entity: n. 实体
ripe: adj. 成熟的
diversification: n. 多样化
envision: v. 想象
loop: n. 环形
landmark: n. 里程碑
protectionist: n. 贸易保护主义者
overtake: v. 超过
virtue: n. 美德; n. 优点
pitch: n. 强度; n. 音调; n. 场地
reserve: v. 保存
matrix: n. 环境; n. 矩阵
versatile: adj. 多用途的; adj. 多才多艺的
dominate: v. 控制; v. 主导
scarce: adj. 稀有的
starch: n. 淀粉
convention: n. 传统; n. 会议
deplete: v. 消耗
coil: v. 盘起
sponge: n. 海绵
peck: v. 啄
upright: adj. 垂直的
marshland: n. 沼泽地
drastic: adj. 剧烈的
rip: v. 撕破
landmass: n. 陆地
counsel: n. 劝告
distinct: adj. 分开的
pollinate: v. 给……授粉
speculate: v. 猜测
fatal: adj. 致命的
retreat: v. 撤退
react: v. 反应
metropolitan: adj. 大都市的
representation: n. 代表
hollow: adj. 中空的
lap: n. 大腿部
aspect: n. 方面
interior: n. 内部
consistent: adj. 一致的
coherent: adj. 连贯一致的
retain: v. 保持
sector: n. 部分; n. 行业
hamper: v. 阻碍
impressive: adj. 令人印象深刻的
interfere: v. 干涉
accustom: v. 习惯
recur: v. 反复出现
bound: adj. 限制的; adj. 一定的
anchor: v. 使固定; n. 新闻主持人; n. 锚
inhibit: v. 抑制
commission: n. 委员会
watertight: adj. 不漏水的
temperate: adj. 气候温和的; adj. 有节制的
identifiable: adj. 可辨别的
hardy: adj. 强壮的
chunk: n. 大块
lease: v. 出租; n. 租约
rub: v. 摩擦
spin: v. 快速转动
verify: v. 证实
aromatic: adj. 芳香的
tap: v. 汲取液体; v. 轻敲
vastly: adv. 极大地
feat: n. 功绩
Mediterranean: adj. 地中海的
distinctive: adj. 有特色的
frost: n. 霜冻
extensive: adj. 广泛的
feasible: adj. 可行的
approximate: adj. 大约的
swirl: v. 旋转
rectangular: adj. 长方形的
administer: v. 管理
cushion: v. 保护; n. 垫子
complement: v. 补充
conductivity: n. 传导性
steadily: adv. 平稳地
wavelength: n. 波长
odor: n. 气味
privilege: n. 特权
glacier: n. 冰川
gut: n. 内部; n. 勇气
negligible: adj. 可忽略不计的
`.trim(),
  10: `
migrant: adj. 迁徙的
critical: adj. 关键的
conceive: v. 想出
decay: v. 腐烂; n. 衰变
avoidance: n. 逃避
apparatus: n. 设备
subscribe: v. 赞同; v. 订阅
oversimplification: n. 过于简单化
explosion: n. 爆炸; n. 激增
process: n. 过程; v. 处理
evaluate: v. 评价
cluster: v. 聚集; n. 群，簇
intervention: n. 干涉
suspicious: adj. 怀疑的; adj. 可疑的
fierce: adj. 猛烈的
large-scale: adj. 大规模的
exhaust: v. 耗尽
excess: n. 过量
bust: v. 弄坏; n. 半身雕像
mediate: v. 调解
assess: v. 评价
carve: v. 刻
interdependence: n. 相互依赖
trait: n. 特点
justify: v. 是……的正当理由
conception: n. 概念
forerunner: n. 先驱
autonomous: adj. 自主的
gymnastic: adj. 体操的
unevenly: adv. 不均等地
expenditure: n. 开支
splash: v. 溅起
hibernate: v. 冬眠
predatory: adj. 捕食性的
essence: n. 本质
corruption: n. 贪污
median: adj. 中等的; n. 中位数
devastate: v. 毁灭; v. 使……极为悲痛
revival: n. 恢复; n. 复兴
heredity: n. 遗传
projection: n. 放映; n. 预期，预测
spray: v. 喷
thereby: adv. 因此
exert: v. 应用; v. 运用
skull: n. 头骨
rag: n. 破布
assign: v. 指派
questionnaire: n. 问卷
discredit: v. 使不可信
suspect: v. 怀疑
mold: n. 模具; v. 塑造; v. 发霉
agent: n. 剂; n. 代理人，特工
timescale: n. 时间段
tin: n. 金属罐
endanger: v. 危害
rebellion: n. 反抗
ensure: v. 保证
sculpture: n. 雕塑
enforce: v. 强制实施
audition: n. 试镜
clearing: n. 林中空地
manual: n. 使用手册
blacksmith: n. 铁匠
wander: v. 漫步
boom: n. 繁荣; v. 激增
phoenix: n. 凤凰
maximal: adj. 最大的
physiology: n. 生理学
virtual: adj. 实质上的; adj. 虚拟的
dim: v. 使减小; adj. 昏暗的; v. 使……黯然失色
attribute: v. 归于; n. 特点
conformity: n. 遵守; n. 符合
incur: v. 引起; v. 遭受
contradict: v. 与……矛盾; v. 反驳
rid: v. 摆脱
lunar: adj. 月亮的
dispute: n. 争论
humiliate: v. 羞辱
disruption: n. 扰乱
flaw: n. 瑕疵
granite: n. 花岗岩
quest: n. 追寻
court: v. 向……求偶; n. 宫廷，法庭; n. 球场
devotion: n. 投入
assume: v. 猜想
undertake: v. 承担
posit: v. 假设
frown: v. 皱眉
hypothesis: n. 假设
consolidate: v. 加固
commute: v. 往返上下班
generalization: n. 概括
hybrid: n. 混合物
aggressiveness: n. 攻击
deficit: n. 缺陷; n. 赤字
ultimately: adv. 最终
collaborate: v. 合作
rodent: n. 啮齿动物
drown: v. 淹没
flock: n. 群
problematic: adj. 造成困难的; adj. 值得怀疑的
restoration: n. 恢复
maritime: adj. 海洋的
panic: n. 恐慌
encounter: v. 遭遇
hostile: adj. 有敌意的
reclaim: v. 开垦
aluminum: n. 铝
dynasty: n. 王朝
eliminate: v. 消除
definite: adj. 明确的
equator: n. 赤道
twist: v. 缠绕; v. 扭转
mechanism: n. 机械装置; n. 机制
identification: n. 辨认; n. 认同
sighting: n. 察觉; n. 看到
procedure: n. 工序; n. 过程
radius: n. 半径; n. 半径范围
rectangle: n. 长方形; n. 长方形物
perimeter: n. 边缘; n. 周长
voltage: n. 电压
proverb: n. 谚语
memorial: n. 纪念碑; n. 纪念物
stir: v. 搅动; v. 激起，激怒
cart: n. 马车
curtain: n. 帘幕，窗帘; v. 遮蔽
lawn: n. 草地，草坪
tag: n. 标签; v. 给……加标签，把……称作
dash: v. 猛冲，冲击; n. 破折号
domain: n. 领土; n. 领域
stove: n. 灶台
necklace: n. 项链
installation: n. 安装; n. 就职
parade: n. 游行; n. 阅兵
tick: v. (打)钩; v. (钟表)滴答响
aroma: n. 芳香
tribute: n. 颂词; n. 赞颂
energetic: adj. 精力旺盛的; adj. 强健的
primate: n. 灵长目动物
sneaker: n. 运动鞋
tattoo: n. 文身(图案)
cancer: n. 癌; n. 巨蟹座
cautious: adj. 谨慎的; adj. 小心的
belly: n. 胃，腹部; v. 使……鼓起
tournament: n. 锦标赛
waist: n. 腰; n. 腰围
accusation: n. 指控
bargain: n. 便宜货; v. 讲条件，讨价还价; n. 协议
extension: n. 延长部分; n. 延期
immigration: n. 移民入境
jealous: adj. 嫉妒的
medication: n. 药物治疗; n. 药物
paraphrase: v. 换一种方式表达
receipt: n. 收据
scar: v. 给……留下创伤; n. 伤疤
audible: adj. 听得见的
fireworks: n. 烟火
graphic: adj. 图形的; adj. 生动的
license: v. 给……发许可证
throne: n. 宝座; n. 王权
awkward: adj. 笨拙的，粗劣的; adj. 令人不适的，尴尬的
crisp: adj. 松脆的; n. 炸薯片
disclose: v. 使……显露; v. 透露
earnest: adj. 热心的; adj. 诚挚的
aisle: n. 走道
malfunction: v. (发生)故障
medal: n. 勋章
newsletter: n. 通告; n. 业务通讯
slot: n. 狭缝，槽沟，投币口; n. 时间段; n. 吃角子老虎机
sore: adj. 感到疼痛的; n. 疮，痛处
torrent: n. 急流
trademark: n. 商标; n. 特征
visualize: v. 使形象化; v. 预想
wig: n. 假发
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
      level: LEVEL,
      list,
      title: `Level ${LEVEL} · List ${list}`,
      updatedAt,
    },
    words,
  };

  const id = `level${LEVEL}-list${list}`;
  const outPath = path.join(dir, `${id}.json`);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));

  manifest.lists = manifest.lists.filter((l) => l.id !== id);
  manifest.lists.push({
    id,
    title: data.meta.title,
    level: LEVEL,
    list,
    wordCount: words.length,
  });

  console.log(`Created ${id}.json with ${words.length} words`);
}

manifest.updatedAt = updatedAt;
manifest.lists.sort((a, b) => a.level - b.level || a.list - b.list);
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log("Updated manifest.json");
