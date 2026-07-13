"use client";

import { motion } from "framer-motion";
import { ArrowDown, Globe, Mail } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GradientText } from "@/components/shared/GradientText";
import { siteConfig } from "@/lib/config";

export function HeroSection() {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden">
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* Avatar */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8"
        >
          <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 p-1">
            <img
              src="/images/avatar.jpg?v=2"
              alt="王舒毅"
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </motion.div>

        {/* Name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <GradientText as="h1" className="text-5xl sm:text-7xl font-bold mb-2">
            {"Hello   I'm"} {siteConfig.profile.name}
          </GradientText>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="text-sm sm:text-base text-muted-foreground mb-8 italic tracking-wide"
        >
          有朋自远方来 · 不亦说乎
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <Button
            size="lg"
            className="rounded-full px-8 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white border-0"
            onClick={() => {
              document.getElementById("about-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            关于我
          </Button>
          <Link href="/blog">
            <Button size="lg" variant="outline" className="rounded-full px-8 glass dark:glass-dark">
              Blog
            </Button>
          </Link>
          <Link href="https://github.com" target="_blank" rel="noopener noreferrer">
            <Button size="icon" variant="ghost" className="rounded-full h-11 w-11">
              <Globe className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/contact">
            <Button size="icon" variant="ghost" className="rounded-full h-11 w-11">
              <Mail className="h-5 w-5" />
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 cursor-pointer"
        onClick={() => document.getElementById("about-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
              animate={{ color: ["#a78bfa", "#67e8f9", "#a78bfa"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              style={{ display: "inline-flex", color: "#a78bfa" }}
            >
              <ArrowDown className="h-7 w-7 cursor-pointer" strokeWidth={2.5} />
            </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
