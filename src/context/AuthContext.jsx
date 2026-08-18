import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../services/supabase";
import { getSession, signOut as authSignOut } from "../services/auth";
import { pullAllProgress, pushAllProgress } from "../services/cloudSync";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const handleSession = useCallback(async (session) => {
    const nextUser = session?.user ?? null;
    setUser(nextUser);
    if (nextUser) {
      setSyncing(true);
      try {
        await pullAllProgress(nextUser.id);
      } finally {
        setSyncing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return undefined;
    }

    getSession().then((session) => {
      handleSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, [handleSession]);

  const signOut = useCallback(async () => {
    if (user) {
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
