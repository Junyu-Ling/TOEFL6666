import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../public/api/wordlists");

const LEVEL = 5;

const LISTS = {
  7: `
perception: n. 看法，洞察力; n. 感知，感觉
assortment: n. 分类; n. 混合物
quiver: v. 颤抖
adorn: v. 装饰
impulse: n. 冲动; n. 动力; n. 脉冲
downplay: v. 不予重视，将……轻描淡写
digress: v. 离题
bliss: n. 极乐
solidarity: n. 团结一致
locale: n. 场所
herbicide: n. 除草剂
equivalent: adj. 等价的，相等的
utilitarian: adj. 实用的
cape: n. 海角; n. 披肩
heterogeneous: adj. 成分混杂的
pristine: adj. 原始的; adj. 崭新的
traverse: v. 穿过
increment: n. 增加
reinforce: v. 加强，巩固
exportable: adj. 可输出的，可出口的
retrieve: v. 找回，取回; v. 检索
descendant: n. 后裔，子孙
clergy: n. 神职人员
democratic: adj. 民主的
petrochemical: n. 石油化工产品
encode: v. 编码
proliferate: v. 激增
replica: n. 复制品
tame: adj. 驯服的
flashy: adj. 闪光的; adj. 俗丽的
vulnerable: adj. 易受伤害的
onset: n. 开始
reclamation: n. 开垦; n. 收回
monetary: adj. 货币的
fracture: n. 破裂，折断，骨折
charged: adj. 带电的; adj. 充满感情的
bead: n. 珠子
melodious: adj. 悦耳的
canyon: n. 峡谷
successor: n. 继承者
allusion: n. 暗示
abnormality: n. 异常
oversight: n. 疏忽; n. 监督
prevail: v. 盛行; v. 战胜
synchronize: v. 同步
credential: n. 证书，凭据
feasibility: n. 可行性，可能性
sparsely: adv. 稀疏地，贫乏地
reef: n. 礁
barn: n. 谷仓
alumnus: n. 男毕业生
strike: v. 罢工; v. 打击，袭击
subsist: v. 维持生活
percussion: n. 打击乐器; n. 碰撞，冲击
tributary: n. 支流
moss: n. 青苔
furry: adj. 毛皮的
patent: n. 专利; v. 获得专利
meteoroid: n. 流星
fraction: n. 部分; n. 分数
obscure: v. 遮掩，隐藏; adj. 模糊的，复杂难懂的
dismantle: v. 拆除
spine: n. 脊柱; n. 刺毛
tentacle: n. 触须，触角
limb: n. 四肢; n. 树的主枝
hierarchy: n. 等级制度
hydro: n. 水力，水力发电
manifest: adj. 明显的; v. 显现出
inertia: n. 惰性，迟钝; n. (物理学)惯性
punctuate: v. 不时打断
conviction: n. 坚定的信仰; n. 定罪
suite: n. 套房
adjacent: adj. 邻近的
swarm: n. 一大群; v. 蜂拥，挤满
resolve: v. 解决; v. 下决心
abrasion: n. 擦伤; n. 磨损
flagpole: n. 旗竿
pebble: n. 鹅卵石
limestone: n. 石灰岩
textile: n. 纺织品
opaque: adj. 不透明的; adj. 晦涩难懂的
sect: n. 宗派
uproot: v. 连根拔起; v. 使……离开家园
lodging: n. 寄宿处
diffuse: v. 扩散
microscope: n. 显微镜
conservative: adj. 保守的; n. 保守派
substrate: n. 基质
expedition: n. 远征，探险队
entail: v. 使需要，必需
withstand: v. 承受住
scant: adj. 不足的，缺乏的
plausible: adj. 看似合理的
Christian: n. 基督徒
carving: n. 雕刻
sweep: v. 打扫; v. 迅速移动; v. (风、海浪等)卷走
counterbalance: v. 使平衡，抵消
explicit: adj. 明确的，清楚的
photosynthesis: n. 光合作用
outrigger: n. 舷外支架
`.trim(),
  8: `
jot: v. 简单记下; n. 少量，些许
invoke: v. 引用，援引; v. 祈求
innumerable: adj. 无数的
pessimistic: adj. 悲观的
metaphor: n. 暗喻
beak: n. 鸟嘴
alternative: adj. 供选择的; n. 供替代的选择
axis: n. 轴，轴线
immortal: adj. 不死的; adj. 名垂千古的
foreseeable: adj. 可预知的
supplement: n. 补充
passive: adj. 被动的，消极的
proton: n. 质子
prowl: v. 悄悄巡行
cripple: v. 削弱; n. 瘸子
handicraft: n. 手工艺，手工艺品
erode: v. 腐蚀，侵蚀
episode: n. 一段情节
imperial: adj. 帝国的，帝王的
autonomy: n. 自治，自治权
akin: adj. 类似的
compost: n. 堆肥
improvise: v. 即兴创作; v. 临时凑合
symmetrical: adj. 对称的
prestige: n. 威望，名望
foresight: n. 先见
engulf: v. 吞没，吞食
transient: adj. 短暂的; n. 流动人口
staple: n. 订书钉; adj. 基本的，主要的
practitioner: n. 从业者，行医者
Antarctica: n. 南极洲
surge: v. 涌动; n. 剧增
render: v. 提供
juvenile: n. 青少年; adj. 青少年的; adj. 幼稚的
chivalry: n. 骑士精神
partition: v. 隔开，分割
exemplary: adj. 典范的
constellation: n. 星座
terrain: n. 地形
mentality: n. 心态
interplay: n. 相互作用
invariable: adj. 不变的; n. 常数
fabricate: v. 伪造; v. 制造
oar: n. 船桨
bulk: n. 大块; n. 大部分
permeable: adj. 可渗透的
brittle: adj. 易碎的
bolt: n. 闪电，雷电; n. 螺栓，螺钉; v. 冲出，跳出
myriad: adj. 无数的，大量的
coarse: adj. 粗糙的; adj. 粗俗的，下等的
disorient: v. 使……迷惑，使……失去方向感
impend: v. 即将发生
foggy: adj. 有雾的，模糊的
signify: v. 表示，意味着
bemoan: v. 惋惜
override: v. 推翻
terrestrial: adj. 陆地的
oppressive: adj. 压迫的，压抑的
framework: n. 框架，骨架
heyday: n. 全盛时期
horticulture: n. 园艺，园艺学
skeletal: adj. 骨骼的，骸骨的; adj. 骨瘦如柴的
strand: n. 缕，股; v. 搁浅
gypsum: n. 石膏
intermediary: n. 中间人，调解人; adj. 中间的，调解的
intestine: n. 肠
fauna: n. 动物群
semiarid: adj. 半干旱的
muffle: v. 蒙住(声音); v. 裹起来
toll: n. 收费，过路费
judicial: adj. 司法的
spherical: adj. 球形的
purify: v. 净化
riot: n. 暴乱
empirical: adj. 实证的
stunt: v. 阻碍; n. 特技
multitude: n. 大量; n. 一大群人
Anglo-Saxon: n. 盎格鲁-撒克逊人
avalanche: n. 雪崩
silicon: n. 硅
incompatibility: n. 不相容
expanse: n. 宽阔
integrate: v. 构成整体; v. 使融入
buffer: n. 缓冲
aggregate: v. 聚集
implicate: v. 暗示; v. 牵连
allergy: n. 过敏症
respiratory: adj. 呼吸的
pigment: n. 颜料; v. 染色
haul: v. 拖运，拖拉
vertebral: adj. 脊椎的
impermeable: adj. 不可渗透的
inadvertent: adj. 无意的，疏忽的
crater: n. 坑，火山口
`.trim(),
  9: `
cargo: n. 货物，船货
reverse: v. 反转，彻底改变
marvel: n. 奇迹; v. 惊叹
integral: adj. 构成整体所必须的; n. 积分
contention: n. 争论
strain: n. 品种，类型; v. 扭伤; n. 拉紧，拉力
vanish: v. 突然消失
consistency: n. 一致性
counterpart: n. 对应的人或物
residue: n. 剩余，残渣
subside: v. 沉下去，陷下去; v. 平息，减弱
deception: n. 欺骗
marble: n. 大理石; n. 玻璃弹珠
craftspeople: n. 手艺人，工匠
obligatory: adj. 强制的，义务的
shrine: n. 圣地
clam: n. 蛤蜊
extermination: n. 消灭，根绝
deteriorate: v. 恶化
spatial: adj. 空间的
permanence: n. 持久，长久
regenerate: v. 再生; v. 复兴
presume: v. 推测，假定
analogous: adj. 类似的
verdict: n. 裁决，裁定
qualitatively: adv. 从品质上讲
frigid: adj. 寒冷的，严寒的
offset: v. 抵消
illiterate: adj. 不识字的; adj. 外行的，无知的; n. 文盲，无知的人
ruthless: adj. 无情的，残忍的
eradication: n. 消灭，根除
watt: n. 瓦特
intrinsic: adj. 本质的，必要的
provincial: adj. 省的，地方性的; adj. 偏狭的
nibble: v. 小口地吃; n. 一小口
marshy: adj. 沼泽的，泥泞的
stingless: adj. 无刺的
engender: v. 使产生，造成
glaze: v. 上釉于，变得光滑
enliven: v. 使活泼，使生动
shatter: v. 粉碎
horizontal: adj. 水平的，地平线的; n. 水平线，水平位置; adj. 横向的，同一阶层的
sporadic: adj. 零星的，偶发的
lethal: adj. 致命的，危害大的
virtuoso: n. 大师，行家
innate: adj. 与生俱来的
hemispheric: adj. 半球的
stratum: n. 地层，社会阶层
intertwine: v. 缠绕，缠结
drench: v. 使湿透
descent: n. 下降; n. 血统
intrigue: v. 激起兴趣; v. 密谋; n. 阴谋
delegate: n. 代表
stationary: adj. 静止不动的
unravel: v. 解开; v. 揭开
twig: n. 细枝; v. 理解
paddle: v. 划桨
incomprehensible: adj. 不可理解的
scrupulous: adj. 细心的，一丝不苟的
lag: v. 落后; n. 间隔
linger: v. 逗留，缓慢做
magnitude: n. (大的)量，大小
league: n. 联盟，联合，联赛
thermometer: n. 温度计
perpendicular: adj. 成直角的，直立的; n. 垂直线
acupuncture: n. 针灸
outlet: n. 出口，出路; n. 商店
quilt: n. 被子，棉被
gaze: v. 凝视
revision: n. 修改; n. 修订本
biography: n. 传记，传记文学
inflation: n. 膨胀; n. [经]通货膨胀
renaissance: n. 复兴; n. 文艺复兴
infection: n. 感染，传染病
modem: n. 调制解调器
fatigue: n. 疲乏，劳累
capsule: n. 胶囊; n. 航天舱
grid: n. 格栅，网格; n. 电网系统
lumber: v. 给某人负担或不便; v. 吃力缓慢地移动; n. 木材，木料
miracle: n. 奇迹
remedy: n. 治疗药物，改进措施; v. 纠正
defy: v. 反抗
folklore: n. 民俗学
heed: v. 注意，留意
integrity: n. 正直; n. 完整
lateral: adj. 侧面的; adj. 横向的
extravagant: adj. 挥霍的，昂贵的
inherent: adj. 内在的，固有的
plagiarism: n. 抄袭
acquisition: n. 获得，获得物; n. 习得
encyclopedia: n. 百科全书
physician: n. 医生，内科医生
prototype: n. 原型，样板
superficial: adj. 表面的，肤浅的
agility: n. 敏捷
bankrupt: adj. 破产的，完全缺乏的; v. 使……破产
brew: v. 酿制(啤酒); v. 冲泡; v. 酝酿(事件)
deduce: v. 推断
eternal: adj. 永恒的
`.trim(),
  10: `
excursion: n. 远足，涉足
ferment: v. (使)发酵; v. (挑起)动乱
mower: n. 割草机
robust: adj. 强壮的，坚定的
sentiment: n. 情绪，感情
sparkle: v. (发)光; v. (表现)抢眼
summon: v. 召唤
unveil: v. 为……揭幕，推出
adapter: n. 适配器
atlas: n. 地图册
championship: n. 锦标赛，冠军地位
discourse: n. 辩论，论文; v. 论述
famine: n. 饥荒
hospitable: adj. 友好的，有利的
hospitality: n. 款待
overestimate: v. 高估
oversimplify: v. 把……过于简单化
precaution: n. 预防措施
semiconductor: n. 半导体
sensational: adj. 耸人听闻的，令人激动的
sip: v. (嘬)一小口
steroid: n. 类固醇
sympathy: n. 同感，同情
tranquil: adj. 平静的，安静的
tranquilizer: n. 镇静剂
underpin: v. 加固……的基础，支持
unearth: v. 发掘，发现
vaccine: n. 疫苗
vow: v. 对……立誓; n. 誓言，誓约
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
