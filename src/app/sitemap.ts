import type { MetadataRoute } from "next";

const siteUrl = "https://wangshuyi.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "monthly", priority: 1.0 },
    { url: `${siteUrl}/resume`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/gallery`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/travel`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/guestbook`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
  ];
}
