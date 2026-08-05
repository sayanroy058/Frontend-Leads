import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api } from "../api/client";

export interface AuthUser { id: number; name: string | null; email: string; }

interface AuthCtx {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);
const TOKEN_KEY = "auth_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setIsLoading(false); return; }

    let cancelled = false;
    (async () => {
      // Retry briefly — the backend may still be starting (cold start). A
      // transient/network error must NOT delete the token, otherwise the user
      // is logged out permanently every time the code is re-run.
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const r = await api.getMe();
          if (cancelled) return;
          setUser(r.user);
          // Only clear the token if the server explicitly reports it invalid.
          if (!r.user) localStorage.removeItem(TOKEN_KEY);
          break;
        } catch {
          if (cancelled) return;
          if (attempt < 2) await new Promise((res) => setTimeout(res, 800));
        }
      }
      if (!cancelled) setIsLoading(false);
    })();

    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api.login({ email, password });
    localStorage.setItem(TOKEN_KEY, r.token);
    setUser(r.user);
    return r.user;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const r = await api.register({ name, email, password });
    localStorage.setItem(TOKEN_KEY, r.token);
    setUser(r.user);
    return r.user;
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    try { await api.logout(); } catch { /* already invalid */ }
  }, []);

  return <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
