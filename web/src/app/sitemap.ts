import type { MetadataRoute } from "next";
import { getAllBlogPostMetadata } from "@/lib/blog";

const SITE_URL = "https://digirobotics.xyz";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllBlogPostMetadata();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/gear`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/getting-started`, changeFrequency: "monthly", priority: 0.7 },
  ];

  return [
    ...staticRoutes,
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.updatedAt ?? post.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
