import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured } from "../services/supabase";
import { linkAccountIdentity, sendEmailOtp, sendOtp, syncIdentitySession, verifyEmailOtp, verifyOtp } from "../services/auth";

function formatPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("86") && digits.length === 13) return `+${digits}`;
  if (digits.length === 11) return `+86${digits}`;
  return digits ? `+${digits}` : "";
}

export default function AccountLinkSettings() {
  const { user, refreshUser } = useAuth();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  if (!user) return null;

  const emails = [...new Set([user.email, ...(user.emails || [])].filter(Boolean))];
  const phones = [...new Set([user.phone, ...(user.phones || [])].filter(Boolean))];
  const providers = user.providers?.length ? user.providers : [user.provider].filter(Boolean);

  async function run(fn) {
    setError("");
    setOk("");
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      setError(err.message || "操作失败");
    } finally {
      setLoading(false);
    }
  }

  async function bindPhone() {
    await run(async () => {
      const normalized = formatPhone(phone);
      if (normalized.replace(/\D/g, "").length < 11) throw new Error("请输入有效手机号");
      if (isSupabaseConfigured() && pending !== "phone") {
        await sendOtp(phone);
        setPending("phone");
        setOk("验证码已发送，请填写后点绑定");
        return;
      }
      if (isSupabaseConfigured() && pending === "phone") {
        const data = await verifyOtp(phone, otp);
        if (data?.session?.access_token) await syncIdentitySession(data.session.access_token);
      } else {
        await linkAccountIdentity({ phone: normalized });
      }
      await refreshUser();
      setPhone("");
      setOtp("");
      setPending("");
      setOk("已绑定手机号。之后用 GitHub 或该手机号登录都是同一账号。");
    });
  }

  async function bindEmail() {
    await run(async () => {
      const trimmed = email.trim();
      if (!trimmed.includes("@")) throw new Error("请输入有效邮箱");
      if (isSupabaseConfigured() && pending !== "email") {
        await sendEmailOtp(trimmed);
        setPending("email");
        setOk("验证码已发送，请填写后点绑定");
        return;
      }
      if (isSupabaseConfigured() && pending === "email") {
        const data = await verifyEmailOtp(trimmed, otp);
        if (data?.session?.access_token) await syncIdentitySession(data.session.access_token);
      } else {
        await linkAccountIdentity({ email: trimmed });
      }
      await refreshUser();
      setEmail("");
      setOtp("");
      setPending("");
      setOk("已绑定邮箱。之后用 GitHub 或该邮箱登录都是同一账号。");
    });
  }

  return (
    <details className="settings-group" open>
      <summary className="settings-group__summary">
        <span className="settings-group__title">关联登录方式</span>
        <span className="settings-group__meta">{providers.join(" / ") || "已登录"}</span>
      </summary>
      <div className="settings-group__body">
        <p className="settings-hint settings-hint--compact">
          给当前账号绑定手机号或邮箱后，下次用其中任何一种方式登录都是同一份进度。登录后的数据保存在服务器 Redis，不需要再配 Supabase。
        </p>
        <ul className="account-link__bound">
          {providers.includes("github") || String(user.id || "").startsWith("gh_") ? <li>GitHub 已绑定</li> : null}
          {emails.map((item) => (
            <li key={`e-${item}`}>邮箱 {item}</li>
          ))}
          {phones.map((item) => (
            <li key={`p-${item}`}>手机 {item}</li>
          ))}
        </ul>
        <label className="settings-field">
          绑定手机号
          <div className="account-link__row">
            <input
              type="tel"
              maxLength={11}
              value={phone}
              placeholder="11 位手机号"
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
            <button type="button" className="btn btn--primary" onClick={bindPhone} disabled={loading}>
              {pending === "phone" ? "确认绑定" : "绑定"}
            </button>
          </div>
        </label>
        <label className="settings-field">
          绑定邮箱
          <div className="account-link__row">
            <input
              type="email"
              value={email}
              placeholder="name@example.com"
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <button type="button" className="btn btn--primary" onClick={bindEmail} disabled={loading}>
              {pending === "email" ? "确认绑定" : "绑定"}
            </button>
          </div>
        </label>
        {pending ? (
          <label className="settings-field">
            验证码
            <input
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              disabled={loading}
            />
          </label>
        ) : null}
        {error ? <p className="settings-hint settings-hint--compact">{error}</p> : null}
        {ok ? <p className="settings-hint settings-hint--compact">{ok}</p> : null}
      </div>
    </details>
  );
}
