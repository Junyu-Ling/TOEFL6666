import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PHONETICS_PATH = path.join(__dirname, '../src/data/phonetics.json');
const DELAY_MS = 100; // API请求延迟，避免限流

// 读取现有音标数据
const phoneticsData = JSON.parse(fs.readFileSync(PHONETICS_PATH, 'utf-8'));
const phonetics = phoneticsData.phonetics || {};

// 收集所有需要音标的单词
const wordsNeedingPhonetics = Object.keys(phonetics).filter(word => !phonetics[word]);

console.log(`总单词数: ${Object.keys(phonetics).length}`);
console.log(`缺少音标的单词数: ${wordsNeedingPhonetics.length}`);

// 从 Free Dictionary API 获取音标
async function fetchPhonetic(word) {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }
    
    // 尝试获取美式发音
    for (const entry of data) {
      if (entry.phonetics && Array.isArray(entry.phonetics)) {
        // 优先美式发音
        const usPhonetic = entry.phonetics.find(p => 
          p.text && (p.audio?.includes('-us') || p.audio?.includes('/us/'))
        );
        if (usPhonetic?.text) {
          return normalizePhonetic(usPhonetic.text);
        }
        
        // 其次任何有text的phonetic
        const anyPhonetic = entry.phonetics.find(p => p.text);
        if (anyPhonetic?.text) {
          return normalizePhonetic(anyPhonetic.text);
        }
      }
      
      // 尝试从phonetic字段获取
      if (entry.phonetic) {
        return normalizePhonetic(entry.phonetic);
      }
    }
    
    return null;
  } catch (error) {
    console.error(`获取 ${word} 失败:`, error.message);
    return null;
  }
}

// 标准化音标格式：确保用斜杠包裹
function normalizePhonetic(text) {
  if (!text) return '';
  text = text.trim();
  if (text.startsWith('/') && text.endsWith('/')) {
    return text;
  }
  if (text.startsWith('[') && text.endsWith(']')) {
    return '/' + text.slice(1, -1) + '/';
  }
  return '/' + text + '/';
}

// 延迟函数
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// 批量获取音标
async function fetchAllPhonetics() {
  let updated = 0;
  let failed = 0;
  
  for (let i = 0; i < wordsNeedingPhonetics.length; i++) {
    const word = wordsNeedingPhonetics[i];
    
    console.log(`[${i + 1}/${wordsNeedingPhonetics.length}] 处理: ${word}`);
    
    const phonetic = await fetchPhonetic(word);
    
    if (phonetic) {
      phonetics[word] = phonetic;
      updated++;
      console.log(`  ✓ ${word}: ${phonetic}`);
    } else {
      failed++;
      console.log(`  ✗ ${word}: 未找到音标`);
    }
    
    // 保存进度（每50个单词保存一次）
    if ((i + 1) % 50 === 0) {
      savePhonetics();
      console.log(`\n已保存进度：${updated} 个新增，${failed} 个失败\n`);
    }
    
    // API延迟
    if (i < wordsNeedingPhonetics.length - 1) {
      await delay(DELAY_MS);
    }
  }
  
  // 最终保存
  savePhonetics();
  
  console.log('\n完成！');
  console.log(`成功获取: ${updated} 个`);
  console.log(`失败: ${failed} 个`);
  console.log(`总覆盖率: ${((Object.keys(phonetics).length - failed) / Object.keys(phonetics).length * 100).toFixed(1)}%`);
}

// 保存音标数据
function savePhonetics() {
  const output = {
    generatedAt: new Date().toISOString().split('T')[0],
    totalWords: Object.keys(phonetics).length,
    count: Object.values(phonetics).filter(p => p).length,
    phonetics: Object.fromEntries(
      Object.entries(phonetics).sort(([a], [b]) => a.localeCompare(b))
    )
  };
  
  fs.writeFileSync(PHONETICS_PATH, JSON.stringify(output, null, 2), 'utf-8');
}

// 运行
fetchAllPhonetics().catch(console.error);
