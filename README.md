# TOEFL6666

托福 / SAT 词汇练习 Web 应用。前端为 Vite SPA，后端 AI 与同步 API 在同源 `/api/*`。

## 本地开发

```bash
cp .env.example .env
# 在 .env 中填写 DEEPSEEK_API_KEY（不要使用 VITE_ 前缀）
npm install
npm run dev
```

浏览器打开 http://localhost:5175/ 。本地 `/api` 由 Vite 插件转发到 [`server/`](server/) 逻辑。

## Vercel 部署

连接 GitHub 仓库后用 Vercel 部署。根目录就是仓库根：

| 项 | 值 |
| --- | --- |
| Framework | Vite（可自动识别） |
| Build command | `npm run build` |
| Output directory | `dist` |
| API | [`api/`](api/) + [`vercel.json`](vercel.json) |

生产环境访问：

- `https://<项目>.vercel.app/` → 前端
- `https://<项目>.vercel.app/api/...` → 后端（全部 `/api` 打进同一个 Serverless Function，以适配 Hobby 的 12 个函数上限）

### Environment Variables

必填：

- `DEEPSEEK_API_KEY`

建议：

- `DEEPSEEK_MODEL` = `deepseek-v4-flash`
- `DEEPSEEK_API_BASE` = `https://api.deepseek.com/v1`

跨设备同步（强烈建议）：

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

可选（仅当未配置 DeepSeek 时由后端回落，仍不要写进前端）：

- `GEMINI_API_KEY`
- `OPENAI_API_KEY`

可选（本人声音克隆，仅用于站内读单词，不提供下载/导出）：

- `MINIMAX_API_KEY`
- `MINIMAX_GROUP_ID`（若控制台要求）

**不要**把上述 Key 配成 `VITE_*`。Supabase 登录使用的 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 是公开 anon 配置；不要把 service_role 放进仓库。

### 阅读填词权限

阅读填词默认不对所有人开放。用户登录后会出现在管理员列表里，管理员可在设置中开通。

在 Vercel / `.env` 中把管理员写进下面任一变量（逗号分隔）：

- `ACCESS_ADMIN_EMAILS`
- `ACCESS_ADMIN_USER_IDS`
- `ACCESS_ADMIN_PHONES`

开通记录保存在 Redis（与跨设备同步同一套 Upstash）。

登录方式：邮箱验证码、手机短信、Google、GitHub。微信 / QQ / ChatGPT 入口已放在登录页；微信和 QQ 需在对应开放平台创建应用并接到 Supabase 后才能真正跳转，ChatGPT 账号目前没有网站第三方登录。
