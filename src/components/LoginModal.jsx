import { useCallback, useEffect, useRef, useState } from "react";
import {
  sendOtp,
  verifyOtp,
  sendEmailOtp,
  verifyEmailOtp,
  signInWithProvider,
  syncIdentitySession,
} from "../services/auth";
import { LoginBrandIcon } from "./LoginBrandIcons";

const RESEND_SECONDS = 60;

const SOCIAL = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
];

const LOGIN_ERRORS = {
  missing_code: "登录未返回授权码，请再试一次。",
  bad_state: "登录状态已过期，请再点一次登录。",
  token: "授权失败，请再试一次。",
  profile: "无法读取账号信息，请确认已授权邮箱权限。",
  config: "GitHub 登录尚未配置完成。",
  google_config: "Google 登录尚未配置。请在 Vercel / .env 中设置 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET。",
  secret: "服务端缺少会话密钥。请在 Vercel 配置 AUTH_SECRET（或 GITHUB_CLIENT_SECRET / GOOGLE_CLIENT_SECRET）后重新部署。",
  unverified: "请使用已验证的邮箱登录。",
  denied: "已取消授权。",
  server: "登录失败，请稍后重试。",
};

export default function LoginModal({ onClose, initialError = "" }) {
  const [method, setMethod] = useState("home");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(LOGIN_ERRORS[initialError] || "");
  const [countdown, setCountdown] = useState(0);
  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const otpRef = useRef(null);

  useEffect(() => {
    if (method === "email") emailRef.current?.focus();
    else if (method === "phone") phoneRef.current?.focus();
    else if (method.endsWith("-otp")) otpRef.current?.focus();
  }, [method]);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const id = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [countdown]);

  const run = useCallback(async (fn) => {
    setError("");
    setLoading(true);
    try {
      await fn();
    } catch (e) {
      setError(e.message || "操作失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleSocial(id) {
    await run(() => signInWithProvider(id));
  }

  async function handleSendEmail() {
    await run(async () => {
      await sendEmailOtp(email);
      setMethod("email-otp");
      setCountdown(RESEND_SECONDS);
    });
  }

  async function handleVerifyEmail() {
    await run(async () => {
      const data = await verifyEmailOtp(email, otp);
      if (data?.session?.access_token) {
        await syncIdentitySession(data.session.access_token);
      }
      onClose?.();
    });
  }

  async function handleSendPhone() {
    await run(async () => {
      if (!phone.trim()) throw new Error("请输入手机号");
      await sendOtp(phone);
      setMethod("phone-otp");
      setCountdown(RESEND_SECONDS);
    });
  }

  async function handleVerifyPhone() {
    await run(async () => {
      if (!otp.trim()) throw new Error("请输入验证码");
      const data = await verifyOtp(phone, otp);
      if (data?.session?.access_token) {
        await syncIdentitySession(data.session.access_token);
      }
      onClose?.();
    });
  }

  async function handleResend() {
    if (countdown > 0) return;
    if (method === "email-otp") await handleSendEmail();
    else await handleSendPhone();
  }

  function goHome() {
    setMethod("home");
    setOtp("");
    setError("");
  }

  return (
    <div className="login-modal__overlay" lang="zh-CN" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="login-modal" role="dialog" aria-modal="true" aria-label="登录">
        <div className="login-modal__header">
          <h2 className="login-modal__title">登录 / 注册</h2>
          <button type="button" className="login-modal__close" onClick={onClose} aria-label="关闭">✕</button>
        </div>

        {method === "home" ? (
          <div className="login-modal__body">
            <p className="login-modal__hint">选择一种方式登录。</p>
            <div className="login-modal__social">
              {SOCIAL.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`login-modal__social-btn login-modal__social-btn--${item.id}`}
                  onClick={() => handleSocial(item.id)}
                  disabled={loading}
                >
                  <LoginBrandIcon id={item.id} />
                  {item.label}
                </button>
              ))}
            </div>
            <p className="login-modal__divider">或使用账号</p>
            <div className="login-modal__account-row">
              <button type="button" className="btn btn--primary login-modal__btn" onClick={() => { setMethod("email"); setError(""); }}>
                <LoginBrandIcon id="email" />
                邮箱登录
              </button>
              <button type="button" className="btn login-modal__btn login-modal__btn--ghost" onClick={() => { setMethod("phone"); setError(""); }}>
                <LoginBrandIcon id="phone" />
                手机号登录
              </button>
            </div>
            {error ? <p className="login-modal__error">{error}</p> : null}
          </div>
        ) : null}

        {method === "email" ? (
          <div className="login-modal__body">
            <p className="login-modal__hint">输入邮箱，我们将发送一次性验证码</p>
            <label className="login-modal__label">
              <span>邮箱</span>
              <input
                ref={emailRef}
                type="email"
                className="login-modal__input"
                placeholder="you@example.com"
                value={email}
                autoComplete="email"
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSendEmail(); }}
                disabled={loading}
              />
            </label>
            {error ? <p className="login-modal__error">{error}</p> : null}
            <button type="button" className="btn btn--primary login-modal__btn" onClick={handleSendEmail} disabled={loading}>
              {loading ? "发送中…" : "获取验证码"}
            </button>
            <button type="button" className="login-modal__back" onClick={goHome}>返回其他登录方式</button>
          </div>
        ) : null}

        {method === "email-otp" ? (
          <div className="login-modal__body">
            <p className="login-modal__hint">验证码已发送至 {email}，有效期 10 分钟</p>
            <label className="login-modal__label">
              <span>验证码</span>
              <input
                ref={otpRef}
                type="text"
                inputMode="numeric"
                className="login-modal__input login-modal__input--otp"
                placeholder="6 位验证码"
                value={otp}
                maxLength={8}
                onChange={(e) => { setOtp(e.target.value); setError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleVerifyEmail(); }}
                disabled={loading}
              />
            </label>
            {error ? <p className="login-modal__error">{error}</p> : null}
            <button type="button" className="btn btn--primary login-modal__btn" onClick={handleVerifyEmail} disabled={loading}>
              {loading ? "验证中…" : "登录"}
            </button>
            <div className="login-modal__resend-row">
              <button type="button" className="login-modal__resend" onClick={handleResend} disabled={countdown > 0 || loading}>
                {countdown > 0 ? `${countdown}s 后可重发` : "重新发送"}
              </button>
              <button type="button" className="login-modal__back" onClick={goHome}>返回</button>
            </div>
          </div>
        ) : null}

        {method === "phone" ? (
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
                  onKeyDown={(e) => { if (e.key === "Enter") handleSendPhone(); }}
                  disabled={loading}
                />
              </div>
            </label>
            {error ? <p className="login-modal__error">{error}</p> : null}
            <button type="button" className="btn btn--primary login-modal__btn" onClick={handleSendPhone} disabled={loading}>
              {loading ? "发送中…" : "获取验证码"}
            </button>
            <button type="button" className="login-modal__back" onClick={goHome}>返回其他登录方式</button>
          </div>
        ) : null}

        {method === "phone-otp" ? (
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
                maxLength={8}
                onChange={(e) => { setOtp(e.target.value); setError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleVerifyPhone(); }}
                disabled={loading}
              />
            </label>
            {error ? <p className="login-modal__error">{error}</p> : null}
            <button type="button" className="btn btn--primary login-modal__btn" onClick={handleVerifyPhone} disabled={loading}>
              {loading ? "验证中…" : "登录"}
            </button>
            <div className="login-modal__resend-row">
              <button type="button" className="login-modal__resend" onClick={handleResend} disabled={countdown > 0 || loading}>
                {countdown > 0 ? `${countdown}s 后可重发` : "重新发送"}
              </button>
              <button type="button" className="login-modal__back" onClick={goHome}>返回</button>
            </div>
          </div>
        ) : null}

        <p className="login-modal__footer">登录即视为同意使用条款 · 数据仅用于多设备同步</p>
      </div>
    </div>
  );
}
