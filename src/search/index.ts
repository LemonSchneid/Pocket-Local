import FlexSearch from "flexsearch";

import type { Article } from "../db";

export type ArticleSearchIndex = FlexSearch.Index;

const createSearchIndex = () =>
  new FlexSearch.Index({
    tokenize: "forward",
    cache: true,
    optimize: true,
    encode: "icase",
  });

export const buildArticleSearchIndex = (
  articles: Article[],
): ArticleSearchIndex => {
  const index = createSearchIndex();
  articles.forEach((article) => {
    if (article.content_text) {
      index.add(article.id, article.content_text);
    }
  });
  return index;
};

export const searchArticles = (
  index: ArticleSearchIndex,
  query: string,
  limit: number,
): string[] => {
  if (!query.trim()) {
    return [];
  }
  const results = index.search(query, { limit });
  return Array.isArray(results) ? results.map(String) : [];
};
