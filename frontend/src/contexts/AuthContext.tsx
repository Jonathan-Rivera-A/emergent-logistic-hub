/**
 * AuthContext: holds the current user and JWT. Persists token in localStorage.
 * Exposes: user, token, loading, login(email,password), loginWithGoogle(),
 *          logout(), authFetch helper for protected calls.
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react';
import axios, { type AxiosInstance } from 'axios';
import { supabase } from '../lib/supabase';

const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string) ||
  (import.meta.env.REACT_APP_BACKEND_URL as string) ||
  '';

const TOKEN_KEY = 'auth:token';
const USER_KEY = 'auth:user';

export interface AuthUser {
  email: string;
  name?: string | null;
  provider: 'local' | 'google';
  is_admin: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  api: AxiosInstance;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function readStored<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStored<AuthUser>(USER_KEY));
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Axios instance that always injects current token
  const api = useMemo(() => {
    const instance = axios.create({ baseURL: BACKEND_URL, timeout: 30000 });
    instance.interceptors.request.use(cfg => {
      const t = localStorage.getItem(TOKEN_KEY);
      if (t) cfg.headers.Authorization = `Bearer ${t}`;
      return cfg;
    });
    instance.interceptors.response.use(
      r => r,
      err => {
        if (err?.response?.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setUser(null);
          setToken(null);
        }
        return Promise.reject(err);
      }
    );
    return instance;
  }, []);

  const persistSession = useCallback((t: string, u: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setToken(t);
    setUser(u);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.post('/api/auth/login', { email, password });
        persistSession(data.access_token, data.user);
      } catch (e: any) {
        const msg = e?.response?.data?.detail || e?.message || 'Error de autenticación';
        setError(typeof msg === 'string' ? msg : 'Credenciales inválidas');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [api, persistSession]
  );

  const loginWithGoogle = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error: e } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (e) throw e;
      // redirect happens; auth/callback route will complete the exchange
    } catch (e: any) {
      setError(e?.message || 'Error iniciando Google OAuth');
      setLoading(false);
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* already signed out */
    }
    clearSession();
  }, [clearSession]);

  // On mount: if a Supabase session already exists (e.g. after Google redirect),
  // exchange it for our JWT.
  useEffect(() => {
    let cancelled = false;
    async function completeSupabaseLogin() {
      const { data } = await supabase.auth.getSession();
      const supaToken = data?.session?.access_token;
      if (!supaToken || cancelled) return;
      try {
        const res = await api.post('/api/auth/google-exchange', {
          access_token: supaToken,
        });
        if (!cancelled) persistSession(res.data.access_token, res.data.user);
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.response?.data?.detail ||
              'No se pudo completar el inicio con Google'
          );
        }
      }
    }
    // Only try if we don't already have a valid local token
    if (!token) completeSupabaseLogin();
    return () => { cancelled = true; };
  }, [api, persistSession, token]);

  const value: AuthState = {
    user, token, loading, error, api, login, loginWithGoogle, logout,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
