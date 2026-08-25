/**
 * Google Translate API 客户端
 * 
 * 使用说明：
 * 1. 在 Google Cloud Console 启用 Cloud Translation API
 * 2. 创建 API 密钥或服务账号
 * 3. 设置环境变量 GOOGLE_TRANSLATE_API_KEY
 * 
 * 官方文档: https://cloud.google.com/translate/docs
 */

function createTranslateError(message, status = 500) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * 使用 Google Translate API 翻译文本
 * @param {string} text - 要翻译的文本
 * @param {Object} options - 翻译选项
 * @param {string} options.sourceLang - 源语言代码 (默认: 'en')
 * @param {string} options.targetLang - 目标语言代码 (默认: 'zh-CN')
 * @param {string} options.format - 文本格式 'text' 或 'html' (默认: 'text')
 * @returns {Promise<string>} 翻译后的文本
 */
export async function translateText(text, options = {}) {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  
  if (!apiKey) {
    throw createTranslateError(
      "未配置 Google Translate API Key。请设置环境变量 GOOGLE_TRANSLATE_API_KEY",
      500
    );
  }

  if (!text || typeof text !== "string") {
    throw createTranslateError("翻译文本不能为空", 400);
  }

  const sourceLang = options.sourceLang || "en";
  const targetLang = options.targetLang || "zh-CN";
  const format = options.format || "text";

  // Google Translate API v2 endpoint
  const url = new URL("https://translation.googleapis.com/language/translate/v2");
  url.searchParams.append("key", apiKey);

  const body = {
    q: text,
    source: sourceLang,
    target: targetLang,
    format,
  };

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.error?.message || data.error?.errors?.[0]?.message || "翻译请求失败";
      throw createTranslateError(errorMessage, response.status);
    }

    const translations = data.data?.translations;
    if (!translations || translations.length === 0) {
      throw createTranslateError("未返回翻译结果", 502);
    }

    return translations[0].translatedText;
  } catch (error) {
    if (error.status) throw error;
    throw createTranslateError(`翻译服务异常: ${error.message}`, 503);
  }
}

/**
 * 批量翻译文本
 * @param {string[]} texts - 要翻译的文本数组
 * @param {Object} options - 翻译选项（同 translateText）
 * @returns {Promise<string[]>} 翻译后的文本数组
 */
export async function translateBatch(texts, options = {}) {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  
  if (!apiKey) {
    throw createTranslateError(
      "未配置 Google Translate API Key。请设置环境变量 GOOGLE_TRANSLATE_API_KEY",
      500
    );
  }

  if (!Array.isArray(texts) || texts.length === 0) {
    throw createTranslateError("翻译文本数组不能为空", 400);
  }

  const sourceLang = options.sourceLang || "en";
  const targetLang = options.targetLang || "zh-CN";
  const format = options.format || "text";

  const url = new URL("https://translation.googleapis.com/language/translate/v2");
  url.searchParams.append("key", apiKey);

  const body = {
    q: texts,
    source: sourceLang,
    target: targetLang,
    format,
  };

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.error?.message || data.error?.errors?.[0]?.message || "批量翻译请求失败";
      throw createTranslateError(errorMessage, response.status);
    }

    const translations = data.data?.translations;
    if (!translations || translations.length === 0) {
      throw createTranslateError("未返回翻译结果", 502);
    }

    return translations.map(t => t.translatedText);
  } catch (error) {
    if (error.status) throw error;
    throw createTranslateError(`批量翻译服务异常: ${error.message}`, 503);
  }
}

/**
 * 检测文本语言
 * @param {string} text - 要检测的文本
 * @returns {Promise<Object>} 检测结果 { language: 'en', confidence: 0.95 }
 */
export async function detectLanguage(text) {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  
  if (!apiKey) {
    throw createTranslateError(
      "未配置 Google Translate API Key。请设置环境变量 GOOGLE_TRANSLATE_API_KEY",
      500
    );
  }

  if (!text || typeof text !== "string") {
    throw createTranslateError("检测文本不能为空", 400);
  }

  const url = new URL("https://translation.googleapis.com/language/translate/v2/detect");
  url.searchParams.append("key", apiKey);

  const body = {
    q: text,
  };

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.error?.message || data.error?.errors?.[0]?.message || "语言检测请求失败";
      throw createTranslateError(errorMessage, response.status);
    }

    const detections = data.data?.detections?.[0];
    if (!detections || detections.length === 0) {
      throw createTranslateError("未返回检测结果", 502);
    }

    return {
      language: detections[0].language,
      confidence: detections[0].confidence,
    };
  } catch (error) {
    if (error.status) throw error;
    throw createTranslateError(`语言检测服务异常: ${error.message}`, 503);
  }
}

/**
 * 检查翻译服务是否配置且可用
 * @returns {Promise<boolean>}
 */
export async function isTranslateConfigured() {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) return false;

  try {
    // 简单测试翻译功能
    await translateText("Hello", { targetLang: "zh-CN" });
    return true;
  } catch {
    return false;
  }
}
