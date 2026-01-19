import { v4 as uuidv4 } from "uuid";

import { db, type ArticleTag, type Tag } from "./index";

const nowIso = () => new Date().toISOString();

const normalizeTagName = (tag: string): string => tag.trim();

const normalizeTagNames = (tags: string[]): string[] => {
  const normalized = tags
    .map((tag) => normalizeTagName(tag))
    .filter((tag) => tag.length > 0);

  return Array.from(new Set(normalized));
};

export const getOrCreateTag = async (name: string): Promise<Tag> => {
  const normalized = normalizeTagName(name);
  const existing = await db.tags.where("name").equals(normalized).first();
  if (existing) {
    return existing;
  }

  const tag: Tag = {
    id: uuidv4(),
    name: normalized,
    created_at: nowIso(),
  };

  await db.tags.add(tag);
  return tag;
};

export const listTags = async (): Promise<Tag[]> =>
  db.tags.orderBy("name").toArray();

export const listArticleTagsForArticles = async (
  articleIds: string[],
): Promise<ArticleTag[]> => {
  if (articleIds.length === 0) {
    return [];
  }
  return db.article_tags.where("article_id").anyOf(articleIds).toArray();
};

export const createTag = async (name: string): Promise<Tag | null> => {
  const normalized = normalizeTagName(name);
  if (!normalized) {
    return null;
  }
  return getOrCreateTag(normalized);
};

export const deleteTag = async (tagId: string): Promise<void> => {
  await db.transaction("rw", db.tags, db.article_tags, async () => {
    await db.tags.delete(tagId);
    const articleTags = await db.article_tags
      .where("tag_id")
      .equals(tagId)
      .toArray();
    const articleTagIds = articleTags.map((articleTag) => articleTag.id);
    if (articleTagIds.length > 0) {
      await db.article_tags.bulkDelete(articleTagIds);
    }
  });
};

export const getTagsForArticle = async (
  articleId: string,
): Promise<Tag[]> => {
  const articleTags = await db.article_tags
    .where("article_id")
    .equals(articleId)
    .toArray();
  if (articleTags.length === 0) {
    return [];
  }
  const tagIds = articleTags.map((articleTag) => articleTag.tag_id);
  const tags = await db.tags.bulkGet(tagIds);
  return tags
    .filter((tag): tag is Tag => Boolean(tag))
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const setTagsForArticle = async (
  articleId: string,
  tagIds: string[],
): Promise<void> => {
  const normalizedIds = Array.from(new Set(tagIds));
  await db.transaction("rw", db.article_tags, async () => {
    const existing = await db.article_tags
      .where("article_id")
      .equals(articleId)
      .toArray();
    const existingIds = new Set(existing.map((tag) => tag.tag_id));
    const nextIds = new Set(normalizedIds);

    const removeIds = existing
      .filter((tag) => !nextIds.has(tag.tag_id))
      .map((tag) => tag.id);

    if (removeIds.length > 0) {
      await db.article_tags.bulkDelete(removeIds);
    }

    const toAdd = normalizedIds.filter((id) => !existingIds.has(id));
    if (toAdd.length > 0) {
      const articleTags: ArticleTag[] = toAdd.map((tagId) => ({
        id: uuidv4(),
        article_id: articleId,
        tag_id: tagId,
      }));
      await db.article_tags.bulkAdd(articleTags);
    }
  });
};

export const addTagsToArticle = async (
  articleId: string,
  tags: string[],
): Promise<ArticleTag[]> => {
  const normalized = normalizeTagNames(tags);
  if (normalized.length === 0) {
    return [];
  }

  return db.transaction("rw", db.tags, db.article_tags, async () => {
    const existingTags = await db.tags
      .where("name")
      .anyOf(normalized)
      .toArray();
    const existingMap = new Map(
      existingTags.map((tag) => [tag.name, tag]),
    );

    const tagsToCreate = normalized.filter((name) => !existingMap.has(name));
    const createdTags: Tag[] = tagsToCreate.map((name) => ({
      id: uuidv4(),
      name,
      created_at: nowIso(),
    }));

    if (createdTags.length > 0) {
      await db.tags.bulkAdd(createdTags);
      createdTags.forEach((tag) => {
        existingMap.set(tag.name, tag);
      });
    }

    const articleTags: ArticleTag[] = normalized.map((name) => ({
      id: uuidv4(),
      article_id: articleId,
      tag_id: existingMap.get(name)!.id,
    }));

    await db.article_tags.bulkAdd(articleTags);
    return articleTags;
  });
};
