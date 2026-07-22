import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi } from "../api/auth";

const AuthContext = createContext(null);

// The access token now lives only in an httpOnly cookie the browser sends
// automatically - it is never stored in localStorage or read by JS, which
// closes off token theft via XSS. We only cache the (non-secret) user
// profile for a snappier first paint, and always confirm it against the
// server via GET /auth/me on load, since that's the only source of truth
// for whether the cookie is actually still valid.
const USER_KEY = "vroomgo_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const cached = localStorage.getItem(USER_KEY);
        if (cached && !cancelled) setUser(JSON.parse(cached));
      } catch (e) {
        // ignore corrupted cache
      }

      try {
        const res = await authApi.getMe();
        if (!cancelled && res.success) {
          setUser(res.data);
          localStorage.setItem(USER_KEY, JSON.stringify(res.data));
        }
      } catch (e) {
        // No valid session cookie - not logged in.
        if (!cancelled) {
          setUser(null);
          localStorage.removeItem(USER_KEY);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Called after login/verify-otp succeed. The server has already set the
  // httpOnly cookie by this point - we just need to remember who's logged in.
  const login = useCallback((userData) => {
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
  }, []);

  const updateUser = useCallback((userData) => {
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    // Clear local state immediately for a snappy UI, then tell the server to
    // clear the cookie (fire-and-forget - the UI shouldn't wait on it).
    localStorage.removeItem(USER_KEY);
    setUser(null);
    authApi.logout().catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
