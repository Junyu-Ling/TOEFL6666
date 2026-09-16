# TOEFL6666

托福 / SAT 词汇练习 Web 应用。前端为 Vite SPA，后端 AI 与同步 API 在同源 `/api/*`。

## 本地开发

```bash
cp .env.example .env
# 在 .env 中填写 GROQ_API_KEY（不要使用 VITE_ 前缀）
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
- `https://<项目>.vercel.app/api/...` → 后端（全部 `/api` 打进 `api/index.js` 这一个 Function）

### Environment Variables

必填：

- `GROQ_API_KEY`

建议：

- `GROQ_MODEL` = `openai/gpt-oss-120b`
- `GROQ_API_BASE` = `https://api.groq.com/openai/v1`

未配置 Groq 时的可选回落：

- `DEEPSEEK_API_KEY`
- `DEEPSEEK_MODEL` = `deepseek-v4-flash`
- `DEEPSEEK_API_BASE` = `https://api.deepseek.com/v1`

跨设备同步（强烈建议）：

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

可选回落（仍不要写进前端）：

- `GEMINI_API_KEY`
- `OPENAI_API_KEY`

可选（本人声音克隆，仅用于站内读单词，不提供下载/导出）：

- `MINIMAX_API_KEY`
- `MINIMAX_GROUP_ID`（若控制台要求）

**不要**把上述 Key 配成 `VITE_*`。Supabase 登录使用的 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 是公开 anon 配置；不要把 service_role 放进仓库。

### 阅读填词权限

阅读填词默认不对所有人开放。未开通时导航栏不显示该入口；题目只通过登录后的接口下发，不会打进前端静态包。

`jy.ling.cc@gmail.com` 已写死为管理员：用这个 Gmail（Google 登录，或 GitHub 账号绑定了该邮箱）登录后，阅读填词全开，设置里能看到所有注册用户并为他们开通。其他人必须由该管理员开通后才能用。

仓库保持公开以便 Vercel 部署。题目明文不进 Git，只提交 `server/data/readingFillBlank.json.enc`。线上用已有的 `GITHUB_CLIENT_SECRET`（或 `READING_FILL_SECRET` / `AUTH_SECRET`）解密。本地改题后运行 `npm run encrypt:reading-fill`。

GitHub 登录**不需要 Supabase**。点右上角登录后，练习进度按账号存在 Redis。设置里可绑定手机号/邮箱，之后任意已绑定方式都进同一账号。

在 GitHub OAuth App 里把 Callback URL 设为：

- 本地：`http://localhost:5175/api/auth/github/callback`
- 线上：`https://<你的域名>/api/auth/github/callback`

要用 Gmail 直接登录时，再配 Google OAuth，Callback URL 为：

- 本地：`http://localhost:5175/api/auth/google/callback`
- 线上：`https://<你的域名>/api/auth/google/callback`

环境变量：

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`（只放 Vercel / `.env`，不要提交仓库）
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`（可选，用于 Google 登录）

管理员写进下面任一变量（逗号分隔；`jy.ling.cc@gmail.com` 即使不配也生效）：

- `ACCESS_ADMIN_EMAILS`
- `ACCESS_ADMIN_USER_IDS`（GitHub 用户为 `gh_` + 数字 ID）
- `ACCESS_ADMIN_PHONES`

开通记录保存在 Redis。
