import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAccessUsers, grantFeature } from "../services/access";
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
  const [busyKey, setBusyKey] = useState("");

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
    const fill = users.filter((user) => user.isAdmin || user.features?.readingFill).length;
    const vocab = users.filter((user) => user.isAdmin || user.features?.readingVocab).length;
    const admins = users.filter((user) => user.isAdmin).length;
    return { total: users.length, fill, vocab, admins };
  }, [users]);

  async function toggleFeature(user, feature, enabled) {
    setBusyKey(`${user.id}:${feature}`);
    setError("");
    try {
      await grantFeature(user.id, feature, enabled);
      const flag = feature === "reading-vocab" ? "readingVocab" : "readingFill";
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id
            ? { ...item, features: { ...item.features, [flag]: enabled } }
            : item
        )
      );
      await refresh();
    } catch (err) {
      setError(err.message || "开通失败");
    } finally {
      setBusyKey("");
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
          <strong>{stats.fill}</strong>
          <span>已开通阅读填词</span>
        </div>
        <div className="admin-stat">
          <strong>{stats.vocab}</strong>
          <span>已开通词汇配对</span>
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
        <p className="settings-hint settings-hint--compact admin-toolbar__hint">
          阅读填词和词汇配对分开开通，点哪个开哪个。
        </p>
        {error ? <p className="settings-status settings-status--error">{error}</p> : null}

        <ul className="admin-user-list">
          {filtered.map((user) => {
            const fillOn = Boolean(user.features?.readingFill);
            const vocabOn = Boolean(user.features?.readingVocab);
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
                    {!user.isAdmin && fillOn ? <span className="account-pill account-pill--ok">填词</span> : null}
                    {!user.isAdmin && vocabOn ? <span className="account-pill account-pill--ok">配对</span> : null}
                    {!user.isAdmin && !fillOn && !vocabOn ? <span className="account-pill">未开通</span> : null}
                  </div>
                  <span>
                    {emails[0] || user.phone || user.login || user.id}
                    {user.provider ? ` · ${user.provider}` : ""}
                  </span>
                </div>
                <div className="admin-user__actions">
                  <button
                    type="button"
                    className={`settings-action-btn${fillOn && !user.isAdmin ? " settings-action-btn--primary" : ""}`}
                    disabled={user.isAdmin || busyKey === `${user.id}:reading-fill`}
                    onClick={() => toggleFeature(user, "reading-fill", !fillOn)}
                  >
                    {user.isAdmin ? "填词全开" : fillOn ? "关闭填词" : "开通填词"}
                  </button>
                  <button
                    type="button"
                    className={`settings-action-btn${vocabOn && !user.isAdmin ? " settings-action-btn--primary" : ""}`}
                    disabled={user.isAdmin || busyKey === `${user.id}:reading-vocab`}
                    onClick={() => toggleFeature(user, "reading-vocab", !vocabOn)}
                  >
                    {user.isAdmin ? "配对全开" : vocabOn ? "关闭配对" : "开通配对"}
                  </button>
                </div>
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
