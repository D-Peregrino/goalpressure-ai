"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

export default function BillingPortalButton({
  className = "",
  label = "Gerenciar assinatura",
}: {
  className?: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const json = (await res.json()) as { url?: string };
      if (json.url) window.location.href = json.url;
      else window.location.href = "/api/billing/portal";
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className={`gp-billing-btn ${className}`}
      onClick={() => void openPortal()}
      disabled={loading}
    >
      {loading ? "Abrindo…" : label}
      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}
