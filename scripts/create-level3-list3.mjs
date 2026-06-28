import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../public/api/wordlists");

const RAW = `
irregular: adj. 不规则的; adj. 无规律的
neutral: adj. 中性的; adj. 中立的; adj. 不鲜艳的
chart: n. 图表
solar: adj. 太阳的
volcano: n. 火山
witness: v. 目击，目睹; n. 证人
span: n. 一段时间; n. 跨度
administration: n. 管理; n. 行政
fancy: v. 爱慕; n. 想象; adj. 奢华的，精选的
apply: v. 申请; v. 适用; v. 应用
challenge: v./n. 挑战
magnificent: adj. 壮丽的
standardize: v. 使标准化
serious: adj. 严肃的; adj. 严重的
centralize: v. 对……实行集权
committee: n. 委员会
withdraw: v. 撤销，取消; v. 提取; v. 撤退
collide: v.（车等）碰撞; v.（意志等）冲突
incredible: adj. 令人难以置信的; adj. 极好的
reintroduce: v. 重新引入
complaint: n. 抱怨，投诉
achievement: n. 成就
residential: adj. 住宅的
faraway: adj. 遥远的
counter: n. 柜台; pref. 反……的
application: n. 申请; n. 实施; n. 手机应用
colony: n. 殖民地; n.（鸟、蚁、蜜蜂等的）集团，群
multiple: adj. 多个的，复合的
drift: v. 漂流; v. 涣散
organ: n. 管风琴; n. 器官
informant: n. 提供消息的人
pose: v. 摆姿势; v. 提出; n. 姿势，故作姿态
tunnel: v./n.（挖）隧道
masterpiece: n. 杰作，名著
exception: n. 例外
quarter: n. 四分之一; n.（复数）住处
curly: adj. 卷曲的
qualify: v. 使具有资格
emperor: n. 皇帝
reliability: n. 可靠性，准确性
orbit: n. 轨道; v. 沿轨道运行; n. 势力范围
aid: n./v. 援助
thoughtful: adj. 体贴的; adj. 沉思的
cooperate: v. 合作，配合
talented: adj. 才华横溢的
coastal: adj. 近海的
scheme: n. 计划，方案; v. 设计（计划）
chief: adj. 主要的; n. 首席，酋长
disaster: n. 灾难; n. 极为糟糕的事
remark: n./v. 评论，谈论
recognition: n. 认识，识别; n. 认可，赞誉
community: n. 团体，社区; n. 群落
compute: v. 计算
interact: v. 互相作用，互动
straighten: v. 使变直; v. 改进，为……解除困惑
literature: n. 文学
pant: v./n. 气喘; v. 渴望; n. 裤子
thrill: n. 震颤感，兴奋; v. 使……非常兴奋
technological: adj. 科技的
warfare: n. 战争，战争状态
sum: n. 总和; v. 总结
employee: n. 雇员
amuse: v. 给……提供消遣
overseas: adj./adv. 海外
bend: v. 弄弯
automatic: adj. 自动的; n. 自动枪
athlete: n. 运动员
emerge: v. 出现
coincide: v. 与……相符; v. 与……同时发生
immediate: adj. 立刻的; adj. 紧邻的
poke: v. 戳，捅
crew: n. 全体船员，全体工作人员
wrap: v. 卷，缠（绕）
tropic: n. 热带（地区）
presentation: n. 呈现; n. 展示
operator: n. 操作者，经营者
trend: n. 倾向，趋势; v. 显示出趋势
warn: v. 警告
commerce: n. 商业
seek: v. 寻找，请求
comedy: n. 喜剧
hint: n. 暗示，提示; v. 暗示
occupy: v. 占领，占据
criticism: n. 批评
assert: v. 主张，断言
calorie: n. 卡路里（热量单位）
shield: v. 防护; n. 防御物
forum: n. 论坛
alphabet: n. 字母表
shellfish: n. 水生有壳动物
harmony: n. 和谐; n. 和声，和声学
determine: v. 确定; v. 查明
fundamental: adj. 基本的
access: n. 入口
attain: v. 达到，获得
technician: n. 技师
deny: v. 否认; v. 拒绝给予
efficient: adj. 高效的
govern: v. 治理，执政; v. 支配，决定
adaptation: n. 适应性
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
    list: 3,
    title: "Level 3 · List 3",
    updatedAt: new Date().toISOString().slice(0, 10),
  },
  words,
};

const outPath = path.join(dir, "level3-list3.json");
fs.writeFileSync(outPath, JSON.stringify(data, null, 2));

const manifestPath = path.join(dir, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.updatedAt = data.meta.updatedAt;
manifest.lists = [
  ...manifest.lists.filter((l) => l.id !== "level3-list3"),
  {
    id: "level3-list3",
    title: data.meta.title,
    level: 3,
    list: 3,
    wordCount: words.length,
  },
].sort((a, b) => a.level - b.level || a.list - b.list);

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`Created ${outPath} with ${words.length} words`);
