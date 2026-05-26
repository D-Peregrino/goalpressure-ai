"use client";

import { useEffect } from "react";

export default function SportsToast({
  message,
  onClose,
}: {
  message: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(id);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="gp-sports-toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}
