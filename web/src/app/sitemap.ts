import type { MetadataRoute } from "next";
import { getAllBlogPostMetadata } from "@/lib/blog";

const SITE_URL = "https://digirobotics.xyz";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllBlogPostMetadata();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/gear`, changeFrequency: "monthly", priority: 0.7 },
    // The flagship x402 purchase demo (DR-L-02): previously unreachable except by typing the
    // URL directly, with no entry anywhere in the site's own navigation or sitemap.
    { url: `${SITE_URL}/agent-demo`, changeFrequency: "monthly", priority: 0.9 },
    // /getting-started is intentionally left out (DR-L-18): today it greets every anonymous
    // visitor with "Registration successful", which it should not do for an indexed, publicly
    // discoverable URL. Re-add it once that page's copy stops assuming a signed-in visitor.
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
