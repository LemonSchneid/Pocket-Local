import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import {
  archiveArticle,
  createArticle,
  listArticles,
  updateArticle,
} from "../../db/articles";
import type { Article, ParseStatus, Tag } from "../../db";
import { listArticleTagsForArticles, listTags } from "../../db/tags";
import {
  buildArticleSearchIndex,
  searchArticles,
  type ArticleSearchIndex,
} from "../../search";
import { fetchArticleHtml } from "../../import/fetchArticleHtml";
import { parseArticleHtml } from "../../import/parseArticleHtml";
import { cacheArticleAssets } from "../../import/cacheArticleAssets";
import { logError } from "../../utils/logger";

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

type CaptureStatus =
  | { state: "idle" }
  | { state: "saving" }
  | {
      state: "success";
      title: string;
      articleId: string;
      parseStatus: ParseStatus;
    }
  | { state: "error"; message: string };

const normalizeUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
};

const extractTitleFromHtml = (html: string, fallbackUrl: string): string => {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");
  const titleText = document.title?.trim();
  if (titleText) {
    return titleText;
  }
  const headerText = document.querySelector("h1")?.textContent?.trim();
  if (headerText) {
    return headerText;
  }
  return getHostname(fallbackUrl);
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
  const [captureUrl, setCaptureUrl] = useState("");
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>({
    state: "idle",
  });
  const location = useLocation();
  const bookmarkletUrl = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("url");
  }, [location.search]);
  const bookmarkletHref = useMemo(() => {
    if (typeof window === "undefined") {
      return "#";
    }
    const appOrigin = window.location.origin;
    const script = `(function(){var url=encodeURIComponent(window.location.href);var app=${JSON.stringify(
      appOrigin,
    )};window.open(app + "/?url=" + url,"_blank","noopener,noreferrer");})();`;
    return `javascript:${script}`;
  }, []);

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
        logError("library-load-failed", "Unable to load library data.");
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

  useEffect(() => {
    if (!bookmarkletUrl) {
      return;
    }
    const normalizedUrl = normalizeUrl(bookmarkletUrl);
    if (!normalizedUrl) {
      setCaptureStatus({
        state: "error",
        message: "Bookmarklet URL is invalid. Enter a valid http(s) URL.",
      });
      return;
    }
    setCaptureUrl(normalizedUrl);
    setCaptureStatus({ state: "idle" });
  }, [bookmarkletUrl]);

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
    try {
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
    } catch (error) {
      logError("library-archive-failed", error, { articleId: article.id });
    }
  };

  const handleCaptureSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = captureUrl.trim();
    const normalizedUrl = normalizeUrl(trimmed);

    if (!normalizedUrl) {
      setCaptureStatus({
        state: "error",
        message: "Enter a valid http(s) URL to save.",
      });
      return;
    }

    setCaptureStatus({ state: "saving" });

    try {
      const result = await fetchArticleHtml(normalizedUrl);

      if (result.status !== "success" || !result.html) {
        setCaptureStatus({
          state: "error",
          message:
            result.error ??
            "We could not fetch that URL. Some sites block cross-origin requests.",
        });
        return;
      }

      const parsed = parseArticleHtml(result.html);
      const title = extractTitleFromHtml(result.html, normalizedUrl);
      const article = await createArticle({
        url: normalizedUrl,
        title,
        content_html: parsed.content_html,
        content_text: parsed.content_text,
        parse_status: parsed.parse_status,
      });
      const cachedAssets = await cacheArticleAssets({
        articleId: article.id,
        articleUrl: normalizedUrl,
        contentHtml: parsed.content_html,
      });
      let updatedArticle = article;

      if (cachedAssets.contentHtml !== parsed.content_html) {
        const stored = await updateArticle(article.id, {
          content_html: cachedAssets.contentHtml,
        });
        if (stored) {
          updatedArticle = stored;
        }
      }

      setArticles((prev) => [updatedArticle, ...prev]);
      setCaptureStatus({
        state: "success",
        title: updatedArticle.title,
        articleId: updatedArticle.id,
        parseStatus: parsed.parse_status,
      });
      setCaptureUrl("");
    } catch (error) {
      logError("library-capture-failed", error, { url: normalizedUrl });
      setCaptureStatus({
        state: "error",
        message: "Unable to save that article right now.",
      });
    }
  };

  return (
    <section className="page">
      <h2 className="page__title">Library</h2>
      <p className="page__status">{statusMessage}</p>
      <div className="library-capture">
        <div className="library-capture__header">
          <h3>Save a new article</h3>
          <p>Paste a URL to fetch and store it for offline reading.</p>
        </div>
        <form className="library-capture__form" onSubmit={handleCaptureSubmit}>
          <label className="library-capture__label" htmlFor="capture-url">
            Article URL
          </label>
          <div className="library-capture__row">
            <input
              id="capture-url"
              type="url"
              value={captureUrl}
              onChange={(event) => setCaptureUrl(event.target.value)}
              placeholder="https://example.com/article"
              required
            />
            <button type="submit" disabled={captureStatus.state === "saving"}>
              {captureStatus.state === "saving" ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
        {captureStatus.state === "error" ? (
          <p className="library-capture__status library-capture__status--error">
            {captureStatus.message}
          </p>
        ) : null}
        {captureStatus.state === "success" ? (
          <p className="library-capture__status">
            Saved “{captureStatus.title}”.{" "}
            <Link to={`/reader/${captureStatus.articleId}`}>
              Open in reader
            </Link>
            {captureStatus.parseStatus === "partial"
              ? " (Saved raw HTML due to parsing limits.)"
              : null}
          </p>
        ) : null}
        {bookmarkletUrl && captureStatus.state !== "error" ? (
          <p className="library-capture__status">
            Bookmarklet loaded a URL. Press Save to capture it.
          </p>
        ) : null}
      </div>
      <div className="library-bookmarklet">
        <div className="library-bookmarklet__header">
          <h3>Bookmarklet</h3>
          <p>
            Drag this button to your bookmarks bar. On any page, click it to
            send the current URL here.
          </p>
        </div>
        <div className="library-bookmarklet__actions">
          <a
            className="library-bookmarklet__button"
            href={bookmarkletHref}
            onClick={(event) => event.preventDefault()}
          >
            Save to Pocket Export
          </a>
          <p className="library-bookmarklet__hint">
            Tip: Chrome and Safari let you drag the button directly into the
            bookmarks bar.
          </p>
        </div>
      </div>
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
