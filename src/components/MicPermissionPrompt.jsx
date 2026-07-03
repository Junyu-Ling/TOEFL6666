export default function MicPermissionPrompt({ mic, onDismiss }) {
  if (mic.isGranted || mic.isUnsupported) return null;
  if (mic.status === "idle" && localStorage.getItem("toefl666_mic_prompt_dismissed") === "1") {
    return null;
  }

  function handleDismiss() {
    localStorage.setItem("toefl666_mic_prompt_dismissed", "1");
    onDismiss?.();
  }

  return (
    <div className="mic-prompt">
      <div className="mic-prompt__content">
        <div className="mic-prompt__icon" aria-hidden>
          🎙️
        </div>
        <div>
          <strong>开启麦克风，体验语音学习</strong>
          <p>授权后可直接语音输入释义；开启「练习读音」后，会按音节与重音严格批改跟读。</p>
        </div>
      </div>
      <div className="mic-prompt__actions">
        {mic.isDenied ? (
          <span className="mic-prompt__hint">请在浏览器地址栏允许麦克风权限后刷新页面</span>
        ) : (
          <button type="button" className="btn btn--primary" onClick={mic.request} disabled={mic.isRequesting}>
            {mic.isRequesting ? "请求中…" : "允许麦克风"}
          </button>
        )}
        <button type="button" className="btn btn--ghost" onClick={handleDismiss}>
          稍后再说
        </button>
      </div>
    </div>
  );
}
