import { useAuth } from "../context/AuthContext";
import { useAccess } from "../context/AccessContext";

export default function ReadingFillGate({ children, onLogin }) {
  const { user, loading: authLoading } = useAuth();
  const { canUseReadingFill, loading: accessLoading } = useAccess();

  if (authLoading || accessLoading) {
    return (
      <section className="feature-gate" lang="zh-CN">
        <p className="feature-gate__title">阅读填词</p>
        <p className="feature-gate__text">正在确认权限…</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="feature-gate" lang="zh-CN">
        <p className="feature-gate__title">阅读填词</p>
        <p className="feature-gate__text">此功能仅对部分用户开放，请先登录。管理员可在设置中为已注册用户开通。</p>
        <button type="button" className="btn btn--primary" onClick={onLogin}>
          登录 / 注册
        </button>
      </section>
    );
  }

  if (!canUseReadingFill) {
    return (
      <section className="feature-gate" lang="zh-CN">
        <p className="feature-gate__title">阅读填词</p>
        <p className="feature-gate__text">你已登录，但还没有阅读填词权限。请联系管理员开通。</p>
      </section>
    );
  }

  return children;
}
