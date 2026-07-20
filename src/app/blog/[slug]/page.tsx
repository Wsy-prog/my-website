import { Metadata } from "next";
import { loadFromDb } from "@/lib/db";
import { siteConfig } from "@/lib/config";
import BlogPostPageClient from "./page-client";

interface Props {
  params: Promise<{ slug: string }>;
}

const siteUrl = "https://wangshuyi.vercel.app";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const result = await loadFromDb<any[]>("blog_custom_posts");
    const posts = result.data || [];
    const post = posts.find((p: any) => p.slug === slug);

    if (post && !post.draft) {
      const title = post.title || "";
      const description = post.summary || post.content?.replace(/<[^>]*>/g, "").slice(0, 160) || siteConfig.site.description;
      const coverImage = post.coverImage;
      const tags = Array.isArray(post.tags) ? post.tags : [];

      return {
        title: `${title} | ${siteConfig.site.title}`,
        description,
        keywords: tags.join(", "),
        openGraph: {
          title: `${title} | ${siteConfig.site.title}`,
          description,
          type: "article",
          publishedTime: post.date,
          url: `${siteUrl}/blog/${slug}`,
          ...(coverImage ? { images: [{ url: coverImage, width: 1200, height: 630 }] } : {}),
        },
        twitter: {
          card: "summary_large_image",
          title: `${title} | ${siteConfig.site.title}`,
          description,
          ...(coverImage ? { images: [coverImage] } : {}),
        },
        alternates: {
          canonical: `${siteUrl}/blog/${slug}`,
        },
      };
    }
  } catch {
    // 数据库不可读时回退
  }

  return {
    title: `${siteConfig.site.title} | ${siteConfig.site.name}`,
    description: siteConfig.site.description,
    openGraph: {
      title: `${siteConfig.site.title} | ${siteConfig.site.name}`,
      description: siteConfig.site.description,
      url: `${siteUrl}/blog/${slug}`,
    },
    alternates: {
      canonical: `${siteUrl}/blog/${slug}`,
    },
  };
}

export default BlogPostPageClient;
