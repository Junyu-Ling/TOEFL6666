import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchAccessMe } from "../services/access";

const AccessContext = createContext(null);

const EMPTY = {
  isAdmin: false,
  canUseReadingFill: false,
};

export function AccessProvider({ children, user }) {
  const [access, setAccess] = useState(EMPTY);
  const [loading, setLoading] = useState(Boolean(user));

  const refresh = useCallback(async () => {
    if (!user) {
      setAccess(EMPTY);
      setLoading(false);
      return EMPTY;
    }
    setLoading(true);
    try {
      const data = await fetchAccessMe();
      const next = {
        isAdmin: Boolean(data.isAdmin),
        canUseReadingFill: Boolean(data.features?.readingFill),
      };
      setAccess(next);
      return next;
    } catch {
      setAccess(EMPTY);
      return EMPTY;
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
