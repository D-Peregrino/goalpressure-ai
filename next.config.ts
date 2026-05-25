import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/api/admin/apply-schemas": ["./supabase/**/*"],
    "/api/dev/apply-schema": ["./supabase/**/*"],
  },
};

export default nextConfig;
