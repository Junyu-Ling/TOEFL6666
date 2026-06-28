import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../public/api/wordlists");

const LEVEL = 4;

const LISTS = {
  1: `
motion: n. 运动，移动; n. 提议
constitute: v. 组成，建立
organic: adj. 有机的; adj. 自然发生的
restrict: v. 限制
handout: n. 捐赠; n. 课程讲义
dwell: v. 居住; v. 沉湎于
responsive: adj. 反应灵敏的
intensify: v. 加强
insure: v. 采取预防措施，投保
redistribute: v. 重新分配
debatable: adj. 有争议的
ingredient: n. 要素; n. (食物)配料
abound: v. 充满
edible: adj. 可食用的
friction: n. 摩擦，摩擦力; n. 矛盾
muscular: adj. 肌肉的
consultant: n. 顾问
donation: n. 捐赠
trigger: v. 引发; n. 扳机
unfold: v. 展开(open); v. 展开(develop)
breakdown: n. 故障; n. 分解表; n. 情绪崩溃
suspend: v. 悬挂; v. 暂停
canal: n. 运河，沟渠
circumstance: n. 情况
descend: v. 起源; v. 下降
punctuation: n. 标点
compose: v. 组成; v. 创作
rally: n. 集会; v. 反弹
conquest: n. 征服
inaccessible: adj. 难以到达的
coastline: n. 海岸线
stake: v. 界定; n. 桩; n. 危险
foster: v. 培养; adj. 寄养的
opponent: n. 对手
cord: n. 线，绳
alert: adj. 机敏的; n. 警告
vital: adj. 极其重要的
strategy: n. 策略
screening: n. 放映; n. 筛选
bulb: n. 电灯泡
comparatively: adv. 相对地
constant: adj. 稳定的; n. 常数
crude: adj. 粗糙的
forefront: n. 最前列
steer: v. 带领
cactus: n. 仙人掌
episode: n. 事件
possession: n. 拥有
seal: n. 海豹; v. 密封; n. 印章
authentic: adj. 真实的; adj. 可信的
portable: adj. 便于携带的
heroine: n. 女主角
exceed: v. 超过
continental: adj. 大陆的
petal: n. 花瓣
collective: adj. 集体的
vitality: n. 活力
runaway: adj. 发展迅猛的; n. 逃亡
applaud: v. 鼓掌; v. 赞扬
substantial: adj. 重要的，大量的; adj. 实质的
precisely: adv. 精确地
immeasurably: adv. 无法计量地
validity: n. 正确
extract: v. 取出
overland: adj. 经由陆路的; adv. 经由陆路地
genre: n. 种类
frontier: n. 边界
secrete: v. 分泌
ancestry: n. 祖先
bid: v. 出价
radiation: n. 辐射
empire: n. 帝国
unaltered: adj. 未改变的
prosper: v. 繁荣
objective: adj. 客观的; n. 目标
glimpse: n. 一瞥
steep: adj. 急剧的; v. 浸泡
establishment: n. 创立
deposit: v. 沉积; n. 存款，押金
constraint: n. 限制
blossom: v. 兴旺
commitment: n. 承诺; n. 责任感
creep: v. 逐渐发展; v. 匍匐，爬行
resolution: n. 坚定; n. 解决
replant: v. 新栽
oval: adj. 椭圆形的
rot: v. 腐烂
crucial: adj. 关键的
elemental: adj. 基本的
restore: v. 恢复
civic: adj. 城市的
bloom: v. 开花; v. 繁荣
cue: n. 暗示
defect: n. 缺陷
unforeseen: adj. 未预料到的
inhale: v. 吸入
tolerance: n. 宽容
theorize: v. 从理论上说明
initiate: v. 开始
`.trim(),
  2: `
specialize: v. 专门研究
stain: v. 染色; n. 污点
magnetic: adj. 有磁性的
trail: n. 痕迹; v. 追踪
administration: n. 管理
electron: n. 电子
distinguish: v. 区分
approach: v. 靠近; v. 处理; n. 方法
editorial: adj. 编辑的; n. 社论
overflow: v. 溢出; v. 充满
rear: v. 提高; n. 后部
discern: v. 辨别
pillar: n. 柱子
glaciation: n. 冰川覆盖
adaptive: adj. 改变的
crustal: adj. 地壳的
occasionally: adv. 偶尔
combat: n. 战斗
demonstration: n. 表明; n. 游行抗议
overhear: v. 无意中听到
instill: v. 逐渐形成
interconnect: v. 相互连接
absorption: n. 吸收
inadequacy: n. 短缺
numb: adj. 麻木的; v. 使麻木
wrestle: v. 扭打
namely: adv. 即
violate: v. 违反
uppermost: adj. 最高的
supposedly: adv. 据说
classic: adj. 典型的; adj. 经典的
galaxy: n. 星系，银河系; n. 一群人
boundary: n. 边界
erupt: v. 爆发
drawback: n. 缺陷
hatch: v. 孵
adolescence: n. 青春期
resort: v. 诉诸于; n. 度假胜地; n. 招数
vigorous: adj. 有力的
crush: v. 压碎; n. 迷恋
villa: n. 乡间庄园
supreme: adj. 卓越的
gem: n. 宝石
contrary: adj. 相反的
portrait: n. 肖像
consciousness: n. 意识
uncover: v. 揭露
interactive: adj. 相互作用的
mercury: n. 水银; n. 水星
parallel: adj. 平行的
mercy: n. 仁慈
plot: n. 情节; n. 阴谋; v. 谋划
distinctly: adv. 清楚地
primitive: adj. 原始的
literally: adv. 确确实实地
progressive: adj. 逐步的; adj. 前进的
tidal: adj. 潮汐的
occupant: n. 居住者
compromise: n. 妥协; v. 危及
overgrow: v. 过度生长
obligation: n. 义务
delicate: adj. 精美的; adj. 易碎的
knit: v. 编织
choir: n. 唱诗班
geothermal: adj. 地热的
smash: v. 击碎
meantime: n. 其间
reference: n. 提及; n. 参考
hub: n. 中心
reckon: v. 估计; v. 期望
undo: v. 消除
circulate: v. 传播
trial: n. 试验; n. 审判
cement: n. 水泥; v. 接合
distinction: n. 差别; n. 卓越
archaeologist: n. 考古学家
flee: v. 逃离
subtropical: adj. 亚热带的
stab: v. 刺
colonial: adj. 殖民地的
posture: n. 姿势
pierce: v. 穿透
scribe: n. 抄写员; v. 登记
penetrate: v. 穿透
margin: n. 边缘; n. 幅度
residence: n. 住处
dissolution: n. 解除
candid: adj. 率直的
criterion: n. 准则
carnival: n. 狂欢节
scatter: v. 分散
asset: n. 优势; n. 资产
clockwise: adj. 顺时针的
component: n. 组成
submerge: v. 淹没
pressing: adj. 迫切的
undergo: v. 经历
substitute: n. 替代
exterminate: v. 消灭
instance: n. 情况
`.trim(),
  3: `
swing: v. 摆动
halt: v. 停止
sting: v. 刺; n. 昆虫叮咬
circular: adj. 圆的
intellectual: adj. 智力的; n. 知识分子
indicator: n. 指示物
herb: n. 草本植物
alliance: n. 联合
intimate: adj. 亲密的
bronze: n. 青铜
exploit: v. 开发，压榨
constructive: adj. 有益的
submarine: adj. 海底的
narrator: n. 叙述者
equality: n. 平等
proponent: n. 倡导者
hop: v. 跳跃
urbanization: n. 城市化
campaign: n. 运动; n. 战役
refute: v. 驳斥
deforest: v. 砍伐森林
sequence: n. 顺序
habitual: adj. 习惯性的
physicist: n. 物理学家
stroke: n. 一击; n. 笔触; v. 轻抚
medieval: adj. 中世纪的
pasture: n. 牧场
realism: n. 真实性; n. 现实主义
comment: n. 评论
soar: v. 猛增; v. 翱翔
elaborate: adj. 复杂的; v. 详细说明
fuse: v. 使……混合; n. 保险丝
amphibian: n. 两栖动物
nasty: adj. 令人难受的
respectable: adj. 体面的
observance: n. 遵守
worship: v. 崇拜
electrify: v. 使……电气化; v. 使……激动
mythology: n. 神话
deviate: v. 偏离
peer: n. 同等地位的人，同龄人; v. 仔细看
recreational: adj. 娱乐的
shed: v. 流
applicable: adj. 适用的
desirability: n. 值得渴望
colonize: v. 殖民; v. (植物或动物)移生，移植
ongoing: adj. 连续的
bizarre: adj. 古怪的
comprehend: v. 理解
reliant: adj. 依赖的
sensible: adj. 意识到的; adj. 明智的
sway: v. 摇晃
revolutionize: v. 变革
vaporize: v. 使……蒸发
liberate: v. 释放
specialist: n. 专家
spice: n. 香料
evolve: v. 演化
tend: v. 趋向; v. 照料
recount: v. 详细叙述
thesis: n. 论点; n. 论文
capacity: n. 能力; n. 容量
erosion: n. 侵蚀
diplomacy: n. 外交
symbolism: n. 象征意义
suppose: v. 设想
divert: v. 使偏离
rotate: v. 转动
commodity: n. 商品
exaggerate: v. 夸大
intrude: v. 闯入
advantageous: adj. 有利的
proportion: n. 部分
celebrity: n. 名人
fleshy: adj. 多肉的
switch: v. 转变; n. 开关按钮
multiply: v. 成倍增长; v. 繁殖
seep: v. 渗出
rival: adj. 对抗的; n. 对手
budget: n. 预算; adj. 便宜的
outbreak: n. 爆发
interval: n. 间隔
boiler: n. 锅炉
acquire: v. 获得
prospect: n. 希望
opportunist: n. 机会主义者
statue: n. 雕像
withdrawal: n. 取回
enduring: adj. 持续的
burial: n. 埋葬
miner: n. 矿工
arouse: v. 引起
adhere: v. 粘附; v. 遵守
subjective: adj. 主观的
stool: n. 凳子; n. 厕所
discourage: v. 劝阻
expel: v. 驱逐
persevere: v. 坚持不懈
variable: n. 变量; adj. 变化无常的
implement: n. 工具; v. 实施
`.trim(),
  4: `
hasten: v. 加快
presence: n. 存在
delta: n. 三角洲
grave: adj. 严重的; n. 墓
emit: v. 散发
protocol: n. 礼仪; n. 协议，方案
glare: v. 发强光; v. 瞪
innovative: adj. 有创意的
pinpoint: adj. 精确的; v. 精确定位
inorganic: adj. 无机的
disorganized: adj. 混乱的
champion: v. 支持; n. 倡导者; n. 冠军
shepherd: n. 牧羊人; v. 引领
dam: n. 大坝; v. 阻碍
barely: adv. 仅仅
characteristic: adj. 独特的; n. 特性
receptor: n. 感受器
ward: n. 选区; v. 守卫
scrape: v. 刮
trivial: adj. 不重要的
complexity: n. 复杂
alternate: adj. 交替的
furnish: v. 提供; v. 装饰
profound: adj. 巨大的; adj. 深刻的
underestimate: v. 低估
transaction: n. 交易
literary: adj. 文学的
infancy: n. 婴儿期
implicit: adj. 含蓄的
blacken: v. (使)变黑; v. 诋毁
mist: n. 雾
inappropriate: adj. 不合适的
trunk: n. 树干，躯干
continuation: n. 持续
selective: adj. 选择的
internal: adj. 里面的
optical: adj. 视觉的; adj. 光学的
soak: v. 浸泡; v. 专心致志
resent: v. 憎恨
deliberation: n. 细想
colonist: n. 殖民地定居者
constrict: v. 缩小
index: n. 索引
provoke: v. 引起
displace: v. 取代
consecutive: adj. 连续的
parameter: n. 界限; n. 参数
genetically: adv. 从遗传学角度
coexistence: n. 共存
diminish: v. 减小
burst: v. 破裂
fanciful: adj. 空想的
freight: n. 货物
oblige: v. 强迫
bare: adj. 裸露的
cubic: adj. 立方形的
prompt: v. 导致; adj. 及时的
workload: n. 工作量
weave: v. 织
relevance: n. 相关
analysis: n. 分析
vibrate: v. 震动
disastrous: adj. 灾难的
conservation: n. 保护
condense: v. 使浓缩
replacement: n. 替代品
moisture: n. 水汽
disorderly: adj. 混乱的
tribal: adj. 部落的
durable: adj. 耐用的
venture: v. 冒险
depression: n. 坑; n. 抑郁; n. 经济大萧条
solidify: v. 凝结; v. 团结，加固
utility: n. 实用
accord: n. 一致
dual: adj. 双重的
outermost: adj. 最外面的
sparse: adj. 稀疏的
basin: n. 盆地
arid: adj. 干旱的
chant: v. 吟唱
distrust: n. 不信任
bore: v. 钻孔; v. 使厌烦
citation: n. 引述
accessibility: n. 容易到达
commentary: n. 评论
enterprise: n. 事业; n. 企业
perceive: v. 察觉，感知
unbiased: adj. 无偏见的
questionable: adj. 可疑的
competitive: adj. 竞争的
omit: v. 漏掉
ethic: n. 道德准则
resemblance: n. 相似
skeptical: adj. 怀疑的
magnify: v. 放大
swamp: n. 沼泽
category: n. 种类
cloak: v. 覆盖; n. 长袍
rage: n. 大怒
`.trim(),
  5: `
presidency: n. 总统的任期
fume: n. (气味强烈的)烟、气
receptionist: n. 接待员
viable: adj. 能存活的; adj. 可行的
domesticate: v. 驯化
enormous: adj. 庞大的
lessen: v. 减轻
meteoric: adj. 流星的
chandelier: n. 水晶吊灯
attest: v. 证明
nourish: v. 养育
modification: n. 修改
ware: n. 陶器
ally: v. 结盟
municipal: adj. 市政的
prayer: n. 祈求
enclose: v. 围绕
ambassador: n. 大使
extinct: adj. 灭绝的
fertile: adj. 肥沃的
subtle: adj. 微妙的
recital: n. 叙述
readjust: v. 重新调整
barrel: n. 桶
mobility: n. 便携性
outnumber: v. 在数量上超过
beaver: n. 河狸
necessitate: v. 使成为必要
impurity: n. 杂质
nominate: v. 提名; v. 任命
shelve: v. 倾斜
dawn: n. 黎明
removal: n. 移除
variation: n. 变化
unrest: n. 动乱
acidic: adj. 酸性的
abolish: v. 废除
council: n. 议会
accessory: n. 附件
disposal: n. 处理
evolutionary: adj. 进化的
offspring: n. 幼仔，子女
flush: v. 冲刷; v. 脸红
particle: n. 颗粒
correction: n. 改正
chaotic: adj. 混乱的
imagery: n. 图像; n. 意象
waterproof: adj. 防水的
overhead: adv. 在空中; n. 企业管理费用
exceptional: adj. 不同寻常的
prevalent: adj. 流行的
aggression: n. 攻击
tactic: n. 策略
robin: n. 知更鸟
sphere: n. 领域; n. 球形
toxin: n. 毒素
luxurious: adj. 豪华的
sustain: v. 维持
distort: v. 扭曲
uplift: v. 振奋; v. 抬起
supervise: v. 管理
peel: v. 剥皮
strip: v. 除去
radical: adj. 根本的; adj. 极端的
authorize: v. 授权
transmit: v. 传播
potent: adj. 强有力的
elite: n. 精英
restate: v. 重述
discharge: v. 释放
constituent: n. 成分
symbolize: v. 象征
confine: v. 限制
squirrel: n. 松鼠
receptive: adj. 乐于接受的
pedestrian: n. 行人
carnivore: n. 食肉动物
vessel: n. 容器; n. 船
atomic: adj. 原子的
exacting: adj. 严格要求的
deceit: n. 欺诈
abrupt: adj. 突然的
emerge: v. 出现
collision: n. 碰撞; n. 冲突
forked: adj. 分叉的
humid: adj. 湿热的
packet: n. 小件包裹
comic: adj. 喜剧的
register: v. 登记
severely: adv. 严重地
partial: adj. 部分的; adj. 偏袒的
scenario: n. 情况; n. 剧情
immense: adj. 巨大的
dampen: v. 使潮湿; v. 使沮丧
comet: n. 彗星
testify: v. 证实
void: adj. 空的; adj. 无效的
overlook: v. 忽略
temporary: adj. 临时的
compel: v. 强迫
`.trim(),
  6: `
analyst: n. 分析员
dehydrate: v. 脱水
populous: adj. 人口众多的
spectacular: adj. 引人注目的
dispense: v. 分发
crash: v. 碰撞
expire: v. 到期
miraculous: adj. 奇迹般的
ritual: n. 仪式
subsequent: adj. 随后的
synonym: n. 同义词
chorus: n. 合唱队
efficiency: n. 效率
blur: v. 模糊
core: n. 核心
scroll: n. 卷轴
energize: v. 使……活跃
dump: n. 垃圾场; v. 倾倒; v. 抛弃
clan: n. 宗族
rebound: v. 反弹
scent: n. 气味
portray: v. 描绘
appropriate: adj. 合适的; v. 侵占
patch: n. 小片土地; n. 补丁
reflection: n. 深思; n. 反射; n. 倒影
discontent: n. 不满
infrastructure: n. 基础设施
recipient: n. 接受者
contest: n. 比赛
locality: n. 地区
arch: n. 拱形，拱门
oppose: v. 反对
feature: n. 特征; v. 作主要角色
instrumental: adj. 起重要作用的; adj. 器乐的
lean: v. 倾斜; adj. 瘦的
cohesive: adj. 统一的
echo: n. 回声; v. 与……相似
oxidize: v. 氧化
acid: n. 酸; adj. 酸的
blink: v. 闪烁; v. 眨眼
periodical: adj. 周期性的
fuss: n. 争吵，大惊小怪
navigable: adj. 可通航的
static: adj. 静止的
liberal: adj. 自由的
square: n. 正方形; n. 广场; n. 平方
citizenry: n. 全体市民
competence: n. 能力
aware: adj. 意识到的
compress: v. 压缩
populate: v. 居住于
artifact: n. 人工制品
dizziness: n. 眩晕
identical: adj. 相同的
timber: n. 木材
rough: adj. 粗糙的
abstraction: n. 抽象概念; n. 提取
principal: adj. 最重要的; n. 校长
corridor: n. 走廊
aspiration: n. 渴望
shun: v. 避开
multiplication: n. 成倍增长
governance: n. 统治
carbonate: n. 碳酸盐
illuminate: v. 阐明; v. 照亮
vegetation: n. 植被
diplomat: n. 外交官
turbulence: n. 动荡
backbone: n. 脊柱; n. 关键部分
unintentional: adj. 无意的
conceptual: adj. 概念的
collapse: v. 倒塌
cast: v. 扔，抛; v. 浇铸
expose: v. 揭露
prehistoric: adj. 史前的
distract: v. 使分心
cultivate: v. 耕作; v. 培养
spiral: adj. 螺旋形的
dinosaur: n. 恐龙
underlie: v. 位于……之下; v. 构成……的基础
sensation: n. 感觉，知觉
accompany: v. 陪伴; v. 伴随
intake: n. 摄取量
bud: n. 芽; v. 发芽
successive: adj. 连续的
bundle: n. 捆
mortgage: n. 抵押
inference: n. 推断
irrigate: v. 灌溉
exotic: adj. 来自异国的
row: n. 一排; v. 划
strongman: n. 铁腕人物
oxide: n. 氧化物
indefensible: adj. 站不住脚的
neutralize: v. 抵消; v. 中和
eject: v. 喷射
devise: v. 设计，发明
theoretical: adj. 假设的; adj. 理论的
complicate: v. 使复杂
specific: adj. 特定的
`.trim(),
  7: `
persistent: adj. 坚持不懈的
relay: v. 转播
boast: v. 吹嘘
requisite: adj. 必要的; n. (物品)
attach: v. 附属
dose: n. 一次的剂量
pump: n. 泵; v. 用泵输送
mystify: v. 使困惑
restraint: n. 限制
temporal: adj. 时间的; adj. 短暂的
exceedingly: adv. 非常
pollutant: n. 污染物
degrade: v. 恶化
impose: v. 强制实行
radiant: adj. 灿烂的; adj. 辐射的
troop: n. 部队
exterior: adj. 外部的
rhythm: n. 节奏
habitat: n. 栖息地
conclusive: adj. 确定的
lava: n. 熔岩
meteor: n. 流星
priest: n. 牧师
cane: n. 茎
ridicule: v. 嘲弄
overheat: v. 使……过热
mount: v. 增加; n. 山; v. 固定
compact: adj. 紧密的; adj. 简洁的
protest: v. 抗议
compass: n. 指南针
remarkable: adj. 卓越的
deliberate: adj. 故意的
proficient: adj. 熟练的
analytical: adj. 分析的
contend: v. 斗争; v. 主张
recruit: v. 征募; v. 招聘
clip: v. 修剪; v. 夹住
visibility: n. 能见度
passageway: n. 过道
sponsor: v. 赞助
dependable: adj. 可信赖的
embryo: n. 胚胎
stabilize: v. (使)稳定
ivory: n. 象牙; adj. 象牙色的
adaptable: adj. 可适应的
inequality: n. 不平等，不均等
companion: n. 朋友
documentation: n. 记录
resume: v. 重新开始
spur: n. 刺激; n. 马刺
genuine: adj. 真的
regulate: v. 调节; v. 控制
wane: v. 衰落
superiority: n. 优越
predecessor: n. 前任
dye: v. 给……染色; n. 染料
parasite: n. 寄生虫
diverge: v. 相异
coral: n. 珊瑚
typify: v. 体现
accommodate: v. 提供住宿; v. 适应
elementary: adj. 简单的
vertebrate: n. 脊椎动物
breed: v. 繁殖; n. 品种
sediment: n. 沉淀物
fragile: adj. 易碎的，脆弱的
mechanically: adv. 机械地
accuse: v. 控告
overshadow: v. 给……蒙上阴影; v. 使……黯然失色
lettuce: n. 生菜
declaration: n. 宣布
detection: n. 发现
thorough: adj. 彻底的
correlate: v. 相关
alloy: n. 合金
peculiarity: n. 特性
outlook: n. 观点
aggressive: adj. 侵略性的
emphasis: n. 重要性
associate: v. 联系
saint: n. 圣徒
appeal: v. 恳求; v. 吸引
cottage: n. 小屋
layout: n. 布局
obstacle: n. 障碍
exclude: v. 排除
inactivity: n. 无活动
guardian: n. 保卫者
refine: v. 提炼
catalog: n. 目录
linguistic: adj. 语言的
motivation: n. 动机
evaporate: v. 蒸发
bang: v. 猛击
nestle: v. 依偎
guesswork: n. 猜测
depict: v. 描绘
astronomy: n. 天文学
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
