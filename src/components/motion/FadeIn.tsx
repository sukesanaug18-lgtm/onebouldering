"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Subtle fade-in on scroll (CLAUDE.md 6-3): y 20 -> 0, 0.5s, plays once.
 * For a row of cards pass `delay={index * 0.06}`.
 * People who prefer reduced motion see the content without animation.
 */
type FadeInProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
};

export function FadeIn({ children, delay = 0, className, as = "div" }: FadeInProps) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
    >
      {children}
    </Tag>
  );
}
