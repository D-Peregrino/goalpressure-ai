export {
  getSupabaseAdmin,
  isSupabaseConfigured,
  resetSupabaseClient,
  getSupabaseProjectUrl,
} from "@/lib/supabase/client";

export {
  getSupabasePublicUrl,
  getSupabaseAnonKey,
  getPublicSupabaseConfig,
  isSupabaseAuthConfigured,
  getSupabaseProjectRef,
} from "@/lib/supabase/env";

export { getUserFromAccessToken, isServerAuthReady } from "@/lib/supabase/server-auth";

export type {
  AnalyticsSnapshotRow,
  MatchRow,
  OpsLogRow,
  SignalRow,
} from "@/lib/supabase/types";
