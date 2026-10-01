import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Every cacheable route (blog, sitemap, landing pages) is prerendered at build time and
// never revalidated, so the read-only Workers Static Assets cache is enough: no R2 bucket,
// queue or tag cache to provision.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
