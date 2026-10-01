// @vitest-environment node
//
// blog.ts imports "server-only", which throws when `window` is defined
// (jsdom). Running under vitest's "node" environment matches how this
// module actually executes (a Next.js server-only module).
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("fs/promises", () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
}));

import { readdir, readFile } from "fs/promises";
import { getAllBlogPostMetadata, getAllBlogPosts, getBlogPost, isValidBlogSlug } from "./blog";

const readdirMock = vi.mocked(readdir);
const readFileMock = vi.mocked(readFile);

function markdownFile(frontmatter: Record<string, unknown>, body = "Some body content."): string {
  const lines = Object.entries(frontmatter).map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
  return `---\n${lines.join("\n")}\n---\n${body}\n`;
}

function mockDirectory(files: Record<string, string>) {
  readdirMock.mockResolvedValue(
    Object.keys(files).map((name) => ({ name, isFile: () => true })) as never,
  );
  readFileMock.mockImplementation((async (filePath: string) => {
    const name = Object.keys(files).find((candidate) => filePath.toString().endsWith(candidate));
    if (name) return files[name];
    const error = new Error("ENOENT") as NodeJS.ErrnoException;
    error.code = "ENOENT";
    throw error;
  }) as never);
}

afterEach(() => {
  vi.resetAllMocks();
});

describe("isValidBlogSlug", () => {
  it("accepts lowercase kebab-case slugs", () => {
    expect(isValidBlogSlug("agentic-commerce-for-robots")).toBe(true);
    expect(isValidBlogSlug("x402")).toBe(true);
  });

  it("rejects path-traversal attempts", () => {
    expect(isValidBlogSlug("../../etc/passwd")).toBe(false);
    expect(isValidBlogSlug("..%2f..%2fetc%2fpasswd")).toBe(false);
    expect(isValidBlogSlug("foo/bar")).toBe(false);
  });

  it("rejects uppercase, spaces, and empty strings", () => {
    expect(isValidBlogSlug("Not-Kebab")).toBe(false);
    expect(isValidBlogSlug("has space")).toBe(false);
    expect(isValidBlogSlug("")).toBe(false);
    expect(isValidBlogSlug("--leading-dash")).toBe(false);
  });
});

describe("getAllBlogPosts", () => {
  it("returns an empty list when the content directory does not exist", async () => {
    const error = new Error("ENOENT") as NodeJS.ErrnoException;
    error.code = "ENOENT";
    readdirMock.mockRejectedValue(error);
    await expect(getAllBlogPosts()).resolves.toEqual([]);
  });

  it("parses a well-formed post and strips frontmatter from the body", async () => {
    mockDirectory({
      "hello-world.md": markdownFile({
        slug: "hello-world",
        title: "Hello World",
        excerpt: "An excerpt.",
        category: "Robotics",
        publishedAt: "2026-01-15",
        author: "DigiRobotics",
        readingTime: "3 min",
      }, "# Hello\nBody text."),
    });

    const posts = await getAllBlogPosts();
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ slug: "hello-world", title: "Hello World", category: "Robotics" });
    expect(posts[0].content).toContain("Body text.");
    expect(posts[0].content).not.toContain("slug:");
  });

  it("sorts posts by publishedAt descending", async () => {
    mockDirectory({
      "older.md": markdownFile({ slug: "older", title: "Older", excerpt: "e", category: "x402", publishedAt: "2026-01-01", author: "a", readingTime: "1 min" }),
      "newer.md": markdownFile({ slug: "newer", title: "Newer", excerpt: "e", category: "x402", publishedAt: "2026-06-01", author: "a", readingTime: "1 min" }),
    });

    const posts = await getAllBlogPosts();
    expect(posts.map((post) => post.slug)).toEqual(["newer", "older"]);
  });

  it("rejects a post whose frontmatter slug does not match its filename", async () => {
    mockDirectory({
      "mismatch.md": markdownFile({ slug: "not-mismatch", title: "T", excerpt: "e", category: "RWA", publishedAt: "2026-01-01", author: "a", readingTime: "1 min" }),
    });
    await expect(getAllBlogPosts()).rejects.toThrow(/must match the filename slug/);
  });

  it("rejects an unknown category", async () => {
    mockDirectory({
      "bad-category.md": markdownFile({ slug: "bad-category", title: "T", excerpt: "e", category: "Crypto", publishedAt: "2026-01-01", author: "a", readingTime: "1 min" }),
    });
    await expect(getAllBlogPosts()).rejects.toThrow(/category/);
  });

  it("rejects a non-ISO publishedAt date", async () => {
    mockDirectory({
      "bad-date.md": markdownFile({ slug: "bad-date", title: "T", excerpt: "e", category: "AI Agents", publishedAt: "01/15/2026", author: "a", readingTime: "1 min" }),
    });
    await expect(getAllBlogPosts()).rejects.toThrow(/YYYY-MM-DD/);
  });

  it("rejects an updatedAt that predates publishedAt", async () => {
    mockDirectory({
      "bad-update.md": markdownFile({
        slug: "bad-update", title: "T", excerpt: "e", category: "Stablecoins",
        publishedAt: "2026-06-01", updatedAt: "2026-01-01", author: "a", readingTime: "1 min",
      }),
    });
    await expect(getAllBlogPosts()).rejects.toThrow(/cannot predate/);
  });

  it("rejects an empty markdown body", async () => {
    mockDirectory({
      "empty.md": markdownFile({ slug: "empty", title: "T", excerpt: "e", category: "RWA", publishedAt: "2026-01-01", author: "a", readingTime: "1 min" }, "   "),
    });
    await expect(getAllBlogPosts()).rejects.toThrow(/cannot be empty/);
  });

  it("rejects a resolved path that escapes the blog content directory", async () => {
    readdirMock.mockResolvedValue([{ name: "../../evil.md", isFile: () => true }] as never);
    readFileMock.mockResolvedValue("should never be read" as never);
    await expect(getAllBlogPosts()).rejects.toThrow(/outside the blog content directory/);
    expect(readFileMock).not.toHaveBeenCalled();
  });
});

describe("getAllBlogPostMetadata", () => {
  it("strips the content field", async () => {
    mockDirectory({
      "hello-world.md": markdownFile({ slug: "hello-world", title: "Hello", excerpt: "e", category: "Robotics", publishedAt: "2026-01-01", author: "a", readingTime: "1 min" }),
    });
    const metadata = await getAllBlogPostMetadata();
    expect(metadata[0]).not.toHaveProperty("content");
  });
});

describe("getBlogPost", () => {
  it("returns null for an invalid slug without touching the filesystem", async () => {
    const post = await getBlogPost("../../etc/passwd");
    expect(post).toBeNull();
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it("returns null when the file does not exist", async () => {
    mockDirectory({});
    const post = await getBlogPost("missing-post");
    expect(post).toBeNull();
  });

  it("returns the full post for a valid, existing slug", async () => {
    mockDirectory({
      "hello-world.md": markdownFile({ slug: "hello-world", title: "Hello", excerpt: "e", category: "Robotics", publishedAt: "2026-01-01", author: "a", readingTime: "1 min" }),
    });
    const post = await getBlogPost("hello-world");
    expect(post?.title).toBe("Hello");
  });
});
