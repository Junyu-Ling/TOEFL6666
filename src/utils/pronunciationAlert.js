/** 已知的非自然拼读 / 易读错词（小写 key） */
const KNOWN_IRREGULAR = {
  doubt: "字母 b 不发音，读 /daʊt/，别按字母逐个读成「dou-bt」",
  recipe: "读 /ˈresəpi/（类似「瑞瑟皮」），不是按 re-ci-pe 自然拼读",
  island: "字母 s 不发音，读 /ˈaɪlənd/",
  colonel: "读 /ˈkɜːrnəl/（「kernel」），与拼写差异很大",
  women: "读 /ˈwɪmɪn/，o 发 /ɪ/，与 woman 不同",
  busy: "u 读 /ɪ/，读 /ˈbɪzi/，不是「bu-sy」",
  answer: "w 不发音，读 /ˈænsər/",
  sword: "w 不发音，读 /sɔːrd/",
  choir: "读 /ˈkwaɪər/，ch 发 /k/",
  queue: "qu 整体读 /kjuː/，后四个字母都不发音",
  facade: "c 读 /s/，读 /fəˈsɑːd/",
  debris: "s 不发音，读 /dəˈbriː/",
  chaos: "ch 读 /k/，读 /ˈkeɪɑːs/",
  yacht: "ch 读 /t/，读 /jɑːt/",
  one: "o 读 /wʌ/，读 /wʌn/",
  two: "w 不发音，读 /tuː/",
  done: "o 读 /ʌ/，读 /dʌn/",
  love: "o 读 /ʌ/，读 /lʌv/",
  come: "o 读 /ʌ/，读 /kʌm/",
  some: "o 读 /ʌ/，读 /sʌm/",
  move: "o 读 /uː/，读 /muːv/",
  tomb: "b 不发音，读 /tuːm/",
  climb: "b 不发音，读 /klaɪm/",
  debt: "b 不发音，读 /det/",
  subtle: "b 不发音，读 /ˈsʌtl/",
  lamb: "b 不发音，读 /læm/",
  thumb: "b 不发音，读 /θʌm/",
  know: "k 不发音，读 /noʊ/",
  knife: "k 不发音，读 /naɪf/",
  knee: "k 不发音，读 /niː/",
  knock: "k 不发音，读 /nɑːk/",
  write: "w 不发音，读 /raɪt/",
  wrong: "w 不发音，读 /rɔːŋ/",
  wrist: "w 不发音，读 /rɪst/",
  psychology: "p 不发音，读 /saɪˈkɑːlədʒi/",
  pneumonia: "p 不发音，读 /nuːˈmoʊniə/",
  receipt: "p 不发音，读 /rɪˈsiːt/",
  indict: "c 不发音，读 /ɪnˈdaɪt/",
  salmon: "l 不发音，读 /ˈsæmən/",
  almond: "l 常不发音，读 /ˈɑːmənd/",
  Wednesday: "d 不发音，读 /ˈwenzdeɪ/",
  February: "第一个 r 常弱化，读 /ˈfebrueri/",
  comfortable: "o 常弱读，读 /ˈkʌmftərbəl/",
  vegetable: "第二个 e 常不发音，读 /ˈvedʒtəbəl/",
  chocolate: "o 常读 /ɑː/，读 /ˈtʃɑːklət/",
  enough: "ough 读 /ʌf/，读 /ɪˈnʌf/",
  through: "ough 读 /uː/，读 /θruː/",
  though: "ough 读 /oʊ/，读 /ðoʊ/",
  thought: "ough 读 /ɔː/，读 /θɔːt/",
  cough: "ough 读 /ɒf/，读 /kɒf/",
  rough: "ough 读 /ʌf/，读 /rʌf/",
};

const SILENT_B_WORDS = new Set([
  "climb",
  "comb",
  "crumb",
  "debt",
  "doubt",
  "dumb",
  "lamb",
  "numb",
  "plumb",
  "subtle",
  "thumb",
  "tomb",
  "womb",
]);

const SILENT_K_WORDS = new Set([
  "knack",
  "knapsack",
  "knee",
  "kneel",
  "knife",
  "knight",
  "knit",
  "knob",
  "knock",
  "knot",
  "know",
  "knowledge",
]);

const SILENT_W_BEFORE_R = new Set([
  "wrap",
  "wrath",
  "wreak",
  "wreck",
  "wrest",
  "wrestle",
  "wretch",
  "wring",
  "wrinkle",
  "wrist",
  "write",
  "written",
  "wrong",
  "wrote",
]);

function normalize(word = "") {
  return String(word).toLowerCase().replace(/[^a-z]/g, "");
}

function detectByPattern(word) {
  if (SILENT_B_WORDS.has(word)) {
    return "字母 b 不发音，别按自然拼读把 b 念出来";
  }
  if (SILENT_K_WORDS.has(word)) {
    return "字母 k 不发音，别按自然拼读把 k 念出来";
  }
  if (SILENT_W_BEFORE_R.has(word)) {
    return "字母 w 不发音，别按自然拼读把 w 念出来";
  }
  if (/^re[^aeiou]/.test(word) && word.endsWith("e") && word.length >= 5) {
    if (["recipe", "recite", "reduce", "remote", "remove", "reply"].includes(word)) {
      if (word === "recipe") return KNOWN_IRREGULAR.recipe;
      if (word === "recite") return "读 /rɪˈsaɪt/，re- 发 /rɪ/ 而非「瑞」";
    }
  }
  if (word.includes("ough")) {
    return "含 -ough，读音多变，别按字母硬拼";
  }
  return null;
}

/**
 * @returns {{ message: string, source: 'known'|'pattern'|'ai' } | null}
 */
export function getPronunciationAlert(word, aiNote) {
  const normalized = normalize(word);
  if (!normalized) return null;

  if (aiNote?.trim()) {
    return { message: aiNote.trim(), source: "ai" };
  }

  if (KNOWN_IRREGULAR[normalized]) {
    return { message: KNOWN_IRREGULAR[normalized], source: "known" };
  }

  const pattern = detectByPattern(normalized);
  if (pattern) {
    return { message: pattern, source: "pattern" };
  }

  return null;
}
