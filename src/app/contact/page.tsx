"use client";

import { useState } from "react";
import { Globe, Mail, MessageCircle, Phone, Music, Send, CheckCircle, AlertCircle } from "lucide-react";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { GradientText } from "@/components/shared/GradientText";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const contactItems = [
  { icon: Mail, label: "邮箱", value: "1753793278@qq.com" },
  { icon: Mail, label: "邮箱", value: "wsy541541@mail.ustc.edu.cn" },
  { icon: Phone, label: "手机", value: "18907506952" },
  { icon: MessageCircle, label: "QQ", value: "1753793278" },
  { icon: MessageCircle, label: "微信", value: "手机同号" },
  { icon: Music, label: "抖音", value: "42665078724" },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus("sent");
        setForm({ name: "", email: "", message: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-20">
      <AnimatedSection className="text-center mb-12">
        <GradientText as="h1" className="text-4xl sm:text-5xl font-bold mb-4">联系我</GradientText>
        <p className="text-muted-foreground">欢迎随时联系</p>
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <GlassCard>
          <div className="space-y-4">
            {contactItems.map((item) => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl">
                <item.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="font-medium w-14 shrink-0">{item.label}</span>
                <span className="text-sm text-muted-foreground break-all">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors"
            >
              <Globe className="h-5 w-5 shrink-0" />
              <span className="font-medium">GitHub</span>
              <span className="text-sm text-muted-foreground ml-auto">github.com</span>
            </a>
          </div>

          <p className="mt-6 text-sm text-center text-muted-foreground">📍 安徽省合肥市</p>
        </GlassCard>
      </AnimatedSection>

      {/* 联系表单 */}
      <AnimatedSection delay={0.2}>
        <GlassCard className="mt-6 p-6">
          <h2 className="text-lg font-semibold mb-4">📩 发消息</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              placeholder="你的名字" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required className="rounded-xl" maxLength={50}
            />
            <Input
              type="email" placeholder="你的邮箱" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required className="rounded-xl" maxLength={100}
            />
            <Textarea
              placeholder="写下你想说的..." value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              required className="rounded-xl min-h-[100px]" maxLength={1000}
            />
            <Button type="submit" disabled={status === "sending"}
              className="w-full rounded-xl gap-2 bg-gradient-to-r from-purple-600 to-cyan-500 text-white">
              {status === "sending" ? "发送中..." : <><Send className="h-4 w-4" /> 发送消息</>}
            </Button>
            {status === "sent" && (
              <p className="text-xs text-green-500 flex items-center gap-1 justify-center"><CheckCircle className="h-3 w-3" /> 消息已发送！</p>
            )}
            {status === "error" && (
              <p className="text-xs text-destructive flex items-center gap-1 justify-center"><AlertCircle className="h-3 w-3" /> 发送失败，请稍后重试</p>
            )}
          </form>
        </GlassCard>
      </AnimatedSection>
    </div>
  );
}
