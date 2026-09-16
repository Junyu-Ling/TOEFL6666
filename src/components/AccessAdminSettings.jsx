import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAccessUsers, grantReadingFill } from "../services/access";
import { useAccess } from "../context/AccessContext";

function userEmails(user) {
  return [...new Set([user.email, ...(user.emails || [])].map((item) => String(item || "").trim()).filter(Boolean))];
}

function userLabel(user) {
  return user.name || user.login || userEmails(user)[0] || user.phone || user.id.slice(0, 8);
}

function userInitial(user) {
  const label = userLabel(user);
  return String(label || "?").slice(0, 1).toUpperCase();
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

  const stats = useMemo(() => {
    const granted = users.filter((user) => user.isAdmin || user.features?.readingFill).length;
    const admins = users.filter((user) => user.isAdmin).length;
    return { total: users.length, granted, admins };
  }, [users]);

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
    <div className="admin-page">
      <div className="admin-stats">
        <div className="admin-stat">
          <strong>{stats.total}</strong>
          <span>注册用户</span>
        </div>
        <div className="admin-stat">
          <strong>{stats.granted}</strong>
          <span>已开通阅读填词</span>
        </div>
        <div className="admin-stat">
          <strong>{stats.admins}</strong>
          <span>管理员</span>
        </div>
      </div>

      {!storageReady ? (
        <p className="settings-field__hint settings-field__hint--warning">
          服务端未配置 Redis，注册用户和开通记录都存不住。请在 Vercel 添加 UPSTASH_REDIS_REST_URL 与
          UPSTASH_REDIS_REST_TOKEN 后重新部署。
        </p>
      ) : null}

      <section className="settings-card">
        <div className="admin-toolbar">
          <label className="settings-field admin-toolbar__search">
            搜索用户
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="邮箱 / 手机号 / 名称"
            />
          </label>
          <button type="button" className="settings-action-btn" onClick={loadUsers} disabled={loading}>
            {loading ? "刷新中…" : "刷新"}
          </button>
        </div>
        {error ? <p className="settings-status settings-status--error">{error}</p> : null}

        <ul className="admin-user-list">
          {filtered.map((user) => {
            const enabled = Boolean(user.features?.readingFill);
            const emails = userEmails(user);
            return (
              <li key={user.id} className="admin-user">
                {user.avatar ? (
                  <img className="admin-user__avatar" src={user.avatar} alt="" />
                ) : (
                  <div className="admin-user__avatar admin-user__avatar--empty" aria-hidden>
                    {userInitial(user)}
                  </div>
                )}
                <div className="admin-user__meta">
                  <div className="admin-user__name">
                    <strong>{userLabel(user)}</strong>
                    {user.isAdmin ? <span className="account-pill account-pill--admin">管理员</span> : null}
                    {!user.isAdmin && enabled ? <span className="account-pill account-pill--ok">已开通</span> : null}
                    {!user.isAdmin && !enabled ? <span className="account-pill">未开通</span> : null}
                  </div>
                  <span>
                    {emails[0] || user.phone || user.login || user.id}
                    {user.provider ? ` · ${user.provider}` : ""}
                  </span>
                </div>
                <button
                  type="button"
                  className={`settings-action-btn${enabled && !user.isAdmin ? " settings-action-btn--primary" : ""}`}
                  disabled={user.isAdmin || busyId === user.id}
                  onClick={() => toggleReadingFill(user, !enabled)}
                >
                  {user.isAdmin ? "全开" : enabled ? "关闭" : "开通"}
                </button>
              </li>
            );
          })}
        </ul>
        {!loading && filtered.length === 0 ? (
          <p className="settings-hint settings-hint--compact">还没有匹配的已登录用户。</p>
        ) : null}
      </section>
    </div>
  );
}
