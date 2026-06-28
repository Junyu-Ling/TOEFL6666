export const MOTTOS = [
  "词汇是阅读的地基，每天一块砖，大厦终会建起。",
  "重复是记忆的母亲，复习是单词的伴侣。",
  "不怕慢，只怕站；每天十个词，一年就是一座词山。",
  "单词不会一次记住，但会一次比一次熟悉。",
  "今天的生词，是明天阅读时的老朋友。",
  "错一次，记一次；错得越多，印象越深。",
  "熟词本是汗水写的，不是天赋赐的。",
  "A word a day keeps confusion away.",
  "The limits of my language mean the limits of my world.",
  "Every expert was once a beginner with a flashcard.",
  "Small daily progress beats occasional cramming.",
  "读不懂，往往是词不够；词够了，世界就大了。",
  "发音、拼写、释义——多走一遍，就多一分把握。",
  "生词本里的每一个词，都是通往高分的台阶。",
  "坚持打卡的人，火苗会替你说话。",
  "别追求一次记住，追求永不放弃。",
  "语境里学过的词，考场上才站得住。",
  "今天多背一个词，明天少查一次词典。",
  "词汇量不是背出来的，是练出来的。",
  "把单词当朋友，多见几次面就认识了。",
  "托福之路，一词一步。",
  "复习旧词，胜过盲背新词。",
  "听、说、读、写——词活用了，才算真的会。",
  "你背过的每个词，都在悄悄改写你的分数。",
  "慢工出细活，细活出高分。",
];

export function pickRandomMotto() {
  return MOTTOS[Math.floor(Math.random() * MOTTOS.length)];
}
