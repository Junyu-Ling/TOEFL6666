/** 精确读音提示（词库内单词，由规则扫描 + 人工校验） */
export const KNOWN_IRREGULAR = {
  doubt: "字母 b 不发音，读 /daʊt/",
  doubtful: "沿 doubt 读音，b 不发音，读 /ˈdaʊtfəl/",
  doubtless: "沿 doubt 读音，b 不发音，读 /ˈdaʊtləs/",
  recipe: "读 /ˈresəpi/，不是按 re-ci-pe 自然拼读",
  recite: "读 /rɪˈsaɪt/，re- 发 /rɪ/ 而非「瑞」",
  island: "字母 s 不发音，读 /ˈaɪlənd/",
  aisle: "s 不发音，读 /aɪl/",
  isle: "s 不发音，读 /aɪl/",
  debris: "s 不发音，读 /dəˈbriː/",
  colonel: "读 /ˈkɜːrnəl/，与拼写差异很大",
  women: "读 /ˈwɪmɪn/，o 发 /ɪ/",
  woman: "读 /ˈwʊmən/，与 women 读音不同",
  busy: "u 读 /ɪ/，读 /ˈbɪzi/",
  business: "i 读 /ɪ/，读 /ˈbɪznəs/",
  answer: "w 不发音，读 /ˈænsər/",
  sword: "w 不发音，读 /sɔːrd/",
  choir: "读 /ˈkwaɪər/，ch 发 /k/",
  chaos: "ch 读 /k/，读 /ˈkeɪɑːs/",
  yacht: "ch 读 /t/，读 /jɑːt/",
  queue: "qu 读 /kjuː/，后四个字母不发音",
  facade: "c 读 /s/，读 /fəˈsɑːd/",
  one: "o 发 /wʌ/，读 /wʌn/",
  two: "w 不发音，读 /tuː/",
  done: "o 读 /ʌ/，读 /dʌn/",
  love: "o 读 /ʌ/，读 /lʌv/",
  come: "o 读 /ʌ/，读 /kʌm/",
  some: "o 读 /ʌ/，读 /sʌm/",
  move: "o 读 /uː/，读 /muːv/",
  tomb: "b 不发音，读 /tuːm/",
  climb: "b 不发音，读 /klaɪm/",
  debt: "b 不发音，读 /det/",
  indebted: "b 不发音，读 /ɪnˈdetɪd/",
  subtle: "b 不发音，读 /ˈsʌtl/",
  subtlety: "b 不发音，读 /ˈsʌtlti/",
  lamb: "b 不发音，读 /læm/",
  thumb: "b 不发音，读 /θʌm/",
  dumb: "b 不发音，读 /dʌm/",
  numb: "b 不发音，读 /nʌm/",
  plumb: "b 不发音，读 /plʌm/",
  crumb: "b 不发音，读 /krʌm/",
  comb: "b 不发音，读 /koʊm/",
  womb: "b 不发音，读 /wuːm/",
  limb: "b 不发音，读 /lɪm/",
  know: "k 不发音，读 /noʊ/",
  knowledge: "k 不发音，读 /ˈnɑːlɪdʒ/",
  knife: "k 不发音，读 /naɪf/",
  knee: "k 不发音，读 /niː/",
  knock: "k 不发音，读 /nɑːk/",
  write: "w 不发音，读 /raɪt/",
  wrong: "w 不发音，读 /rɔːŋ/",
  wrist: "w 不发音，读 /rɪst/",
  wrap: "w 不发音，读 /ræp/",
  wreck: "w 不发音，读 /rek/",
  wrestle: "w 不发音，读 /ˈresəl/",
  wrinkle: "w 不发音，读 /ˈrɪŋkəl/",
  psychology: "p 不发音，读 /saɪˈkɑːlədʒi/",
  pneumonia: "p 不发音，读 /nuːˈmoʊniə/",
  receipt: "p 不发音，读 /rɪˈsiːt/",
  salmon: "l 不发音，读 /ˈsæmən/",
  almond: "l 常不发音，读 /ˈɑːmənd/",
  wednesday: "d 不发音，读 /ˈwenzdeɪ/",
  february: "第一个 r 常弱化，读 /ˈfebrueri/",
  comfortable: "o 弱读，读 /ˈkʌmftərbəl/",
  vegetable: "第二个 e 常不发音，读 /ˈvedʒtəbəl/",
  chocolate: "o 读 /ɑː/，读 /ˈtʃɑːklət/",
  enough: "ough 读 /ʌf/，读 /ɪˈnʌf/",
  through: "ough 读 /uː/，读 /θruː/",
  though: "ough 读 /oʊ/，读 /ðoʊ/",
  thought: "ough 读 /ɔː/，读 /θɔːt/",
  thoughtful: "ough 读 /ɔː/，读 /ˈθɔːtfəl/",
  cough: "ough 读 /ɒf/，读 /kɒf/",
  rough: "ough 读 /ʌf/，读 /rʌf/",
  roughly: "ough 读 /ʌf/，读 /ˈrʌfli/",
  thorough: "ough 读 /ʌrə/，读 /ˈθɜːroʊ/",
  tough: "ough 读 /ʌf/，读 /tʌf/",
  drought: "ough 读 /aʊ/，读 /draʊt/",
  epitome: "读 /ɪˈpɪtəmi/，末尾 -ome 不发「欧姆」",
  extraordinary: "读 /ɪkˈstrɔːrdəneri/，重音在第二音节",
  bizarre: "读 /bɪˈzɑːr/，末尾 -re 不发「瑞」",
  genre: "读 /ˈʒɑːnrə/，g 发 /ʒ/",
  viscera: "c 读 /ʃ/，读 /ˈvɪsərə/",
  indict: "c 不发音，读 /ɪnˈdaɪt/",
  folk: "l 不发音，读 /foʊk/",
  mortgage: "t 常不发音，读 /ˈmɔːrɡɪdʒ/",
  hustle: "t 不发音，读 /ˈhʌsəl/",
  bustle: "t 不发音，读 /ˈbʌsəl/",
  nestle: "t 不发音，读 /ˈnesəl/",
  hasten: "t 不发音，读 /ˈheɪsən/",
  listen: "t 不发音，读 /ˈlɪsən/",
  glisten: "t 不发音，读 /ˈɡlɪsən/",
  castle: "t 不发音，读 /ˈkæsəl/",
  whistle: "t 不发音，读 /ˈwɪsəl/",
  scholar: "ch 读 /k/，读 /ˈskɑːlər/",
  schedule: "ch 读 /k/，美式读 /ˈskedʒuːl/",
  reschedule: "ch 读 /k/，读 /riːˈskedʒuːl/",
  scheme: "ch 读 /k/，读 /skiːm/",
  chorus: "ch 读 /k/，读 /ˈkɔːrəs/",
  choreograph: "ch 读 /k/，读 /ˈkɔːriəɡræf/",
  choreographer: "ch 读 /k/，读 /ˌkɔːriˈɑːɡrəfər/",
  chaotic: "ch 读 /k/，读 /keɪˈɑːtɪk/",
  chondrite: "ch 读 /k/，读 /ˈkɒndraɪt/",
  chronological: "ch 读 /k/，读 /ˌkrɒnəˈlɒdʒɪkəl/",
  chloride: "ch 读 /k/，读 /ˈklɔːraɪd/",
  chromosome: "ch 读 /k/，读 /ˈkroʊməsoʊm/",
  align: "g 不发音，读 /əˈlaɪn/",
  assign: "g 不发音，读 /əˈsaɪn/",
  assignment: "g 不发音，读 /əˈsaɪnmənt/",
  campaign: "g 不发音，读 /kæmˈpeɪn/",
  design: "g 不发音，读 /dɪˈzaɪn/",
  designate: "g 不发音，读 /ˈdezɪɡneɪt/",
  designation: "g 不发音，读 /ˌdezɪɡˈneɪʃən/",
  redesign: "g 不发音（design 部分），读 /ˌriːdɪˈzaɪn/",
  reign: "g 不发音，读 /reɪn/",
  sovereign: "g 不发音，读 /ˈsɒvrɪn/",
  foreign: "g 不发音，读 /ˈfɔːrən/",
  ghost: "gh 不发音，读 /ɡoʊst/",
  column: "n 不发音，读 /ˈkɒləm/",
};

const SILENT_B_WORDS = new Set([
  "climb",
  "comb",
  "crumb",
  "debt",
  "doubt",
  "doubtful",
  "doubtless",
  "dumb",
  "indebted",
  "lamb",
  "limb",
  "numb",
  "plumb",
  "subtle",
  "subtlety",
  "thumb",
  "tomb",
  "womb",
]);

const SILENT_GN_WORDS = new Set([
  "align",
  "assign",
  "assignment",
  "campaign",
  "consign",
  "design",
  "designate",
  "designation",
  "feign",
  "foreign",
  "malign",
  "reign",
  "resign",
  "sign",
  "sovereign",
]);

const CH_AS_K_WORDS = new Set([
  "architect",
  "architecture",
  "character",
  "characteristic",
  "characterize",
  "chaotic",
  "chloride",
  "chondrite",
  "choreograph",
  "choreographer",
  "chorus",
  "chronological",
  "chromosome",
  "scholar",
  "schedule",
  "reschedule",
  "scheme",
  "technician",
  "technique",
  "technological",
]);

const RECIPE_FAMILY = new Set(["recipe", "recite", "recital", "recipient"]);

const OUGH_WORDS = {
  drought: "ough 读 /aʊ/，读 /draʊt/",
  enough: "ough 读 /ʌf/，读 /ɪˈnʌf/",
  rough: "ough 读 /ʌf/，读 /rʌf/",
  roughly: "ough 读 /ʌf/，读 /ˈrʌfli/",
  though: "ough 读 /oʊ/，读 /ðoʊ/",
  thought: "ough 读 /ɔː/，读 /θɔːt/",
  thoughtful: "ough 读 /ɔː/，读 /ˈθɔːtfəl/",
  through: "ough 读 /uː/，读 /θruː/",
  thorough: "ough 读 /ʌrə/，读 /ˈθɜːroʊ/",
  tough: "ough 读 /ʌf/，读 /tʌf/",
};

const RULES = [
  {
    category: "silent-b",
    test: (w) =>
      SILENT_B_WORDS.has(w) ||
      w.includes("doubt") ||
      /^debt/.test(w) ||
      /^subtle/.test(w),
    message: (w) => {
      if (KNOWN_IRREGULAR[w]) return KNOWN_IRREGULAR[w];
      if (w.includes("doubt")) return "含 doubt，b 不发音";
      if (/^debt/.test(w)) return "含 debt，b 不发音";
      if (/^subtle/.test(w)) return "含 subtle，b 不发音";
      return "字母 b 不发音，别按自然拼读读 b";
    },
  },
  {
    category: "silent-k",
    test: (w) => w.startsWith("kn"),
    message: (w) => KNOWN_IRREGULAR[w] || "字母 k 不发音，别按自然拼读读 k",
  },
  {
    category: "silent-w",
    test: (w) => w.startsWith("wr"),
    message: (w) => KNOWN_IRREGULAR[w] || "字母 w 不发音，别按自然拼读读 w",
  },
  {
    category: "silent-p",
    test: (w) => w.startsWith("psy") || w.startsWith("pn") || w === "receipt",
    message: (w) => {
      if (w.startsWith("psy")) return "p 不发音，读 /saɪ/";
      if (w.startsWith("pn")) return "p 不发音";
      return KNOWN_IRREGULAR.receipt;
    },
  },
  {
    category: "silent-l",
    test: (w) => ["almond", "folk", "salmon"].includes(w),
    message: (w) => KNOWN_IRREGULAR[w] || "字母 l 常不发音",
  },
  {
    category: "silent-t",
    test: (w) =>
      ["bustle", "castle", "glisten", "hasten", "hustle", "listen", "mortgage", "nestle", "whistle", "wrestle"].includes(
        w
      ),
    message: (w) => KNOWN_IRREGULAR[w] || "t 常不发音（-sten/-stle），别硬读 t",
  },
  {
    category: "silent-s",
    test: (w) => ["aisle", "debris", "isle", "island", "viscera"].includes(w),
    message: (w) => KNOWN_IRREGULAR[w] || "s 不发音",
  },
  {
    category: "silent-n",
    test: (w) => w === "column",
    message: () => KNOWN_IRREGULAR.column,
  },
  {
    category: "silent-g",
    test: (w) => SILENT_GN_WORDS.has(w) || w === "ghost",
    message: (w) => KNOWN_IRREGULAR[w] || "g 不发音（-gn），别硬读 g",
  },
  {
    category: "ough",
    test: (w) => w.includes("ough"),
    message: (w) => OUGH_WORDS[w] || KNOWN_IRREGULAR[w] || "含 -ough，读音多变，别按字母硬拼",
  },
  {
    category: "recipe-family",
    test: (w) => RECIPE_FAMILY.has(w),
    message: (w) => KNOWN_IRREGULAR[w] || "re- 常读 /rɪ/ 或 /rə/，不是「瑞」",
  },
  {
    category: "ch-special",
    test: (w) => CH_AS_K_WORDS.has(w) || ["choir", "chaos", "yacht"].includes(w),
    message: (w) => {
      if (KNOWN_IRREGULAR[w]) return KNOWN_IRREGULAR[w];
      return "ch 读 /k/，不是「吃」";
    },
  },
  {
    category: "known-extra",
    test: (w) =>
      [
        "bizarre",
        "epitome",
        "extraordinary",
        "genre",
        "queue",
        "facade",
        "colonel",
        "indict",
        "answer",
        "sword",
        "women",
        "woman",
        "busy",
        "business",
        "one",
        "two",
        "done",
        "love",
        "come",
        "some",
        "move",
        "wednesday",
        "february",
        "comfortable",
        "vegetable",
        "chocolate",
      ].includes(w),
    message: (w) => KNOWN_IRREGULAR[w],
  },
];

export function normalizePronunciationWord(word = "") {
  return String(word).toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * @returns {{ message: string, category: string } | null}
 */
export function detectIrregularPronunciation(word) {
  const w = normalizePronunciationWord(word);
  if (!w) return null;

  if (KNOWN_IRREGULAR[w]) {
    return { message: KNOWN_IRREGULAR[w], category: "known" };
  }

  for (const rule of RULES) {
    if (!rule.test(w)) continue;
    const message = rule.message(w);
    if (message) {
      return { message, category: rule.category };
    }
  }

  return null;
}
