import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../public/api/wordlists");

const RAW = `
realist: n. 务实的人
circulate: v. 循环; v. 流通，传播
comprise: v. 包含，包括
starve: v. 饿死，挨饿
hide: v. 藏匿; n. 兽皮
drag: n./v. 拖，拉; n. 累赘
vivid: adj. 生动的
quantity: n. 量，额
unique: adj. 独特的，唯一的
separately: adv. 分别地
glance: n./v. 一瞥
recycle: n./v. 回收再利用
province: n. 省，州
import: v./n. 进口
operate: v. 操纵（机器等）; v. 经营，管理; v. 起作用，产生影响
occasion: n. 场合; n. 时机
check: n./v. 检查; v. 查看，查询; n.（餐厅）账单
favorable: adj. 肯定的; adj. 有利的
vast: adj. 大规模的
inefficient: adj. 效率低的; adj. 不能胜任的
measurable: adj. 可计量的; adj. 显著的
pit: n. 深渊，凹坑; v. 挑拨……展开竞争
occur: v. 发生，出现; v. 被想到
glacial: adj. 冰川的
chew: v. 咀嚼
platform: n. 舞台; n. 月台
advance: v./n. 前进
submit: v. 提交，委托; v. 投降
adopt: v. 采用; v. 收养
highlight: v. 强调; n. 强光部分
foodstuff: n. 食品
zone: n. 地带
lyric: n. 歌词，抒情诗; adj. 抒情的
overall: adj./adv. 全部的（地），总的（地）
adapt: v. 使适应; v. 改编
columnist: n. 专栏作家
misbehave: v. 行为不端; v. 发生故障
shift: n./v. 变化，变换
quote: v. 引用; n. 引文
inhabit: v. 栖息，居住
evolution: n. 进化
immature: adj. 不成熟的
distraction: n. 分心的事物
absolute: adj. 绝对的
Roman: n. 罗马
undisturbed: adj. 未受打扰的
mixture: n. 混合; n. 混合物
greedy: adj. 贪婪的
extend: v. 延伸，扩展; v. 延期
investigator: n. 调查者
distribute: v. 分发，分销
generation: n. 一代人
volcanic: adj. 火山的; adj.（感情）易爆发的
academy: n. 研究院
pulse: n. 脉搏; n. 脉冲
reside: v. 居住，留驻
standard: n. 水平; adj. 标准的; n. 行为规范
initial: adj. 初始的; n. 首字母
devil: n. 恶魔
insufficient: adj. 不足的
unused: adj. 没有用过的
panel: n. 面，板; n. 座谈小组
motivate: v. 促动，调动……的积极性
ugly: adj. 丑陋的
moral: adj./n. 道德; adj. 合乎道德的
adore: v. 喜爱
livestock: n. 牲畜
mask: n. 面罩; v. 用面具遮住; v. 掩盖
beetle: n. 甲虫
relative: adj. 相对而言的，相对的; n. 亲戚
summit: n. 顶，顶点
device: n. 装置; n. 手法，手段
profession: n. 职业
tribe: n. 部落，部族
preserve: v. 保护
odd: adj. 古怪的; adj. 单个的
execute: v. 执行; v. 处死
swift: adj. 迅速的
generalize: v. 概括; v. 普及
resistant: adj. 抵抗……的
violent: adj. 猛烈的，狂暴的
capture: n./v. 俘获，捕获
sensitive: adj. 敏锐的; adj. 敏感的
stainless: adj. 无污点的; adj. 不生锈的
gravity: n. 引力; n. 严重性，后果
documentary: n. 纪录片; adj. 纪实的，书面的
restriction: n. 限制
absence: n. 缺位
pattern: n. 图案，式样; n. 规律
commercial: adj. 商业的，营利性的; n. 广告
tough: adj. 强韧的，不屈不挠的; adj. 艰难的
wound: v. 受伤; n. 伤口; v. 使受伤
confront: v. 直面，面对
retail: v./n. 零售
demonstrate: v. 示范操作; v. 证明，阐明; v. 游行示威
architecture: n. 建筑学; n. 建筑物
unsatisfactory: adj. 不令人满意的
scholar: n. 学者
motor: n. 电动车，汽车; v. 开车
`.trim();

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

const words = RAW.split("\n")
  .map((l) => l.trim())
  .filter(Boolean)
  .map((line) => parseLine(line));

const data = {
  meta: {
    level: 3,
    list: 4,
    title: "Level 3 · List 4",
    updatedAt: new Date().toISOString().slice(0, 10),
  },
  words,
};

const outPath = path.join(dir, "level3-list4.json");
fs.writeFileSync(outPath, JSON.stringify(data, null, 2));

const manifestPath = path.join(dir, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.updatedAt = data.meta.updatedAt;
manifest.lists = [
  ...manifest.lists.filter((l) => l.id !== "level3-list4"),
  {
    id: "level3-list4",
    title: data.meta.title,
    level: 3,
    list: 4,
    wordCount: words.length,
  },
].sort((a, b) => a.level - b.level || a.list - b.list);

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`Created ${outPath} with ${words.length} words`);
