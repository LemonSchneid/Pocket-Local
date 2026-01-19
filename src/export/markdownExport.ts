import JSZip from "jszip";

import { listArticles } from "../db/articles";
import { listArticleTagsForArticles, listTags } from "../db/tags";
import type { Article } from "../db";

export type MarkdownExport = {
  articleId: string;
  filename: string;
  content: string;
};

const sanitizeFilename = (value: string): string => {
  const sanitized = value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return sanitized.length > 0 ? sanitized : "article";
};

const escapeYamlValue = (value: string): string =>
  value.replace(/\r?\n/g, " ").replace(/"/g, "\\\"");

const buildFrontmatter = (article: Article, tags: string[]): string => {
  const title = escapeYamlValue(article.title || "Untitled");
  const url = escapeYamlValue(article.url || "");
  const savedAt = escapeYamlValue(article.saved_at);
  const tagLines =
    tags.length === 0
      ? "tags: []"
      : `tags:\n${tags
          .map((tag) => `  - \"${escapeYamlValue(tag)}\"`)
          .join("\n")}`;

  return [
    "---",
    `title: \"${title}\"`,
    `url: \"${url}\"`,
    tagLines,
    `saved_at: \"${savedAt}\"`,
    "---",
  ].join("\n");
};

const buildMarkdownContent = (article: Article, tags: string[]): string => {
  const frontmatter = buildFrontmatter(article, tags);
  const body = article.content_text?.trim() ?? "";
  return `${frontmatter}\n\n${body}`.trimEnd() + "\n";
};

const buildFilename = (article: Article): string => {
  const title = article.title?.trim() || "untitled";
  const base = sanitizeFilename(`${title}-${article.id}`);
  return `${base}.md`;
};

const buildZipFilename = (): string => {
  const date = new Date().toISOString().split("T")[0];
  return `pocket-export-${date}.zip`;
};

export const createMarkdownExports = async (): Promise<MarkdownExport[]> => {
  const articles = await listArticles({ includeArchived: true });
  const tagList = await listTags();
  const tagLookup = new Map(tagList.map((tag) => [tag.id, tag.name]));
  const articleTags = await listArticleTagsForArticles(
    articles.map((article) => article.id),
  );
  const tagsByArticle = new Map<string, string[]>();

  articleTags.forEach((articleTag) => {
    const tagName = tagLookup.get(articleTag.tag_id);
    if (!tagName) {
      return;
    }
    const existing = tagsByArticle.get(articleTag.article_id) ?? [];
    existing.push(tagName);
    tagsByArticle.set(articleTag.article_id, existing);
  });

  return articles.map((article) => {
    const tags = (tagsByArticle.get(article.id) ?? []).sort((a, b) =>
      a.localeCompare(b),
    );
    return {
      articleId: article.id,
      filename: buildFilename(article),
      content: buildMarkdownContent(article, tags),
    };
  });
};

const downloadBlobFile = (filename: string, blob: Blob): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const downloadMarkdownFile = (filename: string, content: string): void => {
  const blob = new Blob([content], {
    type: "text/markdown;charset=utf-8",
  });
  downloadBlobFile(filename, blob);
};

export const createMarkdownZip = async (
  onProgress?: (count: number, total: number) => void,
): Promise<{ filename: string; blob: Blob }> => {
  const exports = await createMarkdownExports();
  const zip = new JSZip();

  exports.forEach((item, index) => {
    zip.file(item.filename, item.content);
    onProgress?.(index + 1, exports.length);
  });

  const blob = await zip.generateAsync({ type: "blob" });

  return { filename: buildZipFilename(), blob };
};

export const downloadZipFile = (filename: string, blob: Blob): void => {
  downloadBlobFile(filename, blob);
};
