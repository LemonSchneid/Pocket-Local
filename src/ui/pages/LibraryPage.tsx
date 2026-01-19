import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { archiveArticle, listArticles } from "../../db/articles";
import type { Article, Tag } from "../../db";
import { listArticleTagsForArticles, listTags } from "../../db/tags";
import {
  buildArticleSearchIndex,
  searchArticles,
  type ArticleSearchIndex,
} from "../../search";

const getHostname = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const formatSavedDate = (savedAt: string) => {
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

function LibraryPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [articleTags, setArticleTags] = useState<Map<string, Set<string>>>(
    () => new Map(),
  );
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [filter, setFilter] = useState<"all" | "unread" | "archived">("all");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchIndex, setSearchIndex] = useState<ArticleSearchIndex | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;
    const loadArticles = async () => {
      setStatus("loading");
      try {
        const [items, tagList] = await Promise.all([
          listArticles({ includeArchived: true }),
          listTags(),
        ]);
        const tagAssignments = await listArticleTagsForArticles(
          items.map((item) => item.id),
        );
        const nextArticleTags = new Map<string, Set<string>>();
        tagAssignments.forEach((tag) => {
          const existing = nextArticleTags.get(tag.article_id);
          if (existing) {
            existing.add(tag.tag_id);
          } else {
            nextArticleTags.set(tag.article_id, new Set([tag.tag_id]));
          }
        });
        if (isMounted) {
          setArticles(items);
          setTags(tagList);
          setArticleTags(nextArticleTags);
          setStatus("idle");
        }
      } catch {
        if (isMounted) {
          setStatus("error");
        }
      }
    };

    loadArticles();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (articles.length === 0) {
      setSearchIndex(null);
      return;
    }
    setSearchIndex(buildArticleSearchIndex(articles));
  }, [articles]);

  const activeArticles = useMemo(
    () => articles.filter((article) => !article.is_archived),
    [articles],
  );

  const archivedArticles = useMemo(
    () => articles.filter((article) => article.is_archived),
    [articles],
  );

  const emptyMessage = useMemo(() => {
    if (status === "loading") {
      return "Loading your saved articles...";
    }
    if (status === "error") {
      return "Unable to load your library right now.";
    }
    return "Import your Pocket archive to start reading offline.";
  }, [status]);

  const filteredArticles = useMemo(() => {
    if (filter === "archived") {
      return archivedArticles;
    }
    if (filter === "unread") {
      return activeArticles.filter((article) => !article.is_read);
    }
    return activeArticles;
  }, [activeArticles, archivedArticles, filter]);

  const selectedTagNames = useMemo(() => {
    if (selectedTagIds.length === 0) {
      return [];
    }
    const tagLookup = new Map(tags.map((tag) => [tag.id, tag.name]));
    return selectedTagIds
      .map((id) => tagLookup.get(id))
      .filter((name): name is string => Boolean(name));
  }, [selectedTagIds, tags]);

  const tagFilteredArticles = useMemo(() => {
    if (selectedTagIds.length === 0) {
      return filteredArticles;
    }
    return filteredArticles.filter((article) => {
      const tagsForArticle = articleTags.get(article.id);
      if (!tagsForArticle) {
        return false;
      }
      return selectedTagIds.every((tagId) => tagsForArticle.has(tagId));
    });
  }, [articleTags, filteredArticles, selectedTagIds]);

  const searchResultIds = useMemo(() => {
    if (!searchIndex || !searchQuery.trim()) {
      return null;
    }
    return new Set(
      searchArticles(searchIndex, searchQuery, Math.max(articles.length, 50)),
    );
  }, [articles.length, searchIndex, searchQuery]);

  const searchFilteredArticles = useMemo(() => {
    if (!searchResultIds) {
      return tagFilteredArticles;
    }
    return tagFilteredArticles.filter((article) =>
      searchResultIds.has(article.id),
    );
  }, [searchResultIds, tagFilteredArticles]);

  const statusMessage = useMemo(() => {
    if (status === "loading" || status === "error") {
      return emptyMessage;
    }
    let label = "article saved";
    if (filter === "archived") {
      label = "archived article";
    } else if (filter === "unread") {
      label = "unread article";
    }
    const count = searchFilteredArticles.length;
    let message = `${count} ${label}${count === 1 ? "" : "s"}`;
    if (selectedTagNames.length > 0) {
      message = `${message} matching ${selectedTagNames.join(", ")}`;
    }
    if (searchQuery.trim()) {
      message = `${message} for “${searchQuery.trim()}”`;
    }
    return message;
  }, [
    emptyMessage,
    filter,
    searchFilteredArticles.length,
    searchQuery,
    selectedTagNames,
    status,
  ]);

  const filterLabel = useMemo(() => {
    let baseLabel = "All articles";
    if (filter === "unread") {
      baseLabel = "Unread only";
    } else if (filter === "archived") {
      baseLabel = "Archived";
    }
    if (selectedTagNames.length === 0) {
      return baseLabel;
    }
    return `${baseLabel} • Tags: ${selectedTagNames.join(", ")}`;
  }, [filter, selectedTagNames]);

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((existing) => existing !== tagId)
        : [...prev, tagId],
    );
  };

  const handleArchiveToggle = async (article: Article) => {
    const isArchived = article.is_archived === 1;
    const updated = await archiveArticle(article.id, !isArchived);
    setArticles((prev) =>
      prev.map((item) =>
        item.id === article.id
          ? {
              ...item,
              is_archived: updated?.is_archived ?? (isArchived ? 0 : 1),
              updated_at: updated?.updated_at ?? item.updated_at,
            }
          : item,
      ),
    );
  };

  return (
    <section className="page">
      <h2 className="page__title">Library</h2>
      <p className="page__status">{statusMessage}</p>
      {articles.length > 0 ? (
        <div className="library-search">
          <label className="library-search__label" htmlFor="library-search-input">
            Search your library
          </label>
          <div className="library-search__input-row">
            <input
              id="library-search-input"
              type="search"
              className="library-search__input"
              placeholder="Search saved article text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {searchQuery ? (
              <button
                type="button"
                className="library-search__clear"
                onClick={() => setSearchQuery("")}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {articles.length > 0 ? (
        <div className="library-filters" role="group" aria-label="Library filter">
          <button
            type="button"
            className={`library-filter__button${
              filter === "all" ? " is-active" : ""
            }`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`library-filter__button${
              filter === "unread" ? " is-active" : ""
            }`}
            onClick={() => setFilter("unread")}
          >
            Unread
          </button>
          <button
            type="button"
            className={`library-filter__button${
              filter === "archived" ? " is-active" : ""
            }`}
            onClick={() => setFilter("archived")}
          >
            Archived
          </button>
          <span className="library-filter__label">{filterLabel}</span>
        </div>
      ) : null}
      {tags.length > 0 ? (
        <div className="library-tag-filters" role="group" aria-label="Tag filter">
          <div className="library-tag-filters__header">
            <span className="library-tag-filters__label">Filter by tag</span>
            {selectedTagIds.length > 0 ? (
              <button
                type="button"
                className="library-tag-filters__clear"
                onClick={() => setSelectedTagIds([])}
              >
                Clear tags
              </button>
            ) : null}
          </div>
          <div className="library-tag-filters__list">
            {tags.map((tag) => {
              const isActive = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={`library-tag-filters__tag${
                    isActive ? " is-active" : ""
                  }`}
                  aria-pressed={isActive}
                  onClick={() => handleTagToggle(tag.id)}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {searchFilteredArticles.length > 0 ? (
        <ul className="library-list">
          {searchFilteredArticles.map((article) => (
            <li key={article.id} className="library-item">
              <div className="library-item__content">
                <Link className="library-item__link" to={`/reader/${article.id}`}>
                  <div className="library-item__header">
                    <span
                      className={`library-item__status ${
                        article.is_archived
                          ? "is-archived"
                          : article.is_read
                            ? "is-read"
                            : "is-unread"
                      }`}
                    >
                      {article.is_archived
                        ? "Archived"
                        : article.is_read
                          ? "Read"
                          : "Unread"}
                    </span>
                    <h3 className="library-item__title">
                      {article.title || "Untitled article"}
                    </h3>
                  </div>
                  <div className="library-item__meta">
                    <span>{getHostname(article.url)}</span>
                    <span>Saved {formatSavedDate(article.saved_at)}</span>
                  </div>
                </Link>
                <div className="library-item__actions">
                  <button
                    type="button"
                    className="library-item__action"
                    onClick={() => handleArchiveToggle(article)}
                  >
                    {article.is_archived ? "Unarchive" : "Archive"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {articles.length === 0 && status === "idle" ? (
        <p className="page__status">{emptyMessage}</p>
      ) : null}
      {articles.length > 0 &&
      searchFilteredArticles.length === 0 &&
      status === "idle"
        ? (
            <p className="page__status">
              {searchQuery.trim()
                ? "No articles match that search yet."
                : selectedTagNames.length > 0
                  ? "No articles match the selected tags yet."
                  : filter === "archived"
                    ? "No archived articles yet."
                    : filter === "unread"
                      ? "No unread articles yet. Switch back to All to view your library."
                    : "No active articles yet. Switch to Archived to view saved items."}
            </p>
          )
        : null}
    </section>
  );
}

export default LibraryPage;
