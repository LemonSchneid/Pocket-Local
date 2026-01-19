import { useEffect, useMemo, useState } from "react";

import {
  createMarkdownExports,
  downloadMarkdownFile,
} from "../../export/markdownExport";
import { listArticles } from "../../db/articles";

const tick = () => new Promise((resolve) => window.setTimeout(resolve, 0));

type ExportState = "idle" | "exporting" | "done";

function ExportPage() {
  const [articleCount, setArticleCount] = useState<number>(0);
  const [exportedCount, setExportedCount] = useState(0);
  const [status, setStatus] = useState<ExportState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadArticles = async () => {
      try {
        const articles = await listArticles({ includeArchived: true });
        setArticleCount(articles.length);
      } catch (loadError) {
        console.error(loadError);
        setError("Unable to load articles for export.");
      }
    };

    loadArticles();
  }, []);

  const canExport = articleCount > 0 && status !== "exporting";

  const handleExport = async () => {
    setError(null);
    setStatus("exporting");
    setExportedCount(0);

    try {
      const exports = await createMarkdownExports();

      for (const item of exports) {
        downloadMarkdownFile(item.filename, item.content);
        setExportedCount((prev) => prev + 1);
        await tick();
      }

      setStatus("done");
    } catch (exportError) {
      console.error(exportError);
      setError("Unable to export your library right now.");
      setStatus("idle");
    }
  };

  const statusMessage = useMemo(() => {
    if (status === "exporting") {
      return `Exporting ${exportedCount} of ${articleCount} articles...`;
    }
    if (status === "done") {
      return `Exported ${exportedCount} articles to Markdown.`;
    }
    if (articleCount === 0) {
      return "Add articles before exporting your library.";
    }
    return `${articleCount} articles ready to export.`;
  }, [articleCount, exportedCount, status]);

  return (
    <section className="page">
      <h2 className="page__title">Export</h2>
      <p className="page__status" aria-live="polite">
        {statusMessage}
      </p>
      <div className="export-actions">
        <button
          type="button"
          className="export-actions__button"
          onClick={handleExport}
          disabled={!canExport}
        >
          {status === "exporting" ? "Exporting..." : "Export Markdown"}
        </button>
        <p className="export-actions__note">
          Files are downloaded individually as Markdown with YAML frontmatter.
        </p>
      </div>
      {error ? (
        <p className="page__status page__status--error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export default ExportPage;
