import { useCallback, useEffect, useRef, useState } from "react";
import { sendOtp, verifyOtp } from "../services/auth";

const RESEND_SECONDS = 60;

export default function LoginModal({ onClose }) {
  const [step, setStep] = useState("phone"); // "phone" | "otp"
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const phoneRef = useRef(null);
  const otpRef = useRef(null);

  useEffect(() => {
    if (step === "phone") phoneRef.current?.focus();
    else otpRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const id = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [countdown]);

  const handleSendOtp = useCallback(async () => {
    const trimmed = phone.trim();
    if (!trimmed) { setError("请输入手机号"); return; }
    setError("");
    setLoading(true);
    try {
      await sendOtp(trimmed);
      setStep("otp");
      setCountdown(RESEND_SECONDS);
    } catch (e) {
      setError(e.message || "发送失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [phone]);

  const handleVerify = useCallback(async () => {
    const trimmed = otp.trim();
    if (!trimmed) { setError("请输入验证码"); return; }
    setError("");
    setLoading(true);
    try {
      await verifyOtp(phone.trim(), trimmed);
      onClose?.();
    } catch (e) {
      setError(e.message || "验证码错误，请重试");
    } finally {
      setLoading(false);
    }
  }, [otp, phone, onClose]);

  const handleResend = useCallback(async () => {
    if (countdown > 0) return;
    setError("");
    setLoading(true);
    try {
      await sendOtp(phone.trim());
      setCountdown(RESEND_SECONDS);
    } catch (e) {
      setError(e.message || "发送失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [countdown, phone]);

  function handlePhoneKey(e) {
    if (e.key === "Enter") handleSendOtp();
  }
  function handleOtpKey(e) {
    if (e.key === "Enter") handleVerify();
  }

  return (
    <div className="login-modal__overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="login-modal" role="dialog" aria-modal="true" aria-label="登录">
        <div className="login-modal__header">
          <h2 className="login-modal__title">登录 / 注册</h2>
          <button type="button" className="login-modal__close" onClick={onClose} aria-label="关闭">✕</button>
        </div>

        {step === "phone" ? (
          <div className="login-modal__body">
            <p className="login-modal__hint">输入手机号，我们将发送短信验证码</p>
            <label className="login-modal__label">
              <span>手机号</span>
              <div className="login-modal__phone-row">
                <span className="login-modal__prefix">+86</span>
                <input
                  ref={phoneRef}
                  type="tel"
                  className="login-modal__input"
                  placeholder="请输入手机号"
                  value={phone}
                  maxLength={11}
                  onChange={(e) => { setPhone(e.target.value); setError(""); }}
                  onKeyDown={handlePhoneKey}
                  disabled={loading}
                />
              </div>
            </label>
            {error ? <p className="login-modal__error">{error}</p> : null}
            <button
              type="button"
              className="btn btn--primary login-modal__btn"
              onClick={handleSendOtp}
              disabled={loading}
            >
              {loading ? "发送中…" : "获取验证码"}
            </button>
          </div>
        ) : (
          <div className="login-modal__body">
            <p className="login-modal__hint">验证码已发送至 +86 {phone}，有效期 10 分钟</p>
            <label className="login-modal__label">
              <span>验证码</span>
              <input
                ref={otpRef}
                type="text"
                inputMode="numeric"
                className="login-modal__input login-modal__input--otp"
                placeholder="6 位验证码"
                value={otp}
                maxLength={6}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
                onKeyDown={handleOtpKey}
                disabled={loading}
              />
            </label>
            {error ? <p className="login-modal__error">{error}</p> : null}
            <button
              type="button"
              className="btn btn--primary login-modal__btn"
              onClick={handleVerify}
              disabled={loading}
            >
              {loading ? "验证中…" : "登录"}
            </button>
            <div className="login-modal__resend-row">
              <button
                type="button"
                className="login-modal__resend"
                onClick={handleResend}
                disabled={countdown > 0 || loading}
              >
                {countdown > 0 ? `重新发送 (${countdown}s)` : "重新发送验证码"}
              </button>
              <button
                type="button"
                className="login-modal__back"
                onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
              >
                修改手机号
              </button>
            </div>
          </div>
        )}

        <p className="login-modal__footer">登录即视为同意使用条款 · 数据仅用于多设备同步</p>
      </div>
    </div>
  );
}
