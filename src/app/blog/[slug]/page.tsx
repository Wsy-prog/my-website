"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Tag, Share2 } from "lucide-react";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { GlassCard } from "@/components/shared/GlassCard";
import { GradientText } from "@/components/shared/GradientText";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { blogPosts, type BlogPost } from "@/data/blog-posts";
import { getPostBySlug } from "@/lib/blog-store";

export const dynamic = "force-dynamic";

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  // null = 加载中, undefined = 未找到, BlogPost = 找到了
  const [post, setPost] = useState<BlogPost | null | undefined>(undefined);

  useEffect(() => {
    let found: BlogPost | null = getPostBySlug(slug);
    if (!found) {
      found = blogPosts.find((p) => p.slug === slug) || null;
    }
    setPost(found ?? undefined);
  }, [slug]);

  if (post === undefined) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-40 text-center">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-40 text-center">
        <h1 className="text-4xl font-bold mb-4">文章未找到</h1>
        <Link href="/blog">
          <Button variant="outline" className="gap-2"><ArrowLeft className="h-4 w-4" /> 返回博客</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-20">
      <AnimatedSection>
        {/* Back button */}
        <Link href="/blog" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> 返回博客
        </Link>

        {/* Cover Image */}
        {post.coverImage && (
          <div className="rounded-2xl overflow-hidden mb-8 -mx-0">
            <img src={post.coverImage} alt={post.title} className="w-full max-h-80 object-cover"
              style={{ objectPosition: `50% ${post.coverPosition ?? 50}%` }} />
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
          <GradientText as="h1" className="text-3xl sm:text-4xl font-bold mb-4">{post.title}</GradientText>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {post.date}</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {post.readTime}</span>
          </div>
        </div>
        {post.summary && (
          <p className="text-muted-foreground text-lg leading-relaxed border-l-3 border-primary/30 pl-4 -mt-2 mb-6">{post.summary}</p>
        )}
      </AnimatedSection>

      {/* Content */}
      <AnimatedSection delay={0.2}>
        <GlassCard className="prose prose-gray dark:prose-invert max-w-none">
          <div className="leading-relaxed">
            {post.content.startsWith("<") ? (
              // HTML 内容（所见即所得编辑器产出）
              <div
                dangerouslySetInnerHTML={{ __html: post.content }}
                className="[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-4
                  [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3
                  [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2
                  [&_p]:mb-4 [&_p]:leading-relaxed
                  [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_li]:mb-1
                  [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-1
                  [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:my-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:bg-muted/30 [&_blockquote]:rounded-r-lg
                  [&_img]:rounded-xl [&_img]:my-4 [&_img]:max-w-full
                  [&_strong]:font-semibold"
              />
            ) : (
              // Markdown 内容（旧文章兼容）
              <div
                dangerouslySetInnerHTML={{
                  __html: post.content
                    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold mt-8 mb-3">$1</h3>')
                    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold mt-10 mb-4">$1</h2>')
                    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-primary pl-4 py-2 my-4 italic text-muted-foreground">$1</blockquote>')
                    .replace(/^- (.+)$/gm, '<li class="ml-4 mb-2 list-disc">$1</li>')
                    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 mb-2 list-decimal">$2</li>')
                    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                    .replace(/\n\n/g, '</p><p class="mb-4">')
                    .replace(/^(.+)$/gm, (match: string) => {
                      if (match.startsWith('<')) return match;
                      return `<p class="mb-4">${match}</p>`;
                    }),
                }}
              />
            )}
          </div>
        </GlassCard>
      </AnimatedSection>

      {/* Share & Comments placeholder */}
      <AnimatedSection delay={0.4} className="mt-12">
        <div className="flex items-center justify-between">
          <Button variant="outline" className="gap-2 rounded-full">
            <Share2 className="h-4 w-4" /> 分享文章
          </Button>
        </div>

        <Separator className="my-8" />

        {/* Giscus Comments Placeholder */}
        <GlassCard className="text-center py-12">
          <p className="text-muted-foreground">💬 评论区域（部署后配置 Giscus 即可启用）</p>
        </GlassCard>
      </AnimatedSection>
    </div>
  );
}
