"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      // SSR and the first client render both treat `reduced` as not-yet-known (framer-motion
      // reports `null` until its effect runs), so the server HTML always starts from the hidden
      // `initial` state below. Once the effect confirms prefers-reduced-motion, `animate` gives
      // the element an explicit, zero-duration target to reach instead of leaving it stranded at
      // `initial` with no `whileInView` to ever fire (DR-L-01).
      className={`reveal ${className}`}
      initial={reduced ? false : { opacity: 0, y: 24 }}
      animate={reduced ? { opacity: 1, y: 0 } : undefined}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.14 }}
      transition={reduced ? { duration: 0 } : { duration: 0.72, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
