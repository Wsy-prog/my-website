"use client";

import { useState, useEffect } from "react";
import { Moon, Sun, Menu, Music } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/resume", label: "简历" },
  { href: "/gallery", label: "摄影" },
  { href: "/blog", label: "博客" },
  { href: "/travel", label: "旅行" },
  { href: "/guestbook", label: "留言" },
  { href: "/contact", label: "联系" },
];

export function Navbar() {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }

    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 监听音乐播放状态
  useEffect(() => {
    const handler = (e: Event) => {
      setIsMusicPlaying((e as CustomEvent).detail.isPlaying);
    };
    document.addEventListener("music-state-change", handler);
    return () => document.removeEventListener("music-state-change", handler);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "glass-card-dark dark:glass-card-dark shadow-lg"
          : "bg-transparent"
      }`}
      style={isScrolled ? { backdropFilter: "blur(16px)" } : {}}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl font-bold gradient-text">MySite</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive(item.href)
                      ? "bg-primary/10"
                      : "text-foreground/70 hover:text-foreground hover:bg-accent"
                  }`}>
                  {isActive(item.href) ? (
                    <span className="bg-gradient-to-r from-purple-500 via-cyan-400 to-purple-500 bg-clip-text text-transparent animate-pulse"
                      style={{ backgroundSize: "200% 100%", animation: "gradient-shift 2s ease-in-out infinite", textShadow: "0 0 12px rgba(124,58,237,0.3)" }}>
                      {item.label}
                    </span>
                  ) : (
                    item.label
                  )}
                </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => document.dispatchEvent(new CustomEvent("toggle-music"))}
              title="音乐"
            >
              <motion.div
                animate={{ rotate: isMusicPlaying ? [0, 360] : 0 }}
                transition={isMusicPlaying ? { duration: 3, ease: "linear", repeat: Infinity } : { duration: 0.5, ease: "easeInOut" }}
                style={{ display: "inline-flex" }}
              >
                <Music className="h-5 w-5" />
              </motion.div>
            </Button>

            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger className="md:hidden rounded-full p-2 hover:bg-accent transition-colors" aria-label="打开菜单">
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="flex flex-col gap-2 mt-8">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-4 py-3 text-lg font-medium rounded-lg transition-colors ${
                        isActive(item.href) ? "bg-primary/10" : "hover:bg-accent"
                      }`}>
                      {isActive(item.href) ? (
                        <span className="bg-gradient-to-r from-purple-500 via-cyan-400 to-purple-500 bg-clip-text text-transparent"
                          style={{ backgroundSize: "200% 100%", animation: "gradient-shift 2s ease-in-out infinite" }}>
                          {item.label}
                        </span>
                      ) : (
                        item.label
                      )}
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
