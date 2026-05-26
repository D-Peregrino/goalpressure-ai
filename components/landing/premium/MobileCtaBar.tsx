"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function MobileCtaBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const hideNearBottom =
        window.innerHeight + y >= document.documentElement.scrollHeight - 120;
      setVisible(y > 280 && !hideNearBottom);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="gpl-mobile-cta"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          role="region"
          aria-label="Ação rápida"
        >
          <Link href="/cadastro" className="gpl-btn gpl-btn--primary gpl-mobile-cta__btn">
            Começar grátis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
