"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/shared/GlassCard";
import { blogPosts } from "@/data/blog-posts";
import { getAllPosts } from "@/lib/blog-store";
import { loadPhotos } from "@/data/photos";
import { getAllMarkers } from "@/lib/travel-store";
import { awardCategories } from "@/data/awards";

function CountUp({ value }: { value: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: false }}
      transition={{ duration: 0.5, type: "spring" }}
      className="text-3xl sm:text-4xl font-bold gradient-text"
    >
      {value}
    </motion.span>
  );
}

export function StatsSection() {
  const [blogCount, setBlogCount] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);
  const [travelCount, setTravelCount] = useState(0);
  const totalAwards = awardCategories.reduce((sum, cat) => sum + cat.items.length, 0);

  useEffect(() => {
    setBlogCount(getAllPosts(blogPosts).length);
    setPhotoCount(loadPhotos().length);
    setTravelCount(getAllMarkers().filter(m => !m.groupId).length);
  }, []);

  const stats = [
    { value: String(blogCount), label: "博客文章" },
    { value: String(photoCount), label: "摄影作品" },
    { value: String(totalAwards), label: "获奖荣誉" },
    { value: String(travelCount), label: "旅行足迹" },
  ];

  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <GlassCard key={stat.label} delay={i * 0.1} className="text-center">
              <CountUp value={stat.value} />
              <p className="text-sm text-muted-foreground mt-2">{stat.label}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
