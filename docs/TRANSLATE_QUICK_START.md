# Google Translate API 快速开始指南

> 5分钟快速配置，10分钟完成测试

## 🚀 最小化实施方案

如果你想快速体验翻译功能，可以先完成这个最小化方案（不需要完整的后端架构）。

## 第一步：获取 API 密钥（5分钟）

1. 访问 https://console.cloud.google.com/
2. 创建新项目（或选择现有项目）
3. 搜索并启用 "Cloud Translation API"
4. 进入 "API和服务" > "凭据" > "创建凭据" > "API密钥"
5. 复制生成的API密钥

## 第二步：配置环境变量（1分钟）

在项目根目录创建 `.env.local` 文件：

```bash
GOOGLE_TRANSLATE_API_KEY=AIzaSy...你的密钥
```

确保 `.gitignore` 包含 `.env.local`

## 第三步：安装依赖（已完成）

项目使用原生 `fetch`，无需额外依赖。

## 第四步：快速测试（3分钟）

### 测试 1: 直接测试翻译客户端

创建测试文件 `test-translate.js`:

```javascript
import { translateText } from './server/translate-client.js';

async function test() {
  try {
    const result = await translateText('Hello world', {
      sourceLang: 'en',
      targetLang: 'zh-CN'
    });
    console.log('翻译结果:', result);
  } catch (error) {
    console.error('错误:', error.message);
  }
}

test();
```

运行测试：
```bash
node test-translate.js
```

### 测试 2: 在浏览器中测试（开发环境）

修改 `src/components/FlashCard.jsx`，添加一个临时测试按钮：

```jsx
import { translateText } from '../services/translate';

// 在组件中添加
const [testTranslation, setTestTranslation] = useState('');

const handleTestTranslate = async () => {
  try {
    // 临时绕过后端，直接调用 Google API（仅用于测试）
    const apiKey = 'YOUR_API_KEY'; // 测试后删除
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: 'Hello world',
          source: 'en',
          target: 'zh-CN'
        })
      }
    );
    const data = await response.json();
    setTestTranslation(data.data.translations[0].translatedText);
  } catch (error) {
    console.error('测试翻译失败:', error);
  }
};

// 在 JSX 中添加
<button onClick={handleTestTranslate}>测试翻译</button>
{testTranslation && <p>翻译结果: {testTranslation}</p>}
```

⚠️ **重要**: 这只是测试用，生产环境**必须**通过后端调用API！

## 第五步：集成到实际组件（选择一个方案）

### 方案 A: 最简单 - 仅前端测试（不推荐用于生产）

如果只是想快速看到效果，可以临时在前端直接调用：

```jsx
// src/components/FlashCard.jsx
import { useState } from 'react';

function FlashCard({ wordData }) {
  const [translation, setTranslation] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTranslate = async () => {
    setLoading(true);
    try {
      // ⚠️ 仅用于测试！生产环境必须通过后端
      const apiKey = import.meta.env.VITE_GOOGLE_TRANSLATE_KEY;
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
        {
          method: 'POST',
          body: JSON.stringify({
            q: wordData.definitions[0],
            source: 'en',
            target: 'zh-CN'
          })
        }
      );
      const data = await response.json();
      setTranslation(data.data.translations[0].translatedText);
    } catch (error) {
      console.error('翻译失败:', error);
    }
    setLoading(false);
  };

  return (
    <div className="flashcard">
      <h2>{wordData.word}</h2>
      <p>{wordData.definitions[0]}</p>
      
      {translation && (
        <div className="translation">
          {translation}
        </div>
      )}
      
      <button onClick={handleTranslate} disabled={loading}>
        {loading ? '翻译中...' : '🌐 翻译'}
      </button>
    </div>
  );
}
```

### 方案 B: 推荐 - 使用 Vite dev proxy

1. **创建简单的 Express 后端**（`dev-server.js`）:

```javascript
import express from 'express';
import { handleTranslate } from './server/translate-routes-example.js';

const app = express();
app.use(express.json());
app.post('/api/translate', handleTranslate);

app.listen(3001, () => {
  console.log('翻译API服务运行在 http://localhost:3001');
});
```

2. **修改 `vite.config.js`**:

```javascript
export default defineConfig({
  server: {
    proxy: {
      '/api/translate': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
```

3. **运行**:
```bash
# 终端1: 启动翻译服务
node dev-server.js

# 终端2: 启动 Vite
npm run dev
```

4. **在组件中使用**:
```jsx
import { translateText } from '../services/translate';

const handleTranslate = async () => {
  const translation = await translateText(wordData.definitions[0]);
  setTranslation(translation);
};
```

### 方案 C: 生产环境 - Vercel Serverless

创建 `api/translate.js`:

```javascript
import { translateText } from '../server/translate-client.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, sourceLang = 'en', targetLang = 'zh-CN' } = req.body;

  try {
    const translation = await translateText(text, { sourceLang, targetLang });
    res.json({ translated: translation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

部署到 Vercel，环境变量在 Vercel 控制台配置。

## 📊 预期结果

完成后，你应该能够：

1. ✅ 点击"翻译"按钮
2. ✅ 1-2秒后看到中文翻译
3. ✅ 再次翻译同一内容时，几乎即时显示（缓存）

## 🎨 基础样式

添加到 `App.css`:

```css
.translation {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: linear-gradient(135deg, #f0f9ff 0%, #f8fbff 100%);
  border-left: 3px solid #3b82f6;
  border-radius: 0.5rem;
  color: #475569;
  font-size: 0.9rem;
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

## ⚠️ 重要提醒

1. **API 密钥安全**: 
   - ❌ 不要在前端代码中硬编码API密钥
   - ❌ 不要提交API密钥到Git
   - ✅ 生产环境必须通过后端代理

2. **计费**:
   - 启用API需要绑定支付方式
   - 建议设置预算提醒（$5/月）
   - 实际使用成本很低（< $1/月）

3. **缓存**:
   - 确保缓存正常工作
   - 查看浏览器 LocalStorage 确认缓存生效

## 🐛 故障排查

### 问题：`API key not valid`
**解决**: 检查环境变量是否正确配置，API密钥是否正确复制

### 问题：`Billing not enabled`
**解决**: 在 Google Cloud Console 启用计费并绑定支付方式

### 问题：`CORS error`
**解决**: 不要在前端直接调用Google API，必须通过后端

## 📚 下一步

快速测试成功后，建议：

1. 阅读 [完整配置指南](./GOOGLE_TRANSLATE_SETUP.md)
2. 按照 [集成清单](./TRANSLATE_INTEGRATION_CHECKLIST.md) 完成生产环境部署
3. 实施缓存和优化策略

## 💬 需要帮助？

如果遇到问题：

1. 检查 [故障排查文档](./GOOGLE_TRANSLATE_SETUP.md#故障排查)
2. 查看 [Google Cloud Translation 文档](https://cloud.google.com/translate/docs)
3. 检查浏览器控制台的错误信息

---

**预计时间**: 10-15 分钟
**难度**: ⭐⭐☆☆☆ (简单)
