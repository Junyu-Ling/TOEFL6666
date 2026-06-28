import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../public/api/wordlists");

const RAW = `
crack: n. 裂缝; v. 砸开，使裂开; v. 使……精神崩溃
union: n. 联合; n. 工会
modify: v. 变更，修改
ghost: n. 鬼魂
chase: v. 追赶
predictable: adj. 可预测的; adj. 墨守成规的
casual: adj. 随便的，非正式的
adjustment: n. 调整
melt: v. 融化，变软
relocate: v. 搬迁，迁移
sculpt: v. 使……成形，雕塑
given: adj. 给定的; prep. 鉴于，考虑到
reaction: n. 反应
attendant: n. 服务员，陪伴者
entire: adj. 全部的
narrate: v. 讲，为……作解说
mammal: n. 哺乳动物
untouched: adj. 未改变的，未受损的
interpret: v. 解读; v. 翻译; v. 诠释
burn: v. 燃烧; v. 烧毁
cell: n. 细胞; n. 单人牢房
predict: v. 预言，预告
liberty: n. 自由
victimize: v. 使受害
identify: v. 鉴定，识别
enrich: v. 充实，使……富裕
orchestra: n. 管弦乐团，交响乐团
suck: v. 吸食
basis: n. 基础
guarantee: v./n. 保证
molecule: n. 分子
atmospheric: adj. 大气的
skilled: adj. 熟练的，技术性的
clue: n. 线索
newborn: adj. 新生的; n. 新生儿
vary: v. （使）变化; v. （使）多样化
smooth: adj. 平滑的，流畅的; v. 消除障碍
evident: adj. 明显的
promising: adj. 很有希望的
machinery: n. 机器，机件
remote: adj. 遥远的，偏僻的; adj. 很久以前（以后）
edition: n. 版本
reconstruct: v. 重建
mature: adj. 成熟的; v. 成熟，使成熟
gene: n. 基因
leisure: n. 空闲，闲暇; adj. 空闲的
normal: adj./adv. 通常，正常地
declare: v. 表态
cure: v. 治愈; n. 疗法
latter: adj. 后者的; adj. 靠后的，后部的
tempt: v. 引诱
renew: v. 翻新; v. 恢复; v. 续延
stretch: v. 伸展，伸出; v. 扩大，撑开
fossil: n. 化石
promote: v. 增进，提倡
leadership: n. 领导职位，领导才能
minority: n. 少数，少数民族
damp: adj. 潮湿的; v. （使）潮湿
whereby: adv. 凭此
implication: n. 暗示; n. 可能的结果
convey: v. 表达，传达; v. 运送
unavailable: adj. 无法得到的; adj. 没空的
pursue: v. 追赶，纠缠; v. 追求
critic: n. 评论家，批评者
visible: adj. 看得见的; adj. 明显的，引人注目的
tropical: adj. 热带的，非常湿热的
establish: v. 创立; v. 使受到认同
squeeze: v. 挤，压
mislead: v. 误导
chip: n. （切下的）片; n. 芯片
seldom: adv. 不常，很少
character: n. 性格，特点; n. 角色
eventual: adj. 最终的
explore: v. 勘察，探索
unexpected: adj. 出乎意料的; n. 意外的事情
propose: v. 申请，提议; v. 求婚
viewpoint: n. 观点; n. 观看位置
selection: n. 挑选; n. 被选中者
confirm: v. 证实
skirt: n. 裙子，裙摆; v. 沿……的边缘走，回避; n. 边缘，外沿
drain: n. 下水道; v. 排空……的水
criminal: n. 罪犯; adj. 犯罪的，可耻的
departure: n. 出发，启程
sizable: adj. 大的
decorate: v. 装饰
wrist: n. 腕关节
theorist: n. 理论家
install: v. 放置，安装
coordinate: n. 坐标; v. 协调
crisis: n. 危机
whereas: conj. 然而
secretary: n. 秘书
reminder: n. 提醒，唤起记忆的事物
outdated: adj. 陈旧的
stable: adj. 稳定的，稳重的
dean: n. 院长; n. 主任牧师
pest: n. 害兽，讨厌的人
offer: v. 提出; v. 主动提供; n. 提议，出价
bury: v. 掩埋
recognizable: adj. 可认出的
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
    list: 5,
    title: "Level 3 · List 5",
    updatedAt: new Date().toISOString().slice(0, 10),
  },
  words,
};

const outPath = path.join(dir, "level3-list5.json");
fs.writeFileSync(outPath, JSON.stringify(data, null, 2));

const manifestPath = path.join(dir, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.updatedAt = data.meta.updatedAt;
manifest.lists = [
  ...manifest.lists.filter((l) => l.id !== "level3-list5"),
  {
    id: "level3-list5",
    title: data.meta.title,
    level: 3,
    list: 5,
    wordCount: words.length,
  },
].sort((a, b) => a.level - b.level || a.list - b.list);

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`Created ${outPath} with ${words.length} words`);
