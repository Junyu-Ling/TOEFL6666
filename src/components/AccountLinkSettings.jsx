import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useAccess } from "../context/AccessContext";
import { isSupabaseConfigured } from "../services/supabase";
import { linkAccountIdentity, sendEmailOtp, sendOtp, syncIdentitySession, verifyEmailOtp, verifyOtp } from "../services/auth";
import { LoginBrandIcon } from "./LoginBrandIcons";

function formatPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("86") && digits.length === 13) return `+${digits}`;
  if (digits.length === 11) return `+86${digits}`;
  return digits ? `+${digits}` : "";
}

function IdentityRow({ id, title, detail, connected }) {
  return (
    <div className={`account-identity${connected ? " account-identity--on" : ""}`}>
      <span className="account-identity__icon" aria-hidden>
        <LoginBrandIcon id={id} />
      </span>
      <div className="account-identity__meta">
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
      <span className={`account-pill${connected ? " account-pill--ok" : ""}`}>
        {connected ? "已连接" : "未连接"}
      </span>
    </div>
  );
}

export default function AccountLinkSettings({ onLoginClick }) {
  const { user, syncing, signOut, refreshUser } = useAuth();
  const { isAdmin, canUseReadingFill, canUseReadingVocab } = useAccess();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const emails = useMemo(
    () => [...new Set([user?.email, ...(user?.emails || [])].filter(Boolean))],
    [user]
  );
  const phones = useMemo(
    () => [...new Set([user?.phone, ...(user?.phones || [])].filter(Boolean))],
    [user]
  );
  const providers = user?.providers?.length ? user.providers : [user?.provider].filter(Boolean);
  const hasGithub = providers.includes("github") || String(user?.id || "").startsWith("gh_");
  const hasGoogle = providers.includes("google") || String(user?.id || "").startsWith("google_");
  const avatar = user?.avatar || user?.user_metadata?.avatar_url || "";
  const displayName =
    user?.name || user?.user_metadata?.user_name || user?.login || (emails[0] ? emails[0].split("@")[0] : "已登录");

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

  if (!user) {
    return (
      <div className="account-page">
        <div className="account-hero">
          <div className="account-hero__avatar account-hero__avatar--empty" aria-hidden>
            ?
          </div>
          <div className="account-hero__copy">
            <h3>未登录</h3>
            <p>登录后进度会跟账号走，换设备也能继续。管理员账号还能分开开通阅读填词和词汇配对。</p>
          </div>
        </div>
        <div className="settings-page__actions">
          <button type="button" className="settings-action-btn settings-action-btn--primary" onClick={onLoginClick}>
            登录 / 注册
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <section className="account-hero">
        {avatar ? (
          <img className="account-hero__avatar" src={avatar} alt="" />
        ) : (
          <div className="account-hero__avatar account-hero__avatar--empty" aria-hidden>
            {displayName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="account-hero__copy">
          <div className="account-hero__name-row">
            <h3>{displayName}</h3>
            {isAdmin ? <span className="account-pill account-pill--admin">管理员</span> : null}
            {canUseReadingFill && !isAdmin ? <span className="account-pill account-pill--ok">阅读填词已开通</span> : null}
            {canUseReadingVocab && !isAdmin ? <span className="account-pill account-pill--ok">词汇配对已开通</span> : null}
          </div>
          <p>{emails[0] || phones[0] || "已登录"}</p>
          <div className="account-hero__facts">
            <span>{syncing ? "正在同步进度…" : "进度已跟账号同步"}</span>
            <span className="account-hero__id">{user.id}</span>
          </div>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card__head">
          <h4>登录方式</h4>
          <p>任意一种已绑定方式登录，都会进入同一个账号。</p>
        </div>
        <IdentityRow
          id="github"
          title="GitHub"
          detail={hasGithub ? user.login || "已用 GitHub 登录" : "未绑定"}
          connected={hasGithub}
        />
        <IdentityRow
          id="google"
          title="Google"
          detail={hasGoogle ? emails[0] || "已用 Google 登录" : "未绑定"}
          connected={hasGoogle}
        />
        <IdentityRow
          id="email"
          title="邮箱"
          detail={emails.length ? emails.join(" / ") : "可再绑定一个邮箱"}
          connected={emails.length > 0}
        />
        <IdentityRow
          id="phone"
          title="手机号"
          detail={phones.length ? phones.join(" / ") : "可再绑定一个手机号"}
          connected={phones.length > 0}
        />
      </section>

      <section className="settings-card">
        <div className="settings-card__head">
          <h4>添加绑定</h4>
          <p>绑定后，下次用邮箱或手机号也能进这个账号。</p>
        </div>
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
            <button type="button" className="settings-action-btn settings-action-btn--primary" onClick={bindPhone} disabled={loading}>
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
            <button type="button" className="settings-action-btn settings-action-btn--primary" onClick={bindEmail} disabled={loading}>
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
        {error ? <p className="settings-status settings-status--error">{error}</p> : null}
        {ok ? <p className="settings-status settings-status--ok">{ok}</p> : null}
      </section>

      <section className="settings-card settings-card--danger">
        <div className="settings-card__head">
          <h4>退出登录</h4>
          <p>本机登录态会清除。进度已保存在账号里，下次登录还会在。</p>
        </div>
        <div className="settings-page__actions">
          <button type="button" className="settings-action-btn" onClick={() => signOut()}>
            退出当前账号
          </button>
        </div>
      </section>
    </div>
  );
}
