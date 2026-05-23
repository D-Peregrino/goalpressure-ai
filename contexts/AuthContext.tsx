"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getSupabaseBrowser, isSupabaseAuthConfigured } from "@/lib/supabase/browser";
import type { AccountPayload } from "@/lib/auth/session";
import type { DbPlan } from "@/lib/subscription/permissions";

interface AuthContextValue {
  user: AccountPayload["user"] | null;
  plan: DbPlan;
  subscriptionStatus: string;
  couponCode: string | null;
  loading: boolean;
  signUp: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ error?: string; info?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  refreshAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<AccountPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAccount = useCallback(async () => {
    try {
      const headers: HeadersInit = {};
      const supabase = getSupabaseBrowser();
      if (supabase) {
        const { data: sess } = await supabase.auth.getSession();
        if (sess.session?.access_token) {
          headers.Authorization = `Bearer ${sess.session.access_token}`;
        }
      }
      const res = await fetch("/api/auth/me", { credentials: "include", headers });
      if (res.ok) {
        const data = (await res.json()) as AccountPayload;
        setAccount(data);
      } else {
        setAccount(null);
      }
    } catch {
      setAccount(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function init() {
      const supabase = getSupabaseBrowser();
      if (supabase) {
        await supabase.auth.getSession();
        if (!cancelled) await refreshAccount();
        const { data: sub } = supabase.auth.onAuthStateChange(() => {
          if (!cancelled) void refreshAccount();
        });
        unsubscribe = () => sub.subscription.unsubscribe();
      } else if (!cancelled) {
        await refreshAccount();
      }
      if (!cancelled) setLoading(false);
    }

    void init();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [refreshAccount]);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name, email, password }),
        });

        let data: {
          ok?: boolean;
          error?: string;
          message?: string;
          accessToken?: string | null;
          refreshToken?: string | null;
          needsEmailConfirmation?: boolean;
        } = {};

        try {
          data = await res.json();
        } catch {
          return { error: `Resposta inválida do servidor (${res.status}).` };
        }

        if (!res.ok) {
          return {
            error: data.error ?? data.message ?? `Erro ao criar conta (${res.status}).`,
          };
        }

        if (data.needsEmailConfirmation) {
          return {
            info: data.message ?? "Conta criada. Confirme seu e-mail para entrar.",
          };
        }

        const supabase = getSupabaseBrowser();
        if (supabase && data.accessToken && data.refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.accessToken,
            refresh_token: data.refreshToken,
          });
          if (sessionError) {
            const { error: loginError } = await supabase.auth.signInWithPassword({
              email: email.trim(),
              password,
            });
            if (loginError) return { error: loginError.message };
          }
        } else if (supabase) {
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (loginError) return { error: loginError.message };
        }

        await refreshAccount();
        return {};
      } catch (e) {
        return {
          error: e instanceof Error ? e.message : "Falha de rede ao criar conta.",
        };
      }
    },
    [refreshAccount]
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const supabase = getSupabaseBrowser();
      if (supabase) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        await refreshAccount();
        return {};
      }
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error ?? "E-mail ou senha inválidos." };
      await refreshAccount();
      return {};
    },
    [refreshAccount]
  );

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    if (supabase) await supabase.auth.signOut();
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setAccount(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const supabase = getSupabaseBrowser();
    if (supabase) {
      const base = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${base}/redefinir-senha`,
      });
      if (error) return { error: error.message };
      return {};
    }
    return {
      error:
        "Recuperação de senha indisponível. Verifique NEXT_PUBLIC_SUPABASE_URL e a chave pública (ANON_KEY ou PUBLISHABLE_KEY).",
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: account?.user ?? null,
      plan: account?.plan ?? "free",
      subscriptionStatus: account?.subscriptionStatus ?? "active",
      couponCode: account?.couponCode ?? null,
      loading,
      signUp,
      signIn,
      signOut,
      resetPassword,
      refreshAccount,
    }),
    [account, loading, signUp, signIn, signOut, resetPassword, refreshAccount]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      plan: "free",
      subscriptionStatus: "active",
      couponCode: null,
      loading: false,
      signUp: async () => ({}),
      signIn: async () => ({}),
      signOut: async () => {},
      resetPassword: async () => ({ error: "Auth não inicializado" }),
      refreshAccount: async () => {},
    };
  }
  return ctx;
}

export function useAuthConfigured(): boolean {
  return isSupabaseAuthConfigured();
}
