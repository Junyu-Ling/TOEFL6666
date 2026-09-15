import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../services/supabase";
import { getAppUser, getSession, signOut as authSignOut, syncIdentitySession } from "../services/auth";
import { pullAllProgress, pushAllProgress } from "../services/cloudSync";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const applyUser = useCallback(async (nextUser) => {
    setUser(nextUser);
    if (nextUser?.id) {
      setSyncing(true);
      try {
        await pullAllProgress(nextUser.id);
      } finally {
        setSyncing(false);
      }
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const appUser = await getAppUser().catch(() => null);
    await applyUser(appUser);
    return appUser;
  }, [applyUser]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const appUser = await getAppUser().catch(() => null);
      if (cancelled) return;
      if (appUser) {
        await applyUser(appUser);
        setLoading(false);
        return;
      }
      if (isSupabaseConfigured()) {
        const session = await getSession();
        if (session?.access_token) {
          await syncIdentitySession(session.access_token).catch(() => null);
        }
        const next = await getAppUser().catch(() => null);
        if (!cancelled) await applyUser(next || session?.user || null);
      } else if (!cancelled) {
        await applyUser(null);
      }
      if (!cancelled) setLoading(false);
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
    await authSignOut();
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
