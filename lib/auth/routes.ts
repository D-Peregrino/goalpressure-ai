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

export function loginUrl(redirectPath?: string): string {
  if (!redirectPath || redirectPath === "/entrar") return "/entrar";
  return `/entrar?redirect=${encodeURIComponent(redirectPath)}`;
}
