/**
 * 翻译 API 路由示例
 * 
 * 这是一个示例文件，展示如何在 Express 中集成翻译服务
 * 
 * 使用方式：
 * 1. 如果你有 Express 后端，可以参考这个文件添加路由
 * 2. 如果使用 Vite dev server，可以通过 Vite 插件代理到这些API
 * 3. 也可以使用 Vercel/Netlify Serverless Functions
 */

import { translate, translateMultiple, getCacheStats } from "./translate-service.js";
import { isTranslateConfigured } from "./translate-client.js";

/**
 * 如果使用 Express:
 * 
 * import express from 'express';
 * const app = express();
 * app.use(express.json());
 * 
 * // 添加以下路由
 * app.post('/api/translate', handleTranslate);
 * app.post('/api/translate/batch', handleTranslateBatch);
 * app.get('/api/translate/status', handleTranslateStatus);
 */

/**
 * 单个翻译 API
 * POST /api/translate
 * Body: { text: string, sourceLang?: string, targetLang?: string }
 */
export async function handleTranslate(req, res) {
  try {
    const { text, sourceLang = "en", targetLang = "zh-CN" } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({
        error: "参数错误",
        message: "text 参数不能为空",
      });
    }

    const result = await translate(text, { sourceLang, targetLang });

    res.json({
      success: true,
      original: result.original,
      translated: result.translated,
      cached: result.cached,
    });
  } catch (error) {
    console.error("[Translate API] Error:", error);
    res.status(error.status || 500).json({
      success: false,
      error: error.message || "翻译失败",
    });
  }
}

/**
 * 批量翻译 API
 * POST /api/translate/batch
 * Body: { texts: string[], sourceLang?: string, targetLang?: string }
 */
export async function handleTranslateBatch(req, res) {
  try {
    const { texts, sourceLang = "en", targetLang = "zh-CN" } = req.body;

    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({
        error: "参数错误",
        message: "texts 必须是非空数组",
      });
    }

    if (texts.length > 100) {
      return res.status(400).json({
        error: "参数错误",
        message: "单次最多翻译100条文本",
      });
    }

    const results = await translateMultiple(texts, { sourceLang, targetLang });

    res.json({
      success: true,
      count: results.length,
      translations: results.map(r => r.translated),
      cached: results.filter(r => r.cached).length,
    });
  } catch (error) {
    console.error("[Translate Batch API] Error:", error);
    res.status(error.status || 500).json({
      success: false,
      error: error.message || "批量翻译失败",
    });
  }
}

/**
 * 翻译服务状态 API
 * GET /api/translate/status
 */
export async function handleTranslateStatus(req, res) {
  try {
    const available = await isTranslateConfigured();
    const cacheStats = getCacheStats();

    res.json({
      available,
      cacheSize: cacheStats.size,
      cacheMaxSize: cacheStats.maxSize,
    });
  } catch (error) {
    console.error("[Translate Status API] Error:", error);
    res.json({
      available: false,
      error: error.message,
    });
  }
}

/**
 * Vite 开发服务器中间件示例
 * 
 * 在 vite.config.js 中添加:
 * 
 * export default defineConfig({
 *   server: {
 *     proxy: {
 *       '/api/translate': {
 *         target: 'http://localhost:3001',
 *         changeOrigin: true
 *       }
 *     }
 *   }
 * })
 * 
 * 然后创建一个简单的 Express 服务器监听 3001 端口
 */

/**
 * Vercel Serverless Function 示例
 * 
 * 创建文件: api/translate.js
 * 
 * import { translate } from '../server/translate-service.js';
 * 
 * export default async function handler(req, res) {
 *   if (req.method !== 'POST') {
 *     return res.status(405).json({ error: 'Method not allowed' });
 *   }
 *   
 *   const { text, sourceLang = 'en', targetLang = 'zh-CN' } = req.body;
 *   const result = await translate(text, { sourceLang, targetLang });
 *   
 *   res.json(result);
 * }
 */

/**
 * 速率限制中间件（可选）
 */
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15分钟
const RATE_LIMIT_MAX = 100; // 最多100次请求

export function translateRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return next();
  }

  const record = rateLimitMap.get(ip);
  
  if (now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return next();
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({
      error: "请求过于频繁",
      message: "翻译请求超过速率限制，请稍后再试",
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
    });
  }

  record.count++;
  next();
}

// 定期清理过期的速率限制记录
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 60 * 1000); // 每分钟清理一次
