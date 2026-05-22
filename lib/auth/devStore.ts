/**
 * Armazenamento em memória para desenvolvimento sem Supabase Auth.
 */

import type { DbPlan } from "@/lib/subscription/permissions";
import { isAdminEmail } from "@/lib/auth/admin";

export interface DevUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: "user" | "admin";
  plan: DbPlan;
  subscriptionStatus: string;
  couponCode: string | null;
  createdAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_DEV_USERS__: Map<string, DevUser> | undefined;
  // eslint-disable-next-line no-var
  var __GP_DEV_LEADS__: unknown[] | undefined;
}

function users(): Map<string, DevUser> {
  if (!globalThis.__GP_DEV_USERS__) {
    globalThis.__GP_DEV_USERS__ = new Map();
  }
  return globalThis.__GP_DEV_USERS__;
}

export function devAuthEnabled(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return !url || !anon;
}

export function createDevUser(input: {
  email: string;
  password: string;
  name: string;
}): DevUser {
  const email = input.email.trim().toLowerCase();
  const map = users();
  if ([...map.values()].some((u) => u.email === email)) {
    throw new Error("E-mail já cadastrado.");
  }
  const id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const user: DevUser = {
    id,
    email,
    password: input.password,
    name: input.name.trim(),
    role: isAdminEmail(email) ? "admin" : "user",
    plan: "free",
    subscriptionStatus: "active",
    couponCode: null,
    createdAt: new Date().toISOString(),
  };
  map.set(id, user);
  return user;
}

export function findDevUserByEmail(email: string): DevUser | undefined {
  const norm = email.trim().toLowerCase();
  return [...users().values()].find((u) => u.email === norm);
}

export function findDevUserById(id: string): DevUser | undefined {
  return users().get(id);
}

export function verifyDevUser(email: string, password: string): DevUser | null {
  const u = findDevUserByEmail(email);
  if (!u || u.password !== password) return null;
  return u;
}

export function updateDevUserPlan(
  id: string,
  plan: DbPlan,
  extra?: { couponCode?: string; status?: string }
): DevUser | null {
  const u = users().get(id);
  if (!u) return null;
  u.plan = plan;
  if (extra?.couponCode) u.couponCode = extra.couponCode;
  if (extra?.status) u.subscriptionStatus = extra.status;
  users().set(id, u);
  return u;
}

export function listDevUsers(): DevUser[] {
  return [...users().values()];
}
