export {};

declare global {
  interface Window {
    __GP_SUPABASE__?: {
      url: string;
      anonKey: string;
    };
  }
}
