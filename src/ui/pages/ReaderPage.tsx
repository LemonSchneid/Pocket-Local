import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { getArticleById, markRead } from "../../db/articles";
import type { Article } from "../../db";
import {
  defaultReaderPreferences,
  getReaderPreferences,
  setReaderPreferences,
  type ReaderPreferences,
} from "../../db/settings";
import ReaderContent from "../../reader/ReaderContent";

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
    ? "You're online. Saved articles remain available offline."
    : "You're offline. Viewing saved articles from local storage.";

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
        />
      ) : null}
    </section>
  );
}

export default ReaderPage;
