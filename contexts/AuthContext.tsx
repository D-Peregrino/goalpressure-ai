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
import { getPostLoginRedirect } from "@/lib/auth/entitlements";
import type { DbPlan } from "@/lib/subscription/permissions";

interface AuthContextValue {
  user: AccountPayload["user"] | null;
  plan: DbPlan;
  subscriptionStatus: string;
  couponCode: string | null;
  isAdmin: boolean;
  loading: boolean;
  signUp: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ error?: string; info?: string; redirectTo?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string; redirectTo?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  refreshAccount: () => Promise<AccountPayload | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<AccountPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAccount = useCallback(async (): Promise<AccountPayload | null> => {
    const headers: HeadersInit = {};
    const supabase = getSupabaseBrowser();
    if (supabase) {
      const { data: sess } = await supabase.auth.getSession();
      if (sess.session?.access_token) {
        headers.Authorization = `Bearer ${sess.session.access_token}`;
      }
    }

    const fetchMe = async () =>
      fetch("/api/auth/me", { credentials: "include", headers });

    try {
      let res = await fetchMe();
      if (!res.ok && res.status >= 500) {
        await new Promise((r) => setTimeout(r, 400));
        res = await fetchMe();
      }
      if (res.ok) {
        const data = (await res.json()) as AccountPayload;
        setAccount(data);
        return data;
      }
      if (res.status === 401) {
        setAccount(null);
      }
    } catch {
      /* Mantém conta em cache — evita logout aleatório em falha de rede */
    }
    return null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function init() {
      const supabase = getSupabaseBrowser();
      if (supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!cancelled && sessionData.session) {
          await refreshAccount();
        }
        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
          if (cancelled) return;
          if (event === "SIGNED_OUT") {
            setAccount(null);
            return;
          }
          if (
            session &&
            (event === "SIGNED_IN" ||
              event === "TOKEN_REFRESHED" ||
              event === "INITIAL_SESSION")
          ) {
            void refreshAccount();
          }
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

        const acc = await refreshAccount();
        const redirectTo = acc
          ? getPostLoginRedirect({
              role: acc.user.role,
              plan: acc.plan,
              subscriptionStatus: acc.subscriptionStatus,
            })
          : "/minha-central";
        return { redirectTo };
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
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });

        let data: {
          error?: string;
          message?: string;
          accessToken?: string | null;
          refreshToken?: string | null;
        } = {};

        try {
          data = await res.json();
        } catch {
          return { error: `Resposta inválida do servidor (${res.status}).` };
        }

        if (!res.ok) {
          return {
            error: data.error ?? data.message ?? `Erro ao entrar (${res.status}).`,
          };
        }

        const supabase = getSupabaseBrowser();
        if (supabase && data.accessToken && data.refreshToken) {
          await supabase.auth.setSession({
            access_token: data.accessToken,
            refresh_token: data.refreshToken,
          });
        } else if (supabase) {
          const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (error) return { error: error.message };
        }

        const acc = await refreshAccount();
        const redirectTo = acc
          ? getPostLoginRedirect({
              role: acc.user.role,
              plan: acc.plan,
              subscriptionStatus: acc.subscriptionStatus,
            })
          : "/minha-central";
        return { redirectTo };
      } catch (e) {
        return {
          error: e instanceof Error ? e.message : "Falha de rede ao entrar.",
        };
      }
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
      subscriptionStatus: account?.subscriptionStatus ?? "inactive",
      couponCode: account?.couponCode ?? null,
      isAdmin: account?.user?.role === "admin",
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
      subscriptionStatus: "inactive",
      couponCode: null,
      isAdmin: false,
      loading: false,
      signUp: async () => ({}),
      signIn: async () => ({}),
      signOut: async () => {},
      resetPassword: async () => ({ error: "Auth não inicializado" }),
      refreshAccount: async () => null,
    };
  }
  return ctx;
}

export function useAuthConfigured(): boolean {
  return isSupabaseAuthConfigured();
}
