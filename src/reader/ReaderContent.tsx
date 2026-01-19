import { useMemo } from "react";
import DOMPurify from "dompurify";

import type { ReaderPreferences } from "../db/settings";
import { getAssetIdFromUrl } from "../utils/assets";

type ReaderContentProps = {
  title?: string;
  url?: string;
  contentHtml?: string;
  preferences: ReaderPreferences;
  assetUrls?: Record<string, string>;
};

function ReaderContent({
  title,
  url,
  contentHtml,
  preferences,
  assetUrls,
}: ReaderContentProps) {
  const resolvedHtml = useMemo(() => {
    if (!contentHtml) {
      return "";
    }

    if (!assetUrls || Object.keys(assetUrls).length === 0) {
      return contentHtml;
    }

    const parser = new DOMParser();
    const document = parser.parseFromString(contentHtml, "text/html");
    const images = document.querySelectorAll("img");

    images.forEach((image) => {
      const src = image.getAttribute("src");
      if (!src) {
        return;
      }

      const assetId = getAssetIdFromUrl(src);
      if (!assetId) {
        return;
      }

      const assetUrl = assetUrls[assetId];
      if (!assetUrl) {
        return;
      }

      image.setAttribute("src", assetUrl);
      image.removeAttribute("srcset");
    });

    return document.body.innerHTML;
  }, [contentHtml, assetUrls]);

  const sanitizedHtml = useMemo(
    () =>
      DOMPurify.sanitize(resolvedHtml, {
        USE_PROFILES: { html: true },
        ALLOWED_URI_REGEXP:
          /^(?:(?:https?|mailto|tel|sms|ftp|blob):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      }),
    [resolvedHtml],
  );

  return (
    <article
      className={`reader${preferences.darkMode ? " reader--dark" : ""}`}
      style={{ maxWidth: `${preferences.lineWidth}ch` }}
    >
      <header className="reader__header">
        <h1>{title ?? "Untitled article"}</h1>
        {url ? (
          <a
            className="reader__url"
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            {url}
          </a>
        ) : null}
      </header>
      <div className="reader__content">
        {contentHtml ? (
          <div
            className="reader__body"
            style={{ fontSize: `${preferences.fontSize}rem` }}
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        ) : (
          <p className="reader__empty">No content saved for this article yet.</p>
        )}
      </div>
    </article>
  );
}

export default ReaderContent;
