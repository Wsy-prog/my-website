"use client";

import { motion } from "framer-motion";
import { FlaskConical, Dumbbell, Mountain, BookOpen, Code, Camera, Coffee, Compass, Flower2, GraduationCap, Cpu, HelpCircle } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";

const highlights = [
  { icon: FlaskConical, label: "科研", desc: "工程热物理" },
  { icon: Dumbbell, label: "运动", desc: "乒乓、羽球、游泳、台球" },
  { icon: Mountain, label: "旅行", desc: "走遍山川湖海" },
  { icon: BookOpen, label: "阅读", desc: "思考与写作" },
  { icon: Code, label: "VibeCoding", desc: "用代码创造工具" },
  { icon: Camera, label: "摄影/修图/剪辑", desc: "捕捉光影瞬间" },
  { icon: Coffee, label: "美食/品茶", desc: "舌尖上的探索" },
  { icon: Compass, label: "探索新事物", desc: "保持好奇心" },
  { icon: Flower2, label: "养花养鱼", desc: "生活中的小确幸" },
  { icon: GraduationCap, label: "教学", desc: "知识的传递" },
  { icon: Cpu, label: "电路板设计与焊接", desc: "硬件世界的魅力" },
  { icon: HelpCircle, label: "凑不出来了", desc: "还有很多很多..." },
];

export function AboutSection() {
  return (
    <section id="about-section" className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          className="text-3xl sm:text-4xl font-bold text-center mb-4"
        >
          关于我
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ delay: 0.1 }}
          className="text-center text-muted-foreground max-w-2xl mx-auto mb-12"
        >
          一个中科大本科生，工程热物理专业，啥都想学，啥都会点。
        </motion.p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {highlights.map((item, i) => (
            <GlassCard key={item.label} delay={i * 0.1} className="text-center">
              <item.icon className="h-8 w-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-1">{item.label}</h3>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
