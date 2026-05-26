"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { StaggerReveal, StaggerItem } from "@/components/landing/premium/ScrollReveal";

export default function DiffCardsGrid({
  items,
}: {
  items: { icon: LucideIcon; title: string; desc: string }[];
}) {
  return (
    <StaggerReveal className="gpl-diff-grid">
      {items.map((d) => (
        <StaggerItem key={d.title}>
          <motion.article
            className="gpl-diff-card"
            whileHover={{ y: -4, transition: { duration: 0.25 } }}
          >
            <div className="gpl-diff-card__icon">
              <d.icon className="h-5 w-5" />
            </div>
            <h3>{d.title}</h3>
            <p>{d.desc}</p>
            <span className="gpl-diff-card__shine" aria-hidden />
          </motion.article>
        </StaggerItem>
      ))}
    </StaggerReveal>
  );
}
