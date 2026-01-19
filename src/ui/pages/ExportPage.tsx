import { useEffect, useMemo, useState } from "react";

import {
  createMarkdownExports,
  createMarkdownZip,
  downloadMarkdownFile,
  downloadZipFile,
} from "../../export/markdownExport";
import { listArticles } from "../../db/articles";

const tick = () => new Promise((resolve) => window.setTimeout(resolve, 0));

type ExportState = "idle" | "exporting" | "done";
type ExportMode = "files" | "zip" | null;

function ExportPage() {
  const [articleCount, setArticleCount] = useState<number>(0);
  const [exportedCount, setExportedCount] = useState(0);
  const [status, setStatus] = useState<ExportState>("idle");
  const [exportMode, setExportMode] = useState<ExportMode>(null);
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

  const handleFileExport = async () => {
    setError(null);
    setStatus("exporting");
    setExportedCount(0);
    setExportMode("files");

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
      setExportMode(null);
    }
  };

  const handleZipExport = async () => {
    setError(null);
    setStatus("exporting");
    setExportedCount(0);
    setExportMode("zip");

    try {
      const { filename, blob } = await createMarkdownZip((count) => {
        setExportedCount(count);
      });
      downloadZipFile(filename, blob);
      setStatus("done");
    } catch (exportError) {
      console.error(exportError);
      setError("Unable to export your library right now.");
      setStatus("idle");
      setExportMode(null);
    }
  };

  const statusMessage = useMemo(() => {
    if (status === "exporting") {
      const suffix = exportMode === "zip" ? "for ZIP export" : "as Markdown";
      return `Exporting ${exportedCount} of ${articleCount} articles ${suffix}...`;
    }
    if (status === "done") {
      return exportMode === "zip"
        ? `Exported ${exportedCount} articles to a ZIP file.`
        : `Exported ${exportedCount} articles to Markdown.`;
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
          onClick={handleZipExport}
          disabled={!canExport}
        >
          {status === "exporting" ? "Exporting..." : "Export ZIP"}
        </button>
        <button
          type="button"
          className="export-actions__button export-actions__button--secondary"
          onClick={handleFileExport}
          disabled={!canExport}
        >
          {status === "exporting" ? "Exporting..." : "Export Markdown Files"}
        </button>
        <p className="export-actions__note">
          Download everything in a single ZIP or as individual Markdown files.
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
