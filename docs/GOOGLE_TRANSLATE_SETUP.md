# Google Translate API 接入指南

## 📌 概述

本指南将帮助你在 TOEFL6666 应用中集成 Google Cloud Translation API，提供准确的翻译服务。

## 🎯 功能特性

- ✅ 单词释义翻译（英文 → 中文）
- ✅ 批量翻译优化
- ✅ 多层缓存机制（内存 + LocalStorage）
- ✅ 自动请求合并
- ✅ 成本控制

## 💰 成本说明

### Google Cloud Translation API 定价

- **Basic (v2)**: $20 / 百万字符
- **免费额度**: 每月 $0（需付费启用）

### 实际成本估算

假设你的应用场景：
- 总词库: 7,511 个单词（托福5494 + SAT2017）
- 每个单词平均释义: 50 字符
- 总字符数: ~375,000 字符

**一次性翻译全部词库成本**: 约 $0.0075 (不到1美分)

**用户日常使用成本**:
- 每用户每天翻译 50 个单词
- 每月成本: $0.03 / 用户
- 有本地缓存，实际成本更低

## 📋 接入步骤

### 第一步：创建 Google Cloud 项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 记录项目ID

### 第二步：启用 Cloud Translation API

1. 在 Google Cloud Console 中，进入 **"API 和服务" > "库"**
2. 搜索 **"Cloud Translation API"**
3. 点击启用

### 第三步：创建 API 密钥

#### 方法一：使用 API 密钥（推荐用于开发）

1. 进入 **"API 和服务" > "凭据"**
2. 点击 **"创建凭据" > "API 密钥"**
3. 复制生成的 API 密钥
4. （可选）点击 **"限制密钥"**，添加以下限制：
   - **API 限制**: 选择 "Cloud Translation API"
   - **应用程序限制**: 根据需要选择（HTTP引用网址、IP地址等）

#### 方法二：使用服务账号（推荐用于生产）

1. 进入 **"API 和服务" > "凭据"**
2. 点击 **"创建凭据" > "服务账号"**
3. 填写服务账号详情
4. 授予 **"Cloud Translation API 用户"** 角色
5. 创建密钥（JSON格式）
6. 下载密钥文件

### 第四步：配置环境变量

#### 使用 API 密钥

在项目根目录创建 `.env.local` 文件（如果还没有）：

```bash
# Google Translate API 密钥
GOOGLE_TRANSLATE_API_KEY=your-api-key-here
```

#### 使用服务账号

```bash
# Google Translate 服务账号 JSON 路径
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

**重要**: 确保 `.env.local` 和 `service-account-key.json` 已添加到 `.gitignore`

### 第五步：启用计费

⚠️ **重要**: Google Cloud Translation API 需要启用计费才能使用（即使在免费配额内）

1. 进入 **"结算"**
2. 关联或创建结算账号
3. 添加付款方式

不用担心费用，有以下保护措施：
- 可以设置预算提醒
- 使用缓存大幅降低API调用次数
- 实际成本极低

### 第六步：设置预算提醒（推荐）

1. 进入 **"结算" > "预算和提醒"**
2. 创建预算
3. 设置金额（例如 $5/月）
4. 配置提醒阈值（50%, 90%, 100%）

## 🚀 使用方式

### 后端使用

```javascript
// server/your-service.js
import { translateText, translateBatch } from './translate-client.js';
import { translate, translateDefinition } from './translate-service.js';

// 单个翻译（带缓存）
const result = await translate("Hello world", {
  sourceLang: "en",
  targetLang: "zh-CN"
});
console.log(result.translated); // "你好世界"

// 批量翻译
const results = await translateBatch(
  ["Hello", "World", "Welcome"],
  { sourceLang: "en", targetLang: "zh-CN" }
);
console.log(results); // ["你好", "世界", "欢迎"]

// 翻译单词定义
const wordResult = await translateDefinition(
  "abandon",
  "to leave someone or something"
);
console.log(wordResult.translatedDefinition); // "离开某人或某物"
```

### 前端使用

```javascript
// src/components/YourComponent.jsx
import { translateText, translateBatch } from '../services/translate';

function WordCard({ word, definition }) {
  const [translation, setTranslation] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleTranslate() {
    setLoading(true);
    try {
      const result = await translateText(definition);
      setTranslation(result);
    } catch (error) {
      console.error('翻译失败:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>{word}</h2>
      <p>{definition}</p>
      {translation && <p className="translation">{translation}</p>}
      <button onClick={handleTranslate} disabled={loading}>
        {loading ? '翻译中...' : '翻译'}
      </button>
    </div>
  );
}
```

## 🎨 UI 集成建议

### 1. 在单词卡片中添加翻译按钮

```jsx
<div className="flashcard__actions">
  <button 
    className="flashcard__translate-btn"
    onClick={handleTranslate}
    disabled={translating}
  >
    🌐 {translating ? '翻译中...' : '翻译'}
  </button>
</div>
```

### 2. 显示翻译结果

```css
.flashcard__translation {
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--surface-secondary);
  border-left: 3px solid var(--accent);
  border-radius: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
}
```

### 3. 设置面板中的翻译开关

```jsx
<label className="settings-field">
  <span>启用翻译功能</span>
  <input
    type="checkbox"
    checked={settings.enableTranslation}
    onChange={(e) => setEnableTranslation(e.target.checked)}
  />
</label>
```

## ⚡ 性能优化

### 1. 多层缓存策略

- **内存缓存**: 后端 Map（10,000条）
- **LocalStorage缓存**: 前端持久化（30天过期）
- 缓存命中率预计 > 95%

### 2. 批量翻译优化

- 自动合并请求
- 每批最多100个文本
- 减少网络往返

### 3. 预翻译策略（可选）

在构建时预翻译所有单词定义：

```javascript
// scripts/pre-translate-words.mjs
import { translateBatch } from '../server/translate-client.js';
import fs from 'fs';

async function preTranslateWordBank() {
  const wordBank = JSON.parse(fs.readFileSync('./src/data/word-bank.json', 'utf8'));
  const definitions = wordBank.map(w => w.definition);
  
  const translations = await translateBatch(definitions);
  
  const enriched = wordBank.map((word, i) => ({
    ...word,
    translatedDefinition: translations[i]
  }));
  
  fs.writeFileSync(
    './src/data/word-bank-translated.json',
    JSON.stringify(enriched, null, 2)
  );
}
```

## 🔒 安全最佳实践

### 1. API 密钥保护

✅ **正确做法**:
- 将 API 密钥存储在环境变量中
- 不要提交到 Git
- 在后端调用 API，前端不直接暴露密钥

❌ **错误做法**:
- 硬编码在代码中
- 提交到公开仓库
- 前端直接调用 Google API

### 2. API 密钥限制

在 Google Cloud Console 中限制 API 密钥：
- **API 限制**: 仅限 Cloud Translation API
- **HTTP 引用网址**: 限制为你的域名
- **IP 限制**: 限制为服务器 IP（如果是固定IP）

### 3. 速率限制

在后端添加速率限制：

```javascript
// server/translate-middleware.js
import rateLimit from 'express-rate-limit';

export const translateRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 最多100次请求
  message: '翻译请求过于频繁，请稍后再试'
});
```

## 📊 监控和调试

### 1. 查看 API 使用情况

在 Google Cloud Console 中：
1. 进入 **"API 和服务" > "信息中心"**
2. 选择 Cloud Translation API
3. 查看请求次数、错误率、延迟等指标

### 2. 启用日志

```javascript
// server/translate-client.js
export async function translateText(text, options = {}) {
  console.log('[Translate] Request:', { text, options });
  const result = await actualTranslate(text, options);
  console.log('[Translate] Response:', result);
  return result;
}
```

### 3. 错误处理

```javascript
try {
  const translation = await translateText(text);
} catch (error) {
  if (error.status === 403) {
    console.error('API 密钥无效或权限不足');
  } else if (error.status === 429) {
    console.error('超过配额限制');
  } else {
    console.error('翻译失败:', error.message);
  }
}
```

## 🔧 故障排查

### 问题1: "API key not valid"

**原因**: API 密钥无效或未启用 Translation API

**解决**:
1. 检查环境变量 `GOOGLE_TRANSLATE_API_KEY` 是否正确
2. 确认已启用 Cloud Translation API
3. 检查 API 密钥限制设置

### 问题2: "The billing account for the owning project is disabled"

**原因**: 未启用计费或计费账号被禁用

**解决**:
1. 进入 Google Cloud Console 的"结算"页面
2. 启用计费并添加付款方式

### 问题3: "Quota exceeded"

**原因**: 超过每月免费配额或速率限制

**解决**:
1. 检查 Google Cloud Console 中的配额使用情况
2. 优化缓存策略
3. 考虑升级配额

### 问题4: CORS 错误（前端直接调用）

**原因**: 不应该在前端直接调用 Google API

**解决**:
通过后端代理调用，前端只调用自己的后端API

## 📝 TODO List

接入完成后的待办事项：

- [ ] 配置 Google Cloud 项目
- [ ] 创建并限制 API 密钥
- [ ] 设置环境变量
- [ ] 启用计费
- [ ] 设置预算提醒
- [ ] 测试翻译功能
- [ ] 在 UI 中添加翻译按钮
- [ ] 配置缓存策略
- [ ] 监控 API 使用情况
- [ ] 部署到生产环境

## 📚 参考资源

- [Google Cloud Translation API 文档](https://cloud.google.com/translate/docs)
- [API 定价](https://cloud.google.com/translate/pricing)
- [快速入门指南](https://cloud.google.com/translate/docs/setup)
- [最佳实践](https://cloud.google.com/translate/docs/best-practices)

## ❓ 常见问题

**Q: 是否支持离线翻译？**
A: 不支持。Google Translate API 需要网络连接。但有本地缓存，已翻译的内容无需重复请求。

**Q: 翻译质量如何？**
A: Google Translate 是目前最好的机器翻译服务之一，对于单词释义这类简短文本，准确率很高。

**Q: 可以切换其他翻译服务吗？**
A: 可以。代码结构支持切换到其他翻译API（如 DeepL、百度翻译等），只需修改 `translate-client.js`。

**Q: 成本会不会失控？**
A: 不会。有多层缓存保护，设置了预算提醒，实际使用成本极低。
