"use client";

import type { ReactNode } from "react";

export function SportPanel({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`gp-sport-panel ${className}`.trim()}>
      {title && <h3 className="gp-sport-panel__title">{title}</h3>}
      {children}
    </div>
  );
}

export function SportSectionTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={`gp-sport-section-title ${className}`.trim()}>{children}</h2>
  );
}
