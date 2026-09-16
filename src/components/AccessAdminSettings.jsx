import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAccessUsers, grantReadingFill } from "../services/access";
import { useAccess } from "../context/AccessContext";

function userEmails(user) {
  return [...new Set([user.email, ...(user.emails || [])].map((item) => String(item || "").trim()).filter(Boolean))];
}

function userLabel(user) {
  return user.name || user.login || userEmails(user)[0] || user.phone || user.id.slice(0, 8);
}

function userDetail(user) {
  const bits = [];
  if (user.isAdmin) bits.push("管理员");
  else if (user.features?.readingFill) bits.push("已开通阅读填词");
  else bits.push("未开通");
  const emails = userEmails(user);
  if (emails.length) bits.push(emails.join(" / "));
  if (user.phone) bits.push(user.phone);
  if (user.login && user.login !== user.name) bits.push(user.login);
  return bits.join(" · ");
}

export default function AccessAdminSettings() {
  const { isAdmin, refresh } = useAccess();
  const [users, setUsers] = useState([]);
  const [storageReady, setStorageReady] = useState(true);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchAccessUsers();
      setUsers(data.users || []);
      setStorageReady(data.storageReady !== false);
    } catch (err) {
      setError(err.message || "无法加载用户列表");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) =>
      [user.email, user.phone, user.name, user.login, user.id, ...(user.emails || [])].some((value) =>
        String(value || "").toLowerCase().includes(q)
      )
    );
  }, [users, query]);

  async function toggleReadingFill(user, enabled) {
    setBusyId(user.id);
    setError("");
    try {
      await grantReadingFill(user.id, enabled);
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id
            ? { ...item, features: { ...item.features, readingFill: enabled } }
            : item
        )
      );
      await refresh();
    } catch (err) {
      setError(err.message || "开通失败");
    } finally {
      setBusyId("");
    }
  }

  if (!isAdmin) return null;

  return (
    <details className="settings-group" open>
      <summary className="settings-group__summary">
        <span className="settings-group__title">注册用户</span>
        <span className="settings-group__meta">{users.length} 人已注册</span>
      </summary>
      <div className="settings-group__body">
        <p className="settings-hint settings-hint--compact">
          你是管理员。这里能看到所有登录过本站的人；点开通后，对方才能使用阅读填词。
        </p>
        {storageReady ? null : (
          <p className="settings-hint settings-hint--compact">
            服务端未配置 Redis，注册用户和开通记录都存不住。请在 Vercel 添加
            UPSTASH_REDIS_REST_URL 与 UPSTASH_REDIS_REST_TOKEN 后重新部署。
          </p>
        )}
        <label className="settings-field">
          搜索用户
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="邮箱 / 手机号 / 名称"
          />
        </label>
        {error ? <p className="settings-hint settings-hint--compact">{error}</p> : null}
        {loading ? <p className="settings-hint settings-hint--compact">加载中…</p> : null}
        <ul className="access-admin__list">
          {filtered.map((user) => {
            const enabled = Boolean(user.features?.readingFill);
            return (
              <li key={user.id} className="access-admin__row">
                <div className="access-admin__meta">
                  <strong>{userLabel(user)}</strong>
                  <span>{userDetail(user)}</span>
                </div>
                <button
                  type="button"
                  className={`theme-toggle__btn ${enabled ? "theme-toggle__btn--active" : ""}`}
                  disabled={user.isAdmin || busyId === user.id}
                  onClick={() => toggleReadingFill(user, !enabled)}
                >
                  {user.isAdmin ? "管理员" : enabled ? "关闭" : "开通"}
                </button>
              </li>
            );
          })}
        </ul>
        {!loading && filtered.length === 0 ? (
          <p className="settings-hint settings-hint--compact">还没有其他已登录用户。</p>
        ) : null}
      </div>
    </details>
  );
}
