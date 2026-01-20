import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";

import { getArticleById, markRead } from "../../db/articles";
import type { Article, Tag } from "../../db";
import { listAssetsForArticle } from "../../db/assets";
import {
  createTag,
  getTagsForArticle,
  listTags,
  setTagsForArticle,
} from "../../db/tags";
import {
  defaultReaderPreferences,
  getReaderPreferences,
  setReaderPreferences,
  type ReaderPreferences,
} from "../../db/settings";
import ReaderContent from "../../reader/ReaderContent";
import { logError } from "../../utils/logger";

function ReaderPage() {
  const { id } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [preferences, setPreferences] = useState<ReaderPreferences>(
    defaultReaderPreferences,
  );
  const [tags, setTags] = useState<Tag[]>([]);
  const [articleTags, setArticleTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const [isTagSaving, setIsTagSaving] = useState(false);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const hasSavedContent = Boolean(article?.content_html);

  useEffect(() => {
    let isActive = true;

    const loadArticle = async () => {
      if (!id) {
        setError("Missing article id.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const articleRecord = await getArticleById(id);

        if (!isActive) {
          return;
        }

        if (!articleRecord) {
          setArticle(null);
          setError("Article not found.");
          setIsLoading(false);
          return;
        }

        setArticle(articleRecord);
        setIsLoading(false);
        await markRead(articleRecord.id);
      } catch (caughtError) {
        if (!isActive) {
          return;
        }

        logError("reader-load-article-failed", caughtError, { articleId: id });
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load article.",
        );
        setIsLoading(false);
      }
    };

    loadArticle();

    return () => {
      isActive = false;
    };
  }, [id]);

  useEffect(() => {
    let isActive = true;
    let createdUrls: Record<string, string> = {};

    const loadAssets = async () => {
      if (!article) {
        setAssetUrls({});
        return;
      }

      try {
        const assets = await listAssetsForArticle(article.id);
        createdUrls = Object.fromEntries(
          assets.map((asset) => [asset.id, URL.createObjectURL(asset.blob)]),
        );
        if (isActive) {
          setAssetUrls(createdUrls);
        } else {
          Object.values(createdUrls).forEach((url) => URL.revokeObjectURL(url));
        }
      } catch {
        logError("reader-load-assets-failed", "Unable to load article assets.", {
          articleId: article.id,
        });
        if (isActive) {
          setAssetUrls({});
        }
      }
    };

    loadAssets();

    return () => {
      isActive = false;
      Object.values(createdUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [article?.id]);

  useEffect(() => {
    let isActive = true;

    const loadTags = async () => {
      if (!id) {
        return;
      }

      try {
        const [availableTags, assignedTags] = await Promise.all([
          listTags(),
          getTagsForArticle(id),
        ]);
        if (isActive) {
          setTags(availableTags);
          setArticleTags(assignedTags);
        }
      } catch {
        logError("reader-load-tags-failed", "Unable to load tags.", {
          articleId: id,
        });
        if (isActive) {
          setTagError("Unable to load tags.");
        }
      }
    };

    loadTags();

    return () => {
      isActive = false;
    };
  }, [id]);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadPreferences = async () => {
      const stored = await getReaderPreferences();

      if (isActive) {
        setPreferences(stored);
      }
    };

    loadPreferences();

    return () => {
      isActive = false;
    };
  }, []);

  const preferenceLabel = useMemo(
    () => ({
      fontSize: `${Math.round(preferences.fontSize * 100)}%`,
      lineWidth: `${preferences.lineWidth}ch`,
    }),
    [preferences.fontSize, preferences.lineWidth],
  );

  const updatePreferences = (next: ReaderPreferences) => {
    setPreferences(next);
    void setReaderPreferences(next);
  };

  const statusMessage = isOnline
    ? hasSavedContent
      ? "You're online. Saved content is ready for offline reading."
      : "You're online. This article has no saved content yet."
    : hasSavedContent
      ? "You're offline. Viewing saved articles from local storage."
      : "You're offline. This article is missing saved content; reconnect to load it.";

  const assignedTagIds = useMemo(
    () => new Set(articleTags.map((tag) => tag.id)),
    [articleTags],
  );

  const refreshTags = async (articleId: string) => {
    try {
      const [availableTags, assignedTags] = await Promise.all([
        listTags(),
        getTagsForArticle(articleId),
      ]);
      setTags(availableTags);
      setArticleTags(assignedTags);
    } catch (error) {
      logError("reader-refresh-tags-failed", error, { articleId });
      setTagError("Unable to refresh tags.");
    }
  };

  const handleToggleTag = async (tagId: string) => {
    if (!article) {
      return;
    }

    setIsTagSaving(true);
    setTagError(null);

    try {
      const nextTagIds = assignedTagIds.has(tagId)
        ? articleTags.filter((tag) => tag.id !== tagId).map((tag) => tag.id)
        : [...articleTags.map((tag) => tag.id), tagId];

      await setTagsForArticle(article.id, nextTagIds);
      await refreshTags(article.id);
    } catch (caughtError) {
      logError("reader-update-tag-failed", caughtError, {
        articleId: article.id,
      });
      setTagError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update tags.",
      );
    } finally {
      setIsTagSaving(false);
    }
  };

  const handleCreateTag = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!article) {
      return;
    }

    setIsTagSaving(true);
    setTagError(null);

    try {
      const created = await createTag(newTagName);
      if (!created) {
        setTagError("Enter a tag name to add.");
        setIsTagSaving(false);
        return;
      }

      const nextTagIds = new Set(articleTags.map((tag) => tag.id));
      nextTagIds.add(created.id);
      await setTagsForArticle(article.id, Array.from(nextTagIds));
      await refreshTags(article.id);
      setNewTagName("");
    } catch (caughtError) {
      logError("reader-create-tag-failed", caughtError, {
        articleId: article.id,
      });
      setTagError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create tag.",
      );
    } finally {
      setIsTagSaving(false);
    }
  };

  return (
    <section
      className={`page reader-page${
        preferences.darkMode ? " reader-page--dark" : ""
      }`}
    >
      <h2 className="page__title">Reader</h2>
      <div className="reader-preferences">
        <div className="reader-preferences__group">
          <label htmlFor="reader-font-size">Font size</label>
          <div className="reader-preferences__control">
            <input
              id="reader-font-size"
              type="range"
              min="0.9"
              max="1.4"
              step="0.05"
              value={preferences.fontSize}
              onChange={(event) =>
                updatePreferences({
                  ...preferences,
                  fontSize: Number(event.target.value),
                })
              }
            />
            <span className="reader-preferences__value">
              {preferenceLabel.fontSize}
            </span>
          </div>
        </div>
        <div className="reader-preferences__group">
          <label htmlFor="reader-line-width">Line width</label>
          <div className="reader-preferences__control">
            <input
              id="reader-line-width"
              type="range"
              min="52"
              max="90"
              step="2"
              value={preferences.lineWidth}
              onChange={(event) =>
                updatePreferences({
                  ...preferences,
                  lineWidth: Number(event.target.value),
                })
              }
            />
            <span className="reader-preferences__value">
              {preferenceLabel.lineWidth}
            </span>
          </div>
        </div>
        <label className="reader-preferences__toggle" htmlFor="reader-dark-mode">
          <input
            id="reader-dark-mode"
            type="checkbox"
            checked={preferences.darkMode}
            onChange={(event) =>
              updatePreferences({
                ...preferences,
                darkMode: event.target.checked,
              })
            }
          />
          Dark mode
        </label>
      </div>
      <div
        className={`reader-status${
          isOnline ? " reader-status--online" : " reader-status--offline"
        }`}
        role="status"
        aria-live="polite"
      >
        <span className="reader-status__label">
          {isOnline ? "Online" : "Offline"}
        </span>
        <span className="reader-status__message">{statusMessage}</span>
      </div>
      <section className="tag-manager">
        <div className="tag-manager__header">
          <h3>Tags</h3>
          <p>Organize this article with tags stored locally.</p>
        </div>
        <form className="tag-manager__form" onSubmit={handleCreateTag}>
          <label htmlFor="new-tag-name">Add tag</label>
          <div className="tag-manager__input">
            <input
              id="new-tag-name"
              type="text"
              value={newTagName}
              onChange={(event) => setNewTagName(event.target.value)}
              placeholder="e.g. design, research"
            />
            <button type="submit" disabled={isTagSaving}>
              Add
            </button>
          </div>
        </form>
        {tagError ? (
          <p className="tag-manager__error" role="alert">
            {tagError}
          </p>
        ) : null}
        {tags.length === 0 ? (
          <p className="tag-manager__empty">No tags yet.</p>
        ) : (
          <div className="tag-manager__list" aria-live="polite">
            {tags.map((tag) => (
              <label key={tag.id} className="tag-manager__item">
                <input
                  type="checkbox"
                  checked={assignedTagIds.has(tag.id)}
                  onChange={() => handleToggleTag(tag.id)}
                  disabled={isTagSaving}
                />
                <span>{tag.name}</span>
              </label>
            ))}
          </div>
        )}
      </section>
      {isLoading ? (
        <p className="page__status">Loading article...</p>
      ) : null}
      {error ? <p className="page__status page__status--error">{error}</p> : null}
      {article && !isLoading ? (
        <ReaderContent
          title={article.title}
          url={article.url}
          contentHtml={article.content_html}
          preferences={preferences}
          assetUrls={assetUrls}
        />
      ) : null}
    </section>
  );
}

export default ReaderPage;
