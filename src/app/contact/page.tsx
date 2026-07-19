import { Globe, Mail, MessageCircle, Phone, Music } from "lucide-react";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { GradientText } from "@/components/shared/GradientText";
import { GlassCard } from "@/components/shared/GlassCard";

const contactItems = [
  { icon: Mail, label: "邮箱", value: "1753793278@qq.com" },
  { icon: Mail, label: "邮箱", value: "wsy541541@mail.ustc.edu.cn" },
  { icon: Phone, label: "手机", value: "18907506952" },
  { icon: MessageCircle, label: "QQ", value: "1753793278" },
  { icon: MessageCircle, label: "微信", value: "手机同号" },
  { icon: Music, label: "抖音", value: "42665078724" },
];

export default function ContactPage() {
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
              <div key={item.value} className="flex items-center gap-3 p-3 rounded-xl">
                <item.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="font-medium w-14 shrink-0">{item.label}</span>
                <span className="text-sm text-muted-foreground">{item.value}</span>
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
    </div>
  );
}
