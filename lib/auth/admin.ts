/**
 * Admin — somente variável de servidor ADMIN_EMAILS (nunca NEXT_PUBLIC_*).
 * Usar isAdminEmail / requireAdmin no servidor; no client usar useAuth().isAdmin.
 */

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = getAdminEmails();
  if (admins.length === 0) return false;
  return admins.includes(email.trim().toLowerCase());
}

/** Apenas servidor — indica se ADMIN_EMAILS está definida (não usar em Client Components). */
export function adminAreaEnabled(): boolean {
  return getAdminEmails().length > 0;
}
