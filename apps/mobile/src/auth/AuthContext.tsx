import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type AuthUser } from "../lib/api";

const TOKEN_KEY = "melikey_token";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, username: string, password: string) => Promise<void>;
  resetPassword: (email: string, code: string, password: string) => Promise<void>;
  updateDefaultRadiusMiles: (radiusMiles: number) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync(TOKEN_KEY);
      if (stored) {
        try {
          const { user: restoredUser } = await api.me(stored);
          setToken(stored);
          setUser(restoredUser);
        } catch {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const persist = async (nextToken: string, nextUser: AuthUser) => {
    await SecureStore.setItemAsync(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      login: async (email, password) => {
        const res = await api.login(email, password);
        await persist(res.token, res.user);
      },
      signup: async (email, username, password) => {
        const res = await api.signup(email, username, password);
        await persist(res.token, res.user);
      },
      resetPassword: async (email, code, password) => {
        const res = await api.resetPassword(email, code, password);
        await persist(res.token, res.user);
      },
      updateDefaultRadiusMiles: async (radiusMiles) => {
        if (!token) return;
        const res = await api.updateSettings(token, radiusMiles);
        setUser(res.user);
      },
      logout: async () => {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setToken(null);
        setUser(null);
      },
    }),
    [user, token, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
