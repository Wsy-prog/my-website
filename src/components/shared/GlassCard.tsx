"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { useAnimation } from "@/lib/animation-context";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
}

export function GlassCard({ children, className = "", delay = 0, hover = true, ...props }: GlassCardProps) {
  const { enabled } = useAnimation();

  if (!enabled) {
    return (
      <div className={`glass-card dark:glass-card-dark p-6 ${className}`} {...(props as Record<string, unknown>)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, margin: "-50px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      className={`glass-card dark:glass-card-dark p-6 ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
