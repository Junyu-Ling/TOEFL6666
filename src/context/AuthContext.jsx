import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "../services/supabase";
import { getAppUser, getSession, signOut as authSignOut, syncIdentitySession } from "../services/auth";
import { pullAllProgress, pushAllProgress } from "../services/cloudSync";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const lastPulledIdRef = useRef(null);

  const applyUser = useCallback(async (nextUser, { forcePull = false } = {}) => {
    setUser(nextUser);
    const id = nextUser?.id || null;
    if (!id) {
      lastPulledIdRef.current = null;
      return;
    }
    if (!forcePull && lastPulledIdRef.current === id) return;
    lastPulledIdRef.current = id;
    setSyncing(true);
    try {
      await pullAllProgress(id);
    } catch (err) {
      // 云同步失败不能中断启动，否则登录态和权限都加载不出来
      console.warn("[auth] 拉取云端进度失败：", err);
    } finally {
      setSyncing(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const appUser = await getAppUser().catch(() => null);
    await applyUser(appUser, { forcePull: true });
    return appUser;
  }, [applyUser]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const appUser = await getAppUser().catch(() => null);
        if (cancelled) return;
        if (appUser) {
          await applyUser(appUser, { forcePull: true });
          return;
        }
        if (isSupabaseConfigured()) {
          const session = await getSession().catch(() => null);
          if (session?.access_token) {
            await syncIdentitySession(session.access_token).catch(() => null);
          }
          const next = await getAppUser().catch(() => null);
          if (!cancelled) await applyUser(next || session?.user || null);
        } else if (!cancelled) {
          await applyUser(null);
        }
      } catch (err) {
        console.warn("[auth] 初始化登录态失败：", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    boot();

    if (!isSupabaseConfigured()) {
      return () => {
        cancelled = true;
      };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;
      if (session?.access_token) {
        await syncIdentitySession(session.access_token).catch(() => null);
      }
      if (cancelled) return;
      const appUser = await getAppUser().catch(() => null);
      await applyUser(appUser);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [applyUser]);

  const signOut = useCallback(async () => {
    if (user?.id) {
      await pushAllProgress(user.id).catch(() => {});
    }
    try {
      await authSignOut();
    } catch (err) {
      // 退出接口报错也要把本地登录态清掉，否则导航栏一直显示旧账号
      console.warn("[auth] 退出登录失败：", err);
    }
    lastPulledIdRef.current = null;
    setUser(null);
  }, [user]);

  useEffect(() => {
    if (!user?.id) return undefined;
    const push = () => {
      pushAllProgress(user.id).catch(() => {});
    };
    const timer = window.setInterval(push, 45000);
    window.addEventListener("beforeunload", push);
    window.addEventListener("pagehide", push);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("beforeunload", push);
      window.removeEventListener("pagehide", push);
      push();
    };
  }, [user?.id]);

  return (
    <AuthContext.Provider value={{ user, loading, syncing, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
