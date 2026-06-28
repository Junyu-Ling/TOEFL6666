import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../public/api/wordlists");

const LEVEL = 5;

const LISTS = {
  1: `
duplicate: v. 复制，使加倍
reaper: n. 收割机(者)
debug: v. 除错
sap: n. (植物的)汁液，精力; v. 消耗
displacement: n. 取代; n. 逐出家园
inject: v. 注射; v. 注入，增添
arbitrary: adj. 任意的; adj. 武断的
simultaneous: adj. 同时发生的
consulate: n. 领事馆
Scandinavia: n. 斯堪的纳维亚(北欧半岛)
norm: n. 准则，标准
evoke: v. 引起，唤起
glossary: n. 术语(特殊用语)表; n. 专业词典
denominator: n. 分母
precede: v. 先于
verbal: adj. 口头的
engrave: v. 雕刻; v. 铭记
embellish: v. 修饰，装饰
irreversible: adj. 不可逆转的
reign: v. 统治; n. 统治，支配
resonance: n. 回声; n. 共鸣; n. 共振
anthropology: n. 人类学
preceding: adj. 前面的
soluble: adj. 可溶解的，水溶性的
decipher: v. 破译
clutch: v. 抓住，紧握; n. 离合器
financier: n. 金融家
flap: v. 拍动
liquefy: v. 液化
flora: n. 植物群
flourish: v. 茂盛; v. 繁荣，兴旺; v. 挥舞
crane: n. 吊车，起重机; v. 伸着脖子看
colossal: adj. 巨大的
thread: n. 线; v. 穿过; n. 螺纹
credit: n. 信用; n. 学分; v. 把……归给，归功于
topography: n. 地势，地形学
frenzy: n. 狂暴，狂怒
saline: adj. 含盐的
specimen: n. 标本，样本
ore: n. 矿石
aquarium: n. 水族馆
unearned: adj. 不劳而获的
spontaneous: adj. 自发的，自然的
bland: adj. 乏味的; adj. 清淡的
sinkhole: n. 落水洞
pyramid: n. 金字塔
zenith: n. 顶峰，顶点
erratic: adj. 不稳定的，古怪的
gateway: n. 门，通道
disperse: v. 分散，使散开
premier: n. 总理; adj. 最好的，首要的
outpost: n. 边区村落; n. 前哨
dilemma: n. 困境
influx: n. 流入; n. 汇集
plume: n. 大片羽毛; n. 岩浆柱
succession: n. [生态]演替; n. 继任; n. 连续
vacate: v. 空出，腾出(房间)
mosaic: n. 马赛克
agitate: v. 使……激动; v. 煽动
inconclusive: adj. 无结果的; adj. 无说服力的
debris: n. 碎片，残骸
ingenious: adj. 聪明的，独创的
artisan: n. 工匠
derivative: n. 衍生物
deterioration: n. 恶化
overemphasize: v. 过分强调
Celsius: n. 摄氏度
radiator: n. 散热器; n. 暖气片
vertical: adj. 垂直的
satire: n. 讽刺
venom: n. 毒液
elevation: n. 海拔; n. 提高
superficially: adv. 表面地，虚假地
converge: v. 使汇聚
sift: v. 筛(面粉)，筛选
volatile: adj. 多变的; adj. 易挥发的
foul: adj. 邪恶的，污秽的; v. 犯规
census: n. 人口普查
designate: v. 指定，指派; v. 把……定名为; v. 标出
valid: adj. 有根据的; adj. 有效的
shroud: v. 掩盖; n. 裹尸布
confederacy: n. 联盟，联邦
maneuver: v. 操控; n. 手段，策略; n. 军事演习
decompose: v. 腐烂; v. 分解
growl: v. 咆哮
alienate: v. 使疏远，离间
undermine: v. 逐渐破坏，削弱
deem: v. 认为，视作
reciprocity: n. 互惠
elicit: v. 引出
pivotal: adj. 关键的
mobilize: v. 鼓动; v. 组织
sterile: adj. 无菌的; adj. 不育的
exploitation: n. 开发，开采
`.trim(),
  2: `
mite: n. 螨; n. 极小量
mammoth: n. 猛犸象，庞然大物; adj. 巨大的
arduous: adj. 费力的
vine: n. 藤，葡萄藤
landfill: n. 垃圾场
groom: v. 打扮
delineate: v. 描绘
harness: v. 利用
replicate: v. 复制，重做
alteration: n. 修改
compound: v. 合成; adj. 合成的; n. 复合词; n. 复合物
portraiture: n. 肖像画，肖像画艺术
pension: n. 养老金，抚恤金; v. 发养老金，发抚恤金
precision: n. 精密，准确性
smother: v. 使窒息; v. 抑制
revolve: v. 旋转，围绕
allude: v. 暗指
plateau: n. 高原; n. 稳定阶段
salinity: n. 盐度，盐分
plantation: n. 种植园
infusion: n. 注入
clog: v. 阻塞
crescent: n. 新月
indicative: adj. 象征的，指示的
elaboration: n. 详细阐述
formidable: adj. 强大的; adj. 可怕的，令人敬畏的
chop: v. 砍; v. 剁碎; n. 排骨
planetary: adj. 行星的
subsequently: adv. 随后
fidelity: n. 忠诚; n. 保真度
fringe: n. 边缘
infringe: v. 侵犯; v. 违反
anatomy: n. 解剖，解剖学
peninsula: n. 半岛
conjunction: n. 结合; n. [语]连接词
rust: n. 锈; v. 生锈
erect: v. 使竖立; v. 建造
democrat: n. 民主党人
rye: n. 黑麦，黑麦面包
meadow: n. 草地
speck: n. 污点，斑迹
perspective: n. 观点，视角
arousal: n. 觉醒
horn: n. (牛、鹿等动物头上的)角; n. 喇叭
heap: n. 堆
cosmic: adj. 宇宙的; adj. 巨大的
substantiate: v. 证实
adverse: adj. 敌对的
inclination: n. 倾向; n. 倾斜
assemble: v. 集合; v. 装配
ambient: adj. 周围的; n. 周围环境
prone: adj. 有做某事的倾向; adj. 俯卧的
reptile: n. 爬行动物
undisputed: adj. 无可争辩的，无异议的
secular: adj. 世俗的，非宗教的
divergence: n. 分歧
forge: v. 伪造; v. 前进; v. 铸造
endorse: v. 认可，支持
kilowatt: n. 千瓦
Cambrian: n. 寒武纪
Muslim: n. 穆斯林; adj. 穆斯林的
tyrant: n. 暴君
decomposition: n. 分解，腐烂，变质
oxidation: n. 氧化
momentous: adj. 重大的
impetus: n. 动力
contemporary: adj. 同时代的; adj. 当代的
presumably: adv. 大概，可能
designation: n. 指定; n. 名称
surplus: n. 过剩; adj. 剩余的
validate: v. 证实
phony: adj. 假的，虚伪的; n. 骗子，赝品
requisition: n. 征用; v. 征用
acknowledge: v. 承认; v. 认可; v. 确认收到
encroach: v. 蚕食，侵占
provision: n. 提供
stark: adj. 完全的; adj. 荒凉的，朴实无华的
lyrical: adj. 诗意的，抒情的
chronological: adj. 按年代顺序排列的
eradicate: v. 根除，根绝
entice: v. 诱使，怂恿
collaborate: v. 合作; v. 勾结，通敌
octopus: n. 章鱼
elimination: n. 消除，淘汰
manuscript: n. 手稿
cling: v. 坚持; v. 紧贴，附着
bleach: v. 使漂白; n. 漂白剂
motionless: adj. 静止的
tilt: v. 倾斜
obsolete: adj. 过时的，被淘汰的
devour: v. 吞食; v. 吸收
advent: n. 到来，出现
regime: n. 政权; n. 管理体制
adjoin: v. 靠近
runoff: n. 径流; n. 决胜赛
helium: n. [化学]氦
racket: n. 球拍; n. 喧闹
hyper: adj. 异常活跃的
indefinite: adj. 无限期的; adj. 不确定的
aerial: adj. 空中的
`.trim(),
  3: `
spout: n. 喷口，(容器的)嘴; v. 喷出，涌出
parasitic: adj. 寄生的
indigestion: n. 消化不良
interim: n. 过渡时期; adj. 暂时的
sophisticate: v. 使变得世故; n. 久经世故的人
terrace: n. 梯田; n. 露台; v. 呈阶梯状
slender: adj. 细长的，苗条的
chore: n. 家庭杂务; n. 讨厌的或累人的工作
stem: n. 茎; v. 起源于; v. 阻止
escalate: v. 加剧; v. 逐步增强，逐步升高
entangle: v. 使纠缠; v. 卷入
detrimental: adj. 不利的，有害的
afield: adv. 去野外
grinding: adj. 难以忍受的; adj. 刺耳的
resonate: v. 回响; v. 引起共鸣; v. 共振
landslide: n. 山崩; n. 压倒性的胜利
specify: v. 指定，明确要求
insulate: v. 绝缘，隔热
camouflage: n. 伪装; v. 伪装，掩饰
grandiose: adj. 宏伟的，堂皇的
cellular: adj. 细胞的; n. 移动电话
fetus: n. 胎儿，胎
standpoint: n. 立场，观点
scrap: n. 小块，碎片; n. 废料
interruption: n. 中断，干扰
feudal: adj. 封建制度的
alter: v. 改变
nomadic: adj. 游牧的
concurrent: adj. 并发的
gear: v. 使……适合; n. 齿轮，装置
waterfowl: n. 水禽，水鸟
configuration: n. 结构; n. 配置
stature: n. 身高，身材; n. 名望
anecdotal: adj. 轶事的
gauge: v. 测量
cobble: v. 修; n. 鹅卵石
mirage: n. 海市蜃楼，幻想
decease: n. 死亡; v. 死亡
psychologist: n. 心理学家
mutate: v. 改变; v. 基因突变
tile: n. 瓷砖，瓦片
amass: v. 累积
garment: n. 衣服，服装
rhythmical: adj. 有节奏的
flicker: v. 闪烁，摇曳
ceramic: n. 陶瓷
vein: n. 血管，静脉; n. 叶脉，翅脉
ample: adj. 丰富的; adj. 宽敞的
repress: v. 抑制，镇压
coerce: v. 强迫
phenomenon: n. 现象; n. 奇迹
indispensable: adj. 必不可少的
vent: n. 通风孔; v. 发泄; n. 发泄
thorn: n. 刺，荆棘
spawn: n. (鱼、蛙等的)卵; v. 产卵; v. 大批涌现
saturate: v. 浸透，使饱和
aquatic: adj. 水生的
compaction: n. 压紧
moist: adj. 潮湿的
interstellar: adj. 星际的
derive: v. 源于; v. 获得
autobiography: n. 自传
pluck: v. 采摘，拔掉
overlap: v. 重合; n. 重叠
rivalry: n. 竞争，斗争
silt: n. 泥沙
tar: n. 沥青; n. (烟草中的)焦油
grind: v. 磨碎; n. 苦工作
canoe: n. 独木舟; v. 划独木舟
waterwheel: n. 水车，水轮
assemblage: n. 集合
mound: n. 小山丘，土石堆
sibling: n. 兄弟姐妹
auxiliary: adj. 辅助的
transmission: n. 传送，传播
maturation: n. 成熟
furious: adj. 狂怒的
elusive: adj. 难懂的; adj. 易逃避的
obsession: n. 执念
antecedent: adj. 先前的; n. 前情; n. 祖先
furnace: n. 火炉，熔炉
enigmatic: adj. 神秘的
rigidity: n. 僵硬; n. 严格，死板
manipulate: v. 操作; v. 操纵，控制
obstruct: v. 阻碍
fledge: v. 长羽毛
perplex: v. 使困惑
prosperity: n. 繁荣
apprentice: n. 学徒
greasy: adj. 油腻的
bustle: v. 喧闹，忙乱; n. 喧闹
authenticity: n. 真实性
linear: adj. 线性的，直线的
prior: adj. 事先的; prep. 在……之前
unsuspecting: adj. 不怀疑的
inscription: n. 题词，铭文
dispersal: n. 分散，传播
`.trim(),
  4: `
dynamic: adj. 动态的; adj. 有活力的
velocity: n. 速度
shimmer: v. 闪烁; n. 微光
conflate: v. 合并
surmise: v. 猜测; n. 猜测
ribbon: n. 缎带，丝带
unprecedented: adj. 史无前例的
commemorate: v. 庆祝，纪念
backtrack: v. 由原路返回; v. 改变主意
mania: n. 狂热
isle: n. 岛
cathedral: n. 大教堂
communal: adj. 公共的
distill: v. 蒸馏
induce: v. 引起; v. 劝诱，促使
nitrate: n. 硝酸盐
telltale: adj. 暴露实情的
blemish: n. 瑕疵，缺点; v. 玷污，损害
literacy: n. 读写能力
mandarin: n. 普通话; n. 官僚
silhouette: n. 轮廓
symphony: n. 交响乐
radioactive: adj. 放射性的
entrepreneur: n. 企业家
predetermine: v. 预先决定
wagon: n. 四轮马车
intermittent: adj. 间歇的，断断续续的
gland: n. 腺
respiration: n. 呼吸
remediation: n. 补救，矫正
paramount: adj. 最重要的
beam: n. 横梁; n. 光线; v. 绽放笑容
disproportionate: adj. 不成比例的
incorporate: v. 包含; v. 组成公司
horsepower: n. 马力
carrier: n. 运输公司; n. 电信运营商; n. 运送者
indigenous: adj. 本土的
synthesize: v. 合成
puff: v. 喷出; n. 一阵(风或烟)
hind: n. 雌鹿; adj. 后面的
charcoal: n. 木炭
rigor: n. 严格; n. 严密，严谨; n. 严酷
compositional: adj. 组成的
molten: adj. 熔化的
ornament: n. 装饰品; v. 装饰
prominent: adj. 杰出的，卓越的; adj. 突出的
tangle: v. 缠结; n. 缠结
fragment: n. 碎片
stiff: adj. 硬的，僵硬的
gist: n. 主旨，要点
dictator: n. 独裁者
micronutrient: n. 微量营养元素
unleash: v. 解开，释放
gravel: n. 碎石，砂砾
inventory: n. 存货
velvet: n. 天鹅绒
dispersion: n. 散布
solitary: adj. 孤独的
revitalize: v. 使复苏
nucleus: n. (原子或细胞)核
propel: v. 推进
streak: n. 条纹
sodium: n. 钠
subterranean: adj. 地下的
suppress: v. 镇压，抑制
backdrop: n. 背景
humanitarian: adj. 人道主义的; n. 人道主义者，慈善家
savory: adj. 可口的; adj. 咸味的，辛辣的; n. 香薄荷
inevitable: adj. 必然的，不可避免的; n. 必然
deformity: n. 畸形
chain: n. 链; n. 一连串; n. 连锁
hail: v. 致敬，招呼; n. 冰雹
dwindle: v. 减少，变小
cache: n. 贮存物，隐藏处
overt: adj. 公开的，明显的
fusion: n. 融合
antiquity: n. 古物; n. 古代
entwine: v. 缠住，盘绕
hectare: n. 公顷
pictorial: adj. 绘画的，图示的
scarcity: n. 不足，缺乏
analogue: n. 类似物
interference: n. 干扰，妨碍
captive: adj. 被迷住的; adj. 被俘虏的
perennial: adj. 多年生的，四季不断的; adj. 长期存在的; n. 多年生植物
default: v. 拖欠，不履行; n. 系统默认值
congestion: n. 拥挤，拥塞
wrinkle: n. 皱纹; v. 起皱纹
animate: v. 使有生气; adj. 有生命的
destabilize: v. 使动摇
frontal: adj. 正面的，前面的
immobile: adj. 不动的，不能动的
resemble: v. 像
meticulous: adj. 细致的，一丝不苟的
dehydration: n. 脱水
gravitation: n. 重力，万有引力
elliptical: adj. 省略的，隐晦的; adj. 椭圆的
ridge: n. 山脊，山脉
`.trim(),
  5: `
imperil: v. 危及，危害
incite: v. 煽动
discoloration: n. 变色
discrete: adj. 离散的，不连续的
alertness: n. 警戒
ripple: n. 涟漪; v. 传播
surveyor: n. 测量员，检验员
turbulent: adj. 动荡的; adj. (水流)湍急的
canvas: n. 帆布
retrieval: n. 找回，取回; n. 检索
snap: v. 突然折断; v. 猛咬
subsidy: n. 补贴金
aesthetic: adj. 美学的
consensus: n. 一致
dismiss: v. 解散; v. 解雇，开除; v. 不予理会，不予考虑
symbiotic: adj. [生态]共生的
scoop: v. 用勺子挖取; n. 勺子
exertion: n. 发挥，运用
proposition: n. 主张，观点; n. 建议
linguist: n. 语言学家，通晓数国语言的人
feedback: n. 反馈
strata: n. 层，岩层; n. (社会的)阶层
stray: v. 走失; n. 走失者
ubiquitous: adj. 普遍存在的
substantially: adv. 很大程度地
surpass: v. 超越，胜过
viper: n. 蝰蛇，毒蛇
corrode: v. 侵蚀，损害
rotary: adj. 旋转的
align: v. 使结盟; v. 排成一行
retraction: n. 撤回，撤销
linen: n. 亚麻布
canon: n. 标准
amplify: v. 放大，扩大; v. 详述
prolific: adj. 多产的
catholic: adj. 天主教的; adj. 广泛的
strait: n. 海峡; n. 困境
microbial: adj. 微生物的，细菌的
patriotic: adj. 爱国的
pile: n. 堆
allot: v. 分配
emblem: n. 象征，徽章
conventional: adj. 符合习俗的，传统的
rigid: adj. 僵硬的; adj. 严格的，死板的
secretion: n. 分泌，分泌物
mitigate: v. 缓解，减轻
merchandise: n. 商品
adept: adj. 熟练的; n. 能手
cavity: n. 洞; n. (牙齿的)龋洞
flop: v. 失败; v. 重重落下或移动
rite: n. 传统仪式
rudimentary: adj. 根本的，基本的
stalk: n. (植物的)柄，梗; v. 跟踪
yarn: n. 纱线
deposition: n. 证词; n. 沉积物; n. 革职
asymmetrical: adj. 不对称的
fetch: v. 取回
fluidity: n. 流动性
cabin: n. 小屋; n. 客舱，船舱
thaw: v. (冰雪等)融化
sovereign: n. 君主; adj. 具有独立主权的
cosmopolitan: adj. 世界性的
willow: n. 柳树
tuck: v. 塞入; n. (衣服等的)褶
jar: n. 罐子
maze: n. 迷宫; n. (事情等的)错综，复杂
feeble: adj. 微弱的
recede: v. 后退，撤回
enigma: n. 谜
incentive: n. 激励
embed: v. 使嵌入，使插入; v. 使根深蒂固
maxim: n. 格言
immaturity: n. 不成熟
crust: n. 地壳; n. 坚硬外皮
blade: n. 刀锋; n. 叶片
warehouse: n. 仓库
decimal: n. 小数
ultraviolet: adj. 紫外线的
legislation: n. 立法，法律
defer: v. 推迟，延期; v. 听从，遵从
hinder: v. 阻碍
prosperous: adj. 繁荣的
regiment: n. 军团，大量
embody: v. 体现，使具体化
hospitalize: v. 就医，使住院
unsophisticated: adj. 未经世故的; adj. 不精细的
germinate: v. 使发芽，使生长
impersonate: v. 扮演; v. 冒充
raft: n. 木排，筏
glandular: adj. 腺的，腺状的
monastery: n. 修道院
sulfur: n. 硫磺
yield: n. 产量; v. 屈服，投降
vacuum: n. 真空; n. 真空吸尘器
segment: n. 部分
stack: v. 堆叠，堆放; n. 堆
amnesia: n. 健忘症
ritualize: v. 使礼仪化
paradigm: n. 范例
loom: n. 织布机; v. (可怕的事)逐渐迫近，隐约显现
`.trim(),
  6: `
stimulus: n. 刺激; n. 动力
observatory: n. 天文台
urbane: adj. 彬彬有礼的
sprout: v. 发芽
piracy: n. 盗版，剽窃; n. 海盗行为
eclipse: v. 使黯然失色; n. 日蚀，月蚀
overrule: v. 否决
tonal: adj. 色调的，音调的
dwarf: n. 侏儒，矮子
senate: n. 参议院
reciprocate: v. 同等回应，回报
desolate: adj. 荒凉的
reap: v. 收割(庄稼)，收获
astound: v. 使震惊
electromagnetic: adj. 电磁的
lens: n. 镜头; n. 隐形眼镜
flake: n. 小薄片; v. 使……成薄片
patron: n. 资助人; n. 主顾
deform: v. 使变形
dynamism: n. 推动力
compensation: n. 补偿，报酬
convict: v. 证明有罪; n. 罪犯
junction: n. 汇合点
cramp: n. 痉挛; v. 束缚，限制; adj. 难解的
impoverish: v. 使贫穷，使枯竭
toad: n. 蟾蜍
gigantic: adj. 巨大的，庞大的
utter: v. 发出(声音)，说; adj. 完全的，彻底的
monopoly: n. 垄断
misconception: n. 错误的观念
spectrum: n. 光谱; n. 范围
altitude: n. 高度
ancestral: adj. 祖先的
grandeur: n. 壮丽，庄严，宏伟
condensation: n. 冷凝; n. 压缩
contaminate: v. 污染
crow: n. 乌鸦; v. 啼叫，自鸣得意
juror: n. 陪审员
adrift: adj. 漂浮着的; adj. 漂泊的
refinery: n. 精炼厂
overwhelm: v. 淹没; v. (强烈地影响而)使不知所措; v. 击败
bearing: n. 举止; n. 关系; n. 方位
iridescent: adj. 彩虹色的
compulsory: adj. 义务的
appall: v. 使胆寒
dialect: n. 方言
oceanic: adj. 海洋的
immerse: v. 浸泡; v. 陷入
tether: v. 拴住
infertile: adj. 贫瘠的; adj. 不育的
trim: v. 修剪; v. 装饰，镶边于
alpine: adj. 阿尔卑斯山的，高山的
aristocrat: n. 贵族
mow: v. 割草
turbine: n. 涡轮
utensil: n. 器皿，用具
disclaimer: n. 免责声明
cognitive: adj. 认知的
metabolism: n. 新陈代谢
ascribe: v. 归因于
plummet: v. 垂直落下，骤然下跌
phase: n. 阶段
tyranny: n. 专制暴政
pollen: n. 花粉
excavate: v. 挖掘，开凿
luminous: adj. 发光的
cello: n. 大提琴
crystallize: v. 使结晶
entitle: v. 称做……定名为; v. 使……有权利
malicious: adj. 恶意的
exposed: adj. 暴露的
proxy: n. 代理权，代理人
spite: n. 恶意
mutual: adj. 相互的
bleak: adj. 阴冷的，荒凉的; adj. 黯淡的，无希望的
ensue: v. 跟着发生，接着发生
conserve: v. 保存
contraction: n. 收缩，紧缩; n. 缩写
woolen: adj. 羊毛的
analogy: n. 类比
driven: adj. 发奋图强的
meteorite: n. 陨星，陨石
anomaly: n. 异常
microorganism: n. 微生物
buffalo: n. 水牛
conductance: n. [电]电导，导率，电导系数
culprit: n. 犯人，罪犯
predominant: adj. 占主导地位的
vicinity: n. 邻近，附近
culminate: v. 达到顶点
dome: n. 圆屋顶
carbohydrate: n. 碳水化合物
assembly: n. 集会; n. 装配
fluctuate: v. 波动
plague: n. 瘟疫; v. 折磨，使苦恼
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
