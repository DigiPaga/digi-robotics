import "server-only";

import { readFile, readdir } from "fs/promises";
import path from "path";
import matter from "gray-matter";

export type BlogCategory =
  | "Robotics"
  | "AI Agents"
  | "Stablecoins"
  | "x402"
  | "RWA";

export interface BlogPostMetadata {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  readingTime: string;
  featured?: boolean;
  coverImage?: string;
}

export interface BlogPost extends BlogPostMetadata {
  content: string;
}

const BLOG_DIRECTORY = path.join(process.cwd(), "content", "blog");
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CATEGORIES = new Set<BlogCategory>([
  "Robotics",
  "AI Agents",
  "Stablecoins",
  "x402",
  "RWA",
]);

class BlogContentError extends Error {
  constructor(fileName: string, message: string) {
    super(`Invalid blog post "${fileName}": ${message}`);
    this.name = "BlogContentError";
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function requireString(
  data: Record<string, unknown>,
  key: string,
  fileName: string,
): string {
  const value = data[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BlogContentError(fileName, `frontmatter field "${key}" must be a non-empty string.`);
  }
  return value.trim();
}

function requireIsoDate(
  data: Record<string, unknown>,
  key: "publishedAt" | "updatedAt",
  fileName: string,
  optional = false,
): string | undefined {
  const value = data[key];
  if (optional && value === undefined) return undefined;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BlogContentError(fileName, `frontmatter field "${key}" must use YYYY-MM-DD format.`);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new BlogContentError(fileName, `frontmatter field "${key}" is not a valid calendar date.`);
  }
  return value;
}

function optionalBoolean(
  data: Record<string, unknown>,
  key: "featured",
  fileName: string,
): boolean | undefined {
  const value = data[key];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new BlogContentError(fileName, `frontmatter field "${key}" must be true or false.`);
  }
  return value;
}

function optionalCoverImage(data: Record<string, unknown>, fileName: string): string | undefined {
  const value = data.coverImage;
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    throw new BlogContentError(
      fileName,
      'frontmatter field "coverImage" must be a site-local path beginning with "/".',
    );
  }
  return value;
}

function validateMetadata(
  data: Record<string, unknown>,
  fileName: string,
  fileSlug: string,
): BlogPostMetadata {
  const slug = requireString(data, "slug", fileName);
  if (!SLUG_PATTERN.test(slug)) {
    throw new BlogContentError(fileName, 'frontmatter field "slug" must be lowercase kebab-case.');
  }
  if (slug !== fileSlug) {
    throw new BlogContentError(fileName, `frontmatter slug must match the filename slug "${fileSlug}".`);
  }

  const category = requireString(data, "category", fileName);
  if (!CATEGORIES.has(category as BlogCategory)) {
    throw new BlogContentError(
      fileName,
      `frontmatter field "category" must be one of: ${[...CATEGORIES].join(", ")}.`,
    );
  }

  const publishedAt = requireIsoDate(data, "publishedAt", fileName);
  const updatedAt = requireIsoDate(data, "updatedAt", fileName, true);
  if (updatedAt && publishedAt && updatedAt < publishedAt) {
    throw new BlogContentError(fileName, 'frontmatter field "updatedAt" cannot predate "publishedAt".');
  }

  return {
    slug,
    title: requireString(data, "title", fileName),
    excerpt: requireString(data, "excerpt", fileName),
    category: category as BlogCategory,
    publishedAt: publishedAt as string,
    updatedAt,
    author: requireString(data, "author", fileName),
    readingTime: requireString(data, "readingTime", fileName),
    featured: optionalBoolean(data, "featured", fileName),
    coverImage: optionalCoverImage(data, fileName),
  };
}

export function isValidBlogSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

async function listMarkdownFiles(): Promise<string[]> {
  try {
    const entries = await readdir(BLOG_DIRECTORY, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return [];
    throw error;
  }
}

async function readPostFile(fileName: string): Promise<BlogPost> {
  const filePath = path.resolve(BLOG_DIRECTORY, fileName);
  const expectedParent = `${path.resolve(BLOG_DIRECTORY)}${path.sep}`;
  if (!filePath.startsWith(expectedParent)) {
    throw new BlogContentError(fileName, "resolved path falls outside the blog content directory.");
  }

  let source: string;
  try {
    source = await readFile(filePath, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      throw new BlogContentError(fileName, "file could not be found.");
    }
    throw error;
  }

  let parsed: ReturnType<typeof matter>;
  try {
    parsed = matter(source);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "frontmatter could not be parsed";
    throw new BlogContentError(fileName, detail);
  }

  if (parsed.content.trim().length === 0) {
    throw new BlogContentError(fileName, "Markdown body cannot be empty.");
  }

  const fileSlug = fileName.slice(0, -3);
  const metadata = validateMetadata(parsed.data as Record<string, unknown>, fileName, fileSlug);
  return { ...metadata, content: parsed.content.trim() };
}

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const fileNames = await listMarkdownFiles();
  const posts = await Promise.all(fileNames.map(readPostFile));
  return posts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function getAllBlogPostMetadata(): Promise<BlogPostMetadata[]> {
  const posts = await getAllBlogPosts();
  return posts.map(({ content, ...metadata }) => {
    void content;
    return metadata;
  });
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  if (!isValidBlogSlug(slug)) return null;
  const fileName = `${slug}.md`;
  try {
    return await readPostFile(fileName);
  } catch (error) {
    if (error instanceof BlogContentError && error.message.endsWith("file could not be found.")) {
      return null;
    }
    throw error;
  }
}
