"use client";

import { useCallback, useEffect, useState } from "react";

const AUDIT_MODE_KEY = "gp-terminal-audit-mode";

export function useTerminalAuditMode() {
  const [auditMode, setAuditModeState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUDIT_MODE_KEY);
      setAuditModeState(raw === "1" || raw === "true");
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const setAuditMode = useCallback((on: boolean) => {
    setAuditModeState(on);
    try {
      localStorage.setItem(AUDIT_MODE_KEY, on ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleAuditMode = useCallback(() => {
    setAuditModeState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(AUDIT_MODE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { auditMode, setAuditMode, toggleAuditMode, hydrated };
}
