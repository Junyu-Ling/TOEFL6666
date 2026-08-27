import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PHONETICS_PATH = path.join(__dirname, '../src/data/phonetics.json');

// 常见单词的正确音标（作为备用数据）
const BACKUP_PHONETICS = {
  "sociologist": "/ˌsəʊsiˈɒlədʒɪst/",
  "fore": "/fɔː(r)/",
  "dictation": "/dɪkˈteɪʃn/",
  "meaty": "/ˈmiːti/",
  "straightforward": "/ˌstreɪtˈfɔːwəd/",
  "assignment": "/əˈsaɪnmənt/",
  "undesirable": "/ˌʌndɪˈzaɪərəbl/",
  "isolate": "/ˈaɪsəleɪt/",
  "self-sufficient": "/ˌself səˈfɪʃnt/",
  "naturalist": "/ˈnætʃrəlɪst/",
  "reject": "/rɪˈdʒekt/",
  "contact": "/ˈkɒntækt/",
  "millimeter": "/ˈmɪlɪmiːtə(r)/",
  "incomplete": "/ˌɪnkəmˈpliːt/",
  "antarctic": "/ænˈtɑːktɪk/",
  "necessarily": "/ˌnesəˈserəli/",
  "unrelated": "/ˌʌnrɪˈleɪtɪd/",
  "mere": "/mɪə(r)/",
  "forgetful": "/fəˈɡetfl/",
  "practically": "/ˈpræktɪkli/",
  "reliance": "/rɪˈlaɪəns/",
  "fecundity": "/fɪˈkʌndəti/",
  "fertile": "/ˈfɜːtaɪl/",
  "barren": "/ˈbærən/",
  "productive": "/prəˈdʌktɪv/",
  "abundance": "/əˈbʌndəns/",
  "prolific": "/prəˈlɪfɪk/",
  "sterile": "/ˈsteraɪl/",
  "reproduction": "/ˌriːprəˈdʌkʃn/",
  "offspring": "/ˈɒfsprɪŋ/",
  "propagate": "/ˈprɒpəɡeɪt/",
};

// 从Merriam-Webster式格式转换（备用方案）
function convertMWPhonetic(word) {
  // 一些启发式规则来生成基本音标
  const patterns = {
    // 常见结尾
    'tion$': 'ʃən',
    'sion$': 'ʒən',
    'ment$': 'mənt',
    'ness$': 'nəs',
    'ful$': 'fl',
    'less$': 'ləs',
    'ly$': 'li',
    'ity$': 'əti',
    'ous$': 'əs',
    'ive$': 'ɪv',
    'able$': 'əbl',
    'ible$': 'əbl',
    
    // 常见前缀
    '^un': 'ʌn',
    '^re': 'riː',
    '^pre': 'priː',
    '^dis': 'dɪs',
    '^mis': 'mɪs',
    '^over': 'ˈəʊvə',
    '^under': 'ˈʌndə',
  };
  
  // 这只是一个非常基础的后备方案
  // 实际应用中应该使用专业的音标数据库
  return null;
}

// 应用备用音标
function applyBackupPhonetics() {
  const data = JSON.parse(fs.readFileSync(PHONETICS_PATH, 'utf-8'));
  const phonetics = data.phonetics || {};
  
  let updated = 0;
  
  for (const [word, phonetic] of Object.entries(BACKUP_PHONETICS)) {
    if (!phonetics[word] || phonetics[word] === '') {
      phonetics[word] = phonetic;
      updated++;
      console.log(`✓ 补充: ${word} -> ${phonetic}`);
    }
  }
  
  // 保存
  const output = {
    generatedAt: new Date().toISOString().split('T')[0],
    totalWords: Object.keys(phonetics).length,
    count: Object.values(phonetics).filter(p => p).length,
    phonetics: Object.fromEntries(
      Object.entries(phonetics).sort(([a], [b]) => a.localeCompare(b))
    )
  };
  
  fs.writeFileSync(PHONETICS_PATH, JSON.stringify(output, null, 2), 'utf-8');
  
  console.log(`\n完成！补充了 ${updated} 个音标`);
  console.log(`当前覆盖率: ${(output.count / output.totalWords * 100).toFixed(1)}%`);
}

applyBackupPhonetics();
