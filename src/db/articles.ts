import { v4 as uuidv4 } from "uuid";

import { db, type Article, type ParseStatus } from "./index";

export type ArticleInput = {
  url: string;
  title: string;
  content_html: string;
  content_text: string;
  parse_status: ParseStatus;
  saved_at?: string;
};

export type ArticleUpdate = Partial<
  Pick<
    Article,
    | "url"
    | "title"
    | "content_html"
    | "content_text"
    | "parse_status"
    | "saved_at"
    | "is_archived"
    | "is_read"
  >
>;

const nowIso = () => new Date().toISOString();

export const createArticle = async (input: ArticleInput): Promise<Article> => {
  const now = nowIso();
  const article: Article = {
    id: uuidv4(),
    url: input.url,
    title: input.title,
    content_html: input.content_html,
    content_text: input.content_text,
    parse_status: input.parse_status,
    created_at: now,
    updated_at: now,
    saved_at: input.saved_at ?? now,
    is_archived: 0,
    is_read: 0,
  };

  await db.articles.add(article);
  return article;
};

export const updateArticle = async (
  id: string,
  updates: ArticleUpdate,
): Promise<Article | undefined> => {
  const updated_at = nowIso();
  await db.articles.update(id, { ...updates, updated_at });
  return db.articles.get(id);
};

export const getArticleById = async (
  id: string,
): Promise<Article | undefined> => db.articles.get(id);

export const listArticles = async (options?: {
  includeArchived?: boolean;
}): Promise<Article[]> => {
  const includeArchived = options?.includeArchived ?? false;

  if (includeArchived) {
    return db.articles.orderBy("saved_at").reverse().toArray();
  }

  return db.articles
    .where("is_archived")
    .equals(0)
    .sortBy("saved_at")
    .then((articles) => articles.reverse());
};

export const markRead = async (id: string): Promise<Article | undefined> =>
  updateArticle(id, { is_read: 1 });

export const archiveArticle = async (
  id: string,
  isArchived = true,
): Promise<Article | undefined> =>
  updateArticle(id, { is_archived: isArchived ? 1 : 0 });
