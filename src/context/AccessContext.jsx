import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchAccessMe } from "../services/access";
import { accessFallbackFromUser } from "../shared/admin";

const AccessContext = createContext(null);

const EMPTY = {
  isAdmin: false,
  canUseReadingFill: false,
  canUseReadingVocab: false,
};

export function AccessProvider({ children, user }) {
  const fallback = accessFallbackFromUser(user);
  const [access, setAccess] = useState(fallback || EMPTY);
  const [loading, setLoading] = useState(Boolean(user) && !fallback);

  const refresh = useCallback(async () => {
    const local = accessFallbackFromUser(user);
    if (!user) {
      setAccess(EMPTY);
      setLoading(false);
      return EMPTY;
    }
    if (local) setAccess(local);
    setLoading(!local);
    try {
      const data = await fetchAccessMe();
      const next = {
        isAdmin: Boolean(data.isAdmin) || Boolean(local?.isAdmin),
        canUseReadingFill: Boolean(data.features?.readingFill) || Boolean(local?.canUseReadingFill),
        canUseReadingVocab: Boolean(data.features?.readingVocab) || Boolean(local?.canUseReadingVocab),
      };
      setAccess(next);
      return next;
    } catch {
      const next = local || EMPTY;
      setAccess(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AccessContext.Provider value={{ ...access, loading, refresh }}>
      {children}
    </AccessContext.Provider>
  );
}

export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error("useAccess must be used within AccessProvider");
  return ctx;
}
