import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { listArticles } from "../../db/articles";
import type { Article } from "../../db";

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
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadArticles = async () => {
      setStatus("loading");
      try {
        const items = await listArticles();
        if (isMounted) {
          setArticles(items);
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

  const emptyMessage = useMemo(() => {
    if (status === "loading") {
      return "Loading your saved articles...";
    }
    if (status === "error") {
      return "Unable to load your library right now.";
    }
    return "Import your Pocket archive to start reading offline.";
  }, [status]);

  const statusMessage = useMemo(() => {
    if (status === "loading" || status === "error") {
      return emptyMessage;
    }
    return `${articles.length} article${articles.length === 1 ? "" : "s"} saved`;
  }, [articles.length, emptyMessage, status]);

  const filteredArticles = useMemo(() => {
    if (!showUnreadOnly) {
      return articles;
    }
    return articles.filter((article) => !article.is_read);
  }, [articles, showUnreadOnly]);

  const filterLabel = showUnreadOnly ? "Unread only" : "All articles";

  return (
    <section className="page">
      <h2 className="page__title">Library</h2>
      <p className="page__status">{statusMessage}</p>
      {articles.length > 0 ? (
        <div className="library-filters" role="group" aria-label="Library filter">
          <button
            type="button"
            className={`library-filter__button${
              showUnreadOnly ? "" : " is-active"
            }`}
            onClick={() => setShowUnreadOnly(false)}
          >
            All
          </button>
          <button
            type="button"
            className={`library-filter__button${
              showUnreadOnly ? " is-active" : ""
            }`}
            onClick={() => setShowUnreadOnly(true)}
          >
            Unread
          </button>
          <span className="library-filter__label">{filterLabel}</span>
        </div>
      ) : null}
      {filteredArticles.length > 0 ? (
        <ul className="library-list">
          {filteredArticles.map((article) => (
            <li key={article.id} className="library-item">
              <Link className="library-item__link" to={`/reader/${article.id}`}>
                <div className="library-item__header">
                  <span
                    className={`library-item__status ${
                      article.is_read ? "is-read" : "is-unread"
                    }`}
                  >
                    {article.is_read ? "Read" : "Unread"}
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
            </li>
          ))}
        </ul>
      ) : null}
      {articles.length === 0 && status === "idle" ? (
        <p className="page__status">{emptyMessage}</p>
      ) : null}
      {articles.length > 0 &&
      filteredArticles.length === 0 &&
      status === "idle" ? (
        <p className="page__status">
          No unread articles yet. Switch back to All to view your library.
        </p>
      ) : null}
    </section>
  );
}

export default LibraryPage;
