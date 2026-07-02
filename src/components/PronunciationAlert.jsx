export default function PronunciationAlert({ alert, className = "" }) {
  if (!alert?.message) return null;

  return (
    <p className={`pronunciation-alert ${className}`.trim()} role="note">
      <span className="pronunciation-alert__icon" aria-hidden>
        🔊
      </span>
      <span className="pronunciation-alert__label">读音提示：</span>
      <span className="pronunciation-alert__text">{alert.message}</span>
    </p>
  );
}
