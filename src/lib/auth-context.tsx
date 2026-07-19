"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

interface AuthState {
  isAdmin: boolean;
  isLoading: boolean;
  loginError: string;
}

interface AuthContextValue extends AuthState {
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "admin_token";

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAdmin: false,
    isLoading: true,
    loginError: "",
  });

  // 启动时验证已有 token
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setState({ isAdmin: false, isLoading: false, loginError: "" });
      return;
    }
    // 向服务端验证 token 是否有效
    fetch("/api/auth/verify", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setState({ isAdmin: true, isLoading: false, loginError: "" });
        } else {
          setStoredToken(null);
          setState({ isAdmin: false, isLoading: false, loginError: "" });
        }
      })
      .catch(() => {
        // 网络错误 → 不信任本地 token，同时显示网络错误
        setState({ isAdmin: false, isLoading: false, loginError: "网络错误，无法验证登录状态" });
      });
  }, []);

  const login = useCallback(async (password: string): Promise<boolean> => {
    setState((s) => ({ ...s, loginError: "" }));
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setStoredToken(data.token);
        setState({ isAdmin: true, isLoading: false, loginError: "" });
        return true;
      } else {
        setState((s) => ({
          ...s,
          loginError: data.error || "密码错误",
        }));
        return false;
      }
    } catch {
      setState((s) => ({ ...s, loginError: "网络错误，请重试" }));
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setState({ isAdmin: false, isLoading: false, loginError: "" });
  }, []);

  const getToken = useCallback((): string | null => {
    return getStoredToken();
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
