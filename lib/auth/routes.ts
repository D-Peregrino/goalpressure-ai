/** Rotas públicas, autenticadas e Pro — fonte única para guards. */

export const AUTH_ROUTES = [
  "/entrar",
  "/cadastro",
  "/login",
  "/signup",
  "/esqueci-senha",
  "/forgot-password",
  "/redefinir-senha",
  "/reset-password",
] as const;

export const PROTECTED_ROUTES = ["/conta", "/account"] as const;

export const ADMIN_PREFIX = "/admin";

/** Exige login (conta, admin). */
export function isProtectedPath(pathname: string): boolean {
  if (pathname.startsWith(ADMIN_PREFIX)) return true;
  return PROTECTED_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );
}

export function isAuthPage(pathname: string): boolean {
  return AUTH_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );
}

/** Exige plano Pro+ (fundador mapeia para institutional). */
export const PRO_MINIMUM_ROUTES = [
  "/analytics",
  "/validation",
  "/backtest",
  "/research",
  "/models",
] as const;

export function isProRoute(pathname: string): boolean {
  return PRO_MINIMUM_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );
}

export type LoginUrlOptions = {
  /** Força tela de login mesmo com cookies antigos (evita loop middleware ↔ AuthGuard). */
  reauth?: boolean;
};

export function loginUrl(redirectPath?: string, options?: LoginUrlOptions): string {
  const params = new URLSearchParams();
  if (redirectPath && redirectPath !== "/entrar" && !redirectPath.startsWith("/entrar?")) {
    params.set("redirect", redirectPath);
  }
  if (options?.reauth) params.set("reauth", "1");
  const q = params.toString();
  return q ? `/entrar?${q}` : "/entrar";
}

export function isReauthLoginRequest(searchParams: URLSearchParams | null): boolean {
  return searchParams?.get("reauth") === "1";
}
