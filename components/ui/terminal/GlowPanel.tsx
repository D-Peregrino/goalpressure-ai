"use client";

import type { ReactNode } from "react";
import TerminalCard from "@/components/ui/terminal/TerminalCard";

export default function GlowPanel({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <TerminalCard glow className={className}>
      {title && <p className="t-label mb-4">{title}</p>}
      {children}
    </TerminalCard>
  );
}
