import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { apiFetch, getApiBaseUrl, parseApiError } from "../lib/api";

const STORAGE_KEY = "grolle_auth";
const apiBaseUrl = getApiBaseUrl();

const AuthContext = createContext(null);

function loadStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [tokens, setTokens] = useState(null);
  const [user, setUser] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const stored = loadStoredAuth();
    if (!stored?.tokens) {
      setIsBootstrapping(false);
      return;
    }

    setTokens(stored.tokens);
    setUser(stored.user || null);
    setIsBootstrapping(false);
  }, []);

  const persistAuth = (nextTokens, nextUser) => {
    setTokens(nextTokens);
    setUser(nextUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tokens: nextTokens, user: nextUser }));
  };

  const clearAuth = () => {
    setTokens(null);
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const refreshAccessToken = async () => {
    if (!tokens?.refresh) {
      clearAuth();
      return null;
    }

    const response = await apiFetch("/api/auth/token/refresh/", {
      method: "POST",
      body: JSON.stringify({ refresh: tokens.refresh }),
    });

    if (!response.ok) {
      clearAuth();
      return null;
    }

    const payload = await response.json();
    const nextTokens = { access: payload.access, refresh: tokens.refresh };
    persistAuth(nextTokens, user);
    return nextTokens;
  };

  const authFetch = async (path, options = {}) => {
    let activeTokens = tokens;
    const headers = new Headers(options.headers || {});
    if (activeTokens?.access) {
      headers.set("Authorization", `Bearer ${activeTokens.access}`);
    }

    let response = await apiFetch(path, { ...options, headers });

    if (response.status === 401 && activeTokens?.refresh) {
      const refreshed = await refreshAccessToken();
      if (refreshed?.access) {
        headers.set("Authorization", `Bearer ${refreshed.access}`);
        response = await apiFetch(path, { ...options, headers });
      }
    }

    return response;
  };

  const login = async ({ username, password }) => {
    const response = await apiFetch("/api/auth/login/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    const payload = await response.json();
    const nextTokens = { access: payload.access, refresh: payload.refresh };
    persistAuth(nextTokens, payload.user || null);
    return payload.user;
  };

  const register = async ({ username, email, password }) => {
    const response = await apiFetch("/api/auth/register/", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    return response.json();
  };

  const fetchProfile = async () => {
    const response = await authFetch("/api/auth/profile/");
    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }
    const profile = await response.json();
    persistAuth(tokens, profile);
    return profile;
  };

  const hasAnyRole = (roles = []) => {
    if (!user?.role) {
      return false;
    }
    return roles.includes(user.role);
  };

  const value = useMemo(
    () => ({
      user,
      tokens,
      isAuthenticated: Boolean(tokens?.access),
      isBootstrapping,
      login,
      logout: clearAuth,
      register,
      fetchProfile,
      authFetch,
      hasAnyRole,
    }),
    [user, tokens, isBootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth moet binnen AuthProvider gebruikt worden.");
  }
  return context;
}
