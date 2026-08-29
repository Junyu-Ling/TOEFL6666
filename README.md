# TOEFL6666

托福 / SAT 词汇练习 Web 应用。前端为 Vite SPA，后端 AI 与同步 API 在同源 `/api/*`。

## 本地开发

```bash
cp .env.example .env
# 在 .env 中填写 DEEPSEEK_API_KEY（不要使用 VITE_ 前缀）
npm install
npm run dev
```

浏览器打开 http://localhost:5173/ 。本地 `/api` 由 Vite 插件转发到 [`server/`](server/) 逻辑。

## Cloudflare Workers 部署

前端静态资源与 `/api/*` 部署在**同一个 Worker** 上：

- `https://toefl6666.<账号>.workers.dev/` → 前端
- `https://toefl6666.<账号>.workers.dev/api/...` → 后端

### Dashboard（连接 Git 的 Workers 应用）

| 项 | 值 |
| --- | --- |
| Root directory | 仓库根（留空或 `/`） |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Wrangler config | `wrangler.jsonc` |
| Worker name | `toefl6666` |

### Secrets（Variables and Secrets → Encrypt）

必填：

- `DEEPSEEK_API_KEY`

建议明文变量：

- `DEEPSEEK_MODEL` = `deepseek-v4-flash`
- `DEEPSEEK_API_BASE` = `https://api.deepseek.com/v1`

跨设备同步（强烈建议）：

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

可选（仅当未配置 DeepSeek 时由后端回落，仍不要写进前端）：

- `GEMINI_API_KEY`
- `OPENAI_API_KEY`

CLI：

```bash
npx wrangler secret put DEEPSEEK_API_KEY
npx wrangler secret put UPSTASH_REDIS_REST_URL
npx wrangler secret put UPSTASH_REDIS_REST_TOKEN
```

本地也可 `npm run deploy`（先 build 再 wrangler deploy）。用 Worker 仿真本地 API：复制 `.dev.vars.example` 为 `.dev.vars` 后执行 `npm run cf:dev`。

**不要**把上述 Key 配成 `VITE_*`。Supabase 登录使用的 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 是公开 anon 配置；不要把 service_role 放进仓库。

现有 [`api/`](api/) 与 [`vercel.json`](vercel.json) 仍保留，Vercel 部署可继续工作，直到你完全切到 Cloudflare。
