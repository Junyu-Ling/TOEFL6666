import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../public/api/wordlists");

const LEVEL = 6;

const LISTS = {
  1: `
curator: n. 馆长，监护人，管理者
congenital: adj. 先天的
guild: n. 协会
gazelle: n. 羚羊
elongate: v. 拉长，(使)延长
epitome: n. 典型，缩影，摘要
herder: n. 牧人
edifice: n. 大厦
niche: n. (合适的)位置，工作; n. 细分市场; n. 壁龛
hem: n. 下摆，镶边
oscillate: v. 使动摇，使震荡
blockage: n. 堵塞，封锁
bison: n. 北美野牛
mercantile: adj. 商业的
clump: n. 丛，簇
viscera: n. 内脏
piston: n. 活塞
incongruous: adj. 不协调的，不一致的
hieroglyph: n. 象形文字
ravage: v. 摧毁，破坏
gorilla: n. 大猩猩
caravan: n. 大篷车，旅行队
presage: v. 预示; n. 预兆
choreographer: n. 舞蹈指导
caravel: n. 轻快帆船
conservatism: n. 保守主义，守旧性
interlock: v. 连锁
nickel: n. 镍元素
guilder: n. 金币，荷兰盾
buzzer: n. 蜂鸣器
faunal: adj. 动物区系的
necrosis: n. (细胞组织)坏死
refractory: adj. 倔强的，难驾驭的; adj. 难反应的
semisubsistence: n. 半自给
empress: n. 皇后，女皇
flange: n. [机械]法兰
pastoralism: n. 田园主义
aborigine: n. 土著
manganese: n. 锰元素
canopy: n. 树冠，华盖
gaseous: adj. 气态的，气体的
nectar: n. 花蜜
brackish: adj. 含盐的，难吃的
pheromone: n. 信息素
chloride: n. 氯化物
bombard: v. 轰炸，炮击
equilibrium: n. 化学平衡; n. 平静
beau: n. 花花公子
cobalt: n. 钴; n. 钴蓝色
forager: n. 掠食者
`.trim(),
  2: `
brusquely: adj. 唐突的，直率的
goof: v. 犯低级错误; n. 错误，蠢人; v. 闲荡，瞎混
gripe: v. 抱怨，发牢骚
fissure: n. 裂缝
confer: v. 授予; v. 协商
mortality: n. 死亡数，死亡率
crevice: n. 裂缝
crevasse: n. 裂缝
fossilize: v. 使成化石
query: n. 疑问; v. 询问
harp: n. 竖琴; v. 反复谈论，不停抱怨
concur: v. 同意，一致
cuticle: n. 角质层，表皮
contour: n. 轮廓
commonality: n. 共性
crystalline: adj. 透明的，水晶般的
amniotic: adj. 羊膜的
marshal: v. 召集，安排; n. 元帅，司仪
encapsulate: v. 压缩，概括
zinc: n. 锌元素
estivate: v. 过夏天，夏眠
gull: v. 欺骗，愚弄; n. 易受骗的人; n. 海鸥
outcrop: n. 露出地面的岩层
grasshopper: n. 蚱蜢，蝗虫
gusher: n. 喷油井; n. 讲话滔滔不绝的人
adobe: n. 砖
sulfate: n. 硫酸盐
brook: v. 容忍，忍受
demean: v. 贬低……的身份
precipitation: n. 降水; n. 沉淀
phosphorus: n. 磷
grapple: v. 努力解决; v. 格斗
rift: n. 裂缝，不和
diffuser: n. 散布者，弥漫物
excruciate: v. 折磨，使痛苦
eardrum: n. 耳鼓，鼓膜
prairie: n. 大草原，牧场
Himalayas: n. 喜马拉雅山脉
arboreal: adj. 树木的
neurotransmitter: n. 神经递质
ephemeral: adj. 短暂的，转瞬即逝的
folktale: n. 民间故事
sludge: n. 淤泥，污水，工业废料
hiccup: n. 打嗝; n. 小难题
entrench: v. 确立，巩固
figurine: n. 小雕像
constituency: n. 选民，选区
conifer: n. 针叶树
acorn: n. 橡子
cheep: n. 吱吱的叫声
`.trim(),
  3: `
remuneration: n. 报酬
hearth: n. 灶台，壁炉
serpentine: adj. 蜿蜒的
hiss: v. (发出)嘶嘶声
pathogen: n. 病菌，病原体
algae: n. 海藻，藻类
bask: v. 享受，晒太阳
arthropod: n. 节肢动物
ameliorate: v. 改善，减轻
anthropological: adj. 人类学地
conspicuous: adj. 显著的，显而易见的
bellow: v. 吼
choreograph: v. 编舞
fecund: adj. 肥沃的，多产的
turnpike: n. 收费高速公路
hoe: v. 锄地; n. 锄头
Pleistocene: adj. 更新世的
forage: v. 搜寻，觅食; n. 饲料
aquifer: n. 蓄水层，含水土层
dune: n. 沙丘
miniature: adj. 微型的，小规模的; n. 缩影
obsidian: n. 黑曜石
supersede: v. 取代
bovine: adj. 迟钝的，似牛的
Jurassic: adj. 侏罗纪的
circumvent: v. 包围，回避
parish: n. 教区，地方行政区
chimp: n. 黑猩猩
steppe: n. 干草原
aspen: n. 白杨
taro: n. 芋头
barter: v. 以物换物
cult: n. 异教团体; n. 狂热崇拜(的)
chariot: n. 双轮马车
bidder: n. 出价者，努力争取的人
titanium: n. 钛元素
calve: v. 生幼崽
instigate: v. 唆使，煽动
bode: v. 预示; n. 预兆
genotype: n. 基因型
enamor: v. 使迷恋，使喜爱
cobra: n. 眼镜蛇
flue: n. 烟道
ooze: v. 流出，渗出
resin: n. 树脂
estuary: n. 河口，江口
infantile: adj. 婴儿的，幼稚的
alp: n. 高山
kinetic: adj. 动力的
`.trim(),
  4: `
farmstead: n. 农庄
clove: n. 丁香; v. (cleave过去式)使分开，劈开; v. 附着，坚持
fortuitous: adj. 偶然的; adj. 幸运的
flutter: v. 飘动，拍翅膀
genus: n. 类，种，属
petrifaction: n. 石化
democratization: n. 民主化
deity: n. 神，神性
ensemble: n. 总体，全部
protract: v. 延长
bushel: n. 蒲式耳
convulsion: n. 抽搐，震动
harken: v. 倾听
Caucasian: n. 白种人，高加索人
scanty: adj. 缺乏的，不足的
custodian: n. 管理员，监护人
bowel: n. 肠
relic: n. 遗迹，废墟
fling: v. 抛，掷; n. 恣意，一时放纵
ion: n. 离子
fledgling: n. 幼鸟; adj. 无经验的(人)
excrete: v. 排泄，分泌
deciduous: adj. 落叶的
hare: n. 野兔
legume: n. 豆科植物
mutualism: n. 共栖，互利共生
epoch: n. 时代
mustard: n. 芥末
pomegranate: n. 石榴
aria: n. 咏叹调，独唱曲
flotation: n. 漂浮; n. (股票)发行
scrubland: n. 灌木丛林地
fresco: n. 壁画
caput: n. 头
hemlock: n. 铁杉
detritus: n. 碎石，残余物
intertidal: adj. 潮间带的
stratify: v. 使分层
shale: n. 页岩
feud: n. 长期争执; n. 积怨，世仇
chondrite: n. 球粒状陨石
fortification: n. 防御工事
fern: n. 蕨类植物
despondent: adj. 沮丧的，失望的
clamor: n. 喧嚣
cascade: n. 大量; n. 小瀑布
chromosome: n. 染色体
nebula: n. 星云
loam: n. 沃土
precipitate: v. 使沉淀，使落下; v. 使发生，促成; adj. 仓促的
`.trim(),
  5: `
befit: v. 适合于
capillary: n. 微血管
fen: n. 沼泽
floodplain: n. 冲积平原
enzyme: n. 酶
garrison: n. 守卫部队; v. 派军队驻防，镇守
hawk: n. 鹰; v. 兜售，叫卖
intraspecies: adj. 种内的
derrick: n. 起重机，油井塔
boulder: n. 卵石，大圆石
calcite: n. 方解石
bulldozer: n. 推土机
floral: adj. 植物的，花的
dredge: v. 挖掘，捞取
crumble: v. 粉碎，崩溃
exponential: adj. 快速增长的; adj. 指数的
noria: n. 水车
gully: n. 水沟; v. 在……上开沟
smelter: n. 熔炉
pellet: n. 小球
caterpillar: n. 毛虫
laden: adj. 装满的; adj. 苦恼的
sulfide: n. 硫化物
scavenger: n. 食腐动物
fir: n. 冷杉
spore: n. 孢子
detractor: n. 贬低者，诽谤者
lobe: n. 脑叶，肺叶，叶片
grunt: v. 嘟囔
conceptualize: v. 使概念化
flipper: n. 鳍状肢
maroon: v. 使无法逃脱; adj. 紫红色的
diagonal: adj. 斜的，对角线的
fiddler: n. 拉小提琴的人
commensalism: n. 共栖，共生
quartz: n. 石英
fluorescent: adj. 荧光的
coyote: n. 豺狼
broom: n. 扫帚
commissioner: n. 委员，重要官员
Oceania: n. 大洋洲
geyser: n. 间歇喷泉
diode: n. 二极管
slab: n. 厚板
etch: v. 蚀刻
flank: n. 侧面，侧翼
conglomerate: n. 混合物，集团
engraving: n. 雕刻，雕刻术
granule: n. 颗粒
emulsion: n. 乳液
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
