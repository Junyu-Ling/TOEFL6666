/**
 * 翻译按钮组件示例
 * 
 * 这是一个示例组件，展示如何在单词卡片中集成翻译功能
 * 可以根据实际需求修改和集成到你的 FlashCard.jsx 中
 */

import { useState, useCallback } from "react";
import { translateText } from "../services/translate";

/**
 * 示例1: 简单的翻译按钮
 */
export function SimpleTranslateButton({ text, onTranslated }) {
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState(null);

  const handleTranslate = useCallback(async () => {
    if (!text) return;

    setTranslating(true);
    setError(null);

    try {
      const translation = await translateText(text, {
        sourceLang: "en",
        targetLang: "zh-CN",
      });
      onTranslated?.(translation);
    } catch (err) {
      console.error("翻译失败:", err);
      setError(err.message || "翻译失败");
    } finally {
      setTranslating(false);
    }
  }, [text, onTranslated]);

  return (
    <div className="translate-button-container">
      <button
        type="button"
        className="translate-btn"
        onClick={handleTranslate}
        disabled={translating || !text}
        aria-label="翻译"
      >
        🌐 {translating ? "翻译中..." : "翻译"}
      </button>
      {error && <p className="translate-error">{error}</p>}
    </div>
  );
}

/**
 * 示例2: 带翻译结果显示的组件
 */
export function TranslateWithResult({ text, label = "翻译" }) {
  const [translation, setTranslation] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);

  const handleTranslate = useCallback(async () => {
    if (!text) return;

    // 如果已有翻译，只是切换显示
    if (translation) {
      setShowTranslation(!showTranslation);
      return;
    }

    setTranslating(true);
    setError(null);

    try {
      const result = await translateText(text, {
        sourceLang: "en",
        targetLang: "zh-CN",
      });
      setTranslation(result);
      setShowTranslation(true);
    } catch (err) {
      console.error("翻译失败:", err);
      setError(err.message || "翻译失败");
    } finally {
      setTranslating(false);
    }
  }, [text, translation, showTranslation]);

  return (
    <div className="translate-section">
      <button
        type="button"
        className="translate-btn"
        onClick={handleTranslate}
        disabled={translating || !text}
      >
        🌐 {translating ? "翻译中..." : translation ? (showTranslation ? "隐藏翻译" : "显示翻译") : label}
      </button>

      {error && (
        <div className="translate-error" role="alert">
          ⚠️ {error}
        </div>
      )}

      {showTranslation && translation && (
        <div className="translate-result">
          <p className="translate-result__text">{translation}</p>
        </div>
      )}
    </div>
  );
}

/**
 * 示例3: 集成到单词卡片中
 */
export function WordCardWithTranslation({ word, definition, example }) {
  const [definitionTranslation, setDefinitionTranslation] = useState(null);
  const [exampleTranslation, setExampleTranslation] = useState(null);

  return (
    <div className="word-card">
      <h2 className="word-card__word">{word}</h2>

      <div className="word-card__section">
        <h3 className="word-card__label">Definition</h3>
        <p className="word-card__text">{definition}</p>
        {definitionTranslation && (
          <p className="word-card__translation">{definitionTranslation}</p>
        )}
        <TranslateButton
          text={definition}
          onTranslated={setDefinitionTranslation}
        />
      </div>

      {example && (
        <div className="word-card__section">
          <h3 className="word-card__label">Example</h3>
          <p className="word-card__text">{example}</p>
          {exampleTranslation && (
            <p className="word-card__translation">{exampleTranslation}</p>
          )}
          <TranslateButton
            text={example}
            onTranslated={setExampleTranslation}
          />
        </div>
      )}
    </div>
  );
}

/**
 * 示例4: 在现有 FlashCard 组件中集成
 * 
 * 在 FlashCard.jsx 中添加:
 */
/*
import { useState } from 'react';
import { translateText } from '../services/translate';

function FlashCard({ wordData }) {
  const [translation, setTranslation] = useState(null);
  const [translating, setTranslating] = useState(false);

  const handleTranslate = async () => {
    if (translation) {
      setTranslation(null); // 切换显示/隐藏
      return;
    }

    setTranslating(true);
    try {
      const definition = wordData.definitions[0];
      const result = await translateText(definition);
      setTranslation(result);
    } catch (error) {
      console.error('翻译失败:', error);
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="flashcard">
      <h2 className="flashcard__word">{wordData.word}</h2>
      
      <div className="flashcard__definition">
        {wordData.definitions[0]}
      </div>

      {translation && (
        <div className="flashcard__translation">
          {translation}
        </div>
      )}

      <div className="flashcard__actions">
        <button
          className="flashcard__translate-btn"
          onClick={handleTranslate}
          disabled={translating}
        >
          🌐 {translating ? '翻译中...' : translation ? '隐藏翻译' : '翻译'}
        </button>
      </div>
    </div>
  );
}
*/

/**
 * CSS 样式示例
 * 
 * 添加到 App.css:
 */
/*
.translate-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--surface);
  color: var(--text);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.translate-btn:hover:not(:disabled) {
  background: var(--surface-hover);
  border-color: var(--accent);
}

.translate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.translate-result {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: var(--surface-secondary);
  border-left: 3px solid var(--accent);
  border-radius: 0.5rem;
  animation: slideDown 0.3s ease;
}

.translate-result__text {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
}

.translate-error {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: var(--error-bg, #fee);
  color: var(--error-text, #c33);
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.flashcard__translation {
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, var(--accent-bg, #f0f9ff) 0%, var(--accent-bg-light, #f8fbff) 100%);
  border-left: 3px solid var(--accent);
  border-radius: 0.625rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.word-card__translation {
  margin-top: 0.5rem;
  font-style: italic;
  color: var(--text-tertiary);
  font-size: 0.875rem;
}
*/

/**
 * 设置面板集成示例
 * 
 * 在 SettingsPanel.jsx 中添加翻译设置:
 */
/*
<details className="settings-group">
  <summary className="settings-group__summary">
    <span className="settings-group__title">翻译设置</span>
  </summary>
  <div className="settings-group__body">
    <label className="settings-field">
      <span>启用翻译功能</span>
      <input
        type="checkbox"
        checked={settings.enableTranslation}
        onChange={(e) => setEnableTranslation(e.target.checked)}
      />
    </label>
    
    <label className="settings-field">
      <span>自动显示翻译</span>
      <input
        type="checkbox"
        checked={settings.autoShowTranslation}
        onChange={(e) => setAutoShowTranslation(e.target.checked)}
        disabled={!settings.enableTranslation}
      />
    </label>

    <p className="settings-hint">
      翻译功能使用 Google Translate API 提供准确的中文翻译
    </p>
  </div>
</details>
*/
