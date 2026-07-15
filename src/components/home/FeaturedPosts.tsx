"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { blogPosts, type BlogPost } from "@/data/blog-posts";
import { getAllPosts, loadCustomPostsServer } from "@/lib/blog-store";

export function FeaturedPosts() {
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    // 先展示本地缓存
    setPosts(getAllPosts(blogPosts).sort((a, b) => b.date.localeCompare(a.date)));
    // 再从服务端拉取更新
    loadCustomPostsServer().then(all => {
      setPosts(all.sort((a, b) => b.date.localeCompare(a.date)));
    });
  }, []);

  if (posts.length === 0) {
    return (
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                className="text-3xl sm:text-4xl font-bold"
              >
                最新文章
              </motion.h2>
              <p className="text-muted-foreground mt-2">记录思考与感悟</p>
            </div>
          </div>
          <div className="text-center py-20 text-muted-foreground">
            <p>暂无文章，敬请期待</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              className="text-3xl sm:text-4xl font-bold"
            >
              最新文章
            </motion.h2>
            <p className="text-muted-foreground mt-2">记录思考与感悟</p>
          </div>
          <Link href="/blog">
            <Button variant="ghost" className="gap-2">
              全部文章 <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {posts.filter(p => !p.draft).slice(0, 3).map((post, i) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <GlassCard delay={i * 0.15} className="h-full flex flex-col">
                {/* Cover */}
                {post.coverImage ? (
                  <div className="w-full h-40 rounded-xl overflow-hidden mb-4">
                    <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover"
                      style={{ objectPosition: `50% ${post.coverPosition ?? 50}%` }} />
                  </div>
                ) : (
                  <div className="w-full h-40 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 mb-4 flex items-center justify-center">
                    <span className="text-3xl opacity-30">
                      {post.category === "travel" ? "🏔️" : post.category === "photography" ? "📷" : post.category === "tech" ? "💻" : post.category === "reflection" ? "📖" : "✍️"}
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mb-3">
                  {post.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <h3 className="text-lg font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                  {post.summary}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {post.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {post.readTime}
                  </span>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
