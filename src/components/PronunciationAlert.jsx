// 提取音标（IPA格式，在 /.../ 之间）
function extractIPA(message) {
  if (!message) return null;
  const match = message.match(/\/([^/]+)\//);
  return match ? match[1] : null;
}

export default function PronunciationAlert({ alert, className = "" }) {
  if (!alert?.message) return null;

  const ipa = extractIPA(alert.message);
  
  // 如果能提取到音标，优先显示音标
  if (ipa) {
    return (
      <p className={`pronunciation-alert pronunciation-alert--ipa ${className}`.trim()} role="note">
        <span className="pronunciation-alert__ipa">/{ipa}/</span>
      </p>
    );
  }

  // 否则显示完整提示（但不带"读音提示："标签）
  return (
    <p className={`pronunciation-alert ${className}`.trim()} role="note">
      <span className="pronunciation-alert__icon" aria-hidden>
        🔊
      </span>
      <span className="pronunciation-alert__text">{alert.message}</span>
    </p>
  );
}
