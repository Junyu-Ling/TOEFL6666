import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../services/supabase";
import { getAppUser, getSession, signOut as authSignOut } from "../services/auth";
import { pullAllProgress, pushAllProgress } from "../services/cloudSync";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const applyUser = useCallback(async (nextUser) => {
    setUser(nextUser);
    if (nextUser && !String(nextUser.id || "").startsWith("gh_")) {
      setSyncing(true);
      try {
        await pullAllProgress(nextUser.id);
      } finally {
        setSyncing(false);
      }
    }
  }, []);

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
        if (!cancelled) await applyUser(session?.user ?? null);
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [applyUser]);

  const signOut = useCallback(async () => {
    if (user && !String(user.id || "").startsWith("gh_")) {
      await pushAllProgress(user.id).catch(() => {});
    }
    await authSignOut();
    setUser(null);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, syncing, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
