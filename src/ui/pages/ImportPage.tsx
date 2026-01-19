import { type ChangeEvent, useMemo, useState } from "react";

import { createImportJob } from "../../db/importJobs";
import {
  fetchArticlesWithConcurrency,
  type FetchArticleResult,
} from "../../import/fetchArticleHtml";
import {
  parsePocketExport,
  type ParsedPocketItem,
} from "../../import/parsePocketExport";

type ValidationState =
  | { status: "idle" }
  | { status: "valid"; filename: string; linkCount: number }
  | { status: "invalid"; message: string };

type FetchPhase = "idle" | "running" | "complete";

type FetchSummary = {
  total: number;
  success: number;
  failed: number;
};

const buildInvalidState = (message: string): ValidationState => ({
  status: "invalid",
  message,
});

const validatePocketExport = (
  file: File,
  items: ParsedPocketItem[],
): ValidationState => {
  if (file.name !== "ril_export.html") {
    return buildInvalidState(
      "Please select the original ril_export.html file from Pocket.",
    );
  }

  if (items.length === 0) {
    return buildInvalidState(
      "We could not find any saved links in this file. Make sure it is a valid Pocket export.",
    );
  }

  return {
    status: "valid",
    filename: file.name,
    linkCount: items.length,
  };
};

const buildFetchSummary = (
  results: Record<string, FetchArticleResult>,
  total: number,
): FetchSummary => {
  const values = Object.values(results);
  const success = values.filter((result) => result.status === "success").length;
  const failed = values.filter((result) => result.status !== "success").length;

  return {
    total,
    success,
    failed,
  };
};

const formatResultStatus = (result: FetchArticleResult): string => {
  if (result.status === "success") {
    return "Fetched";
  }

  if (result.status === "timeout") {
    return "Timed out";
  }

  return "Failed";
};

function ImportPage() {
  const [validation, setValidation] = useState<ValidationState>({
    status: "idle",
  });
  const [previewItems, setPreviewItems] = useState<ParsedPocketItem[]>([]);
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [fetchPhase, setFetchPhase] = useState<FetchPhase>("idle");
  const [fetchResults, setFetchResults] = useState<
    Record<string, FetchArticleResult>
  >({});

  const fetchSummary = useMemo(() => {
    return buildFetchSummary(fetchResults, previewItems.length);
  }, [fetchResults, previewItems.length]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setPreviewItems([]);
    setImportJobId(null);
    setFetchPhase("idle");
    setFetchResults({});

    if (!file) {
      setValidation({ status: "idle" });
      return;
    }

    if (!file.name.endsWith(".html")) {
      setValidation(
        buildInvalidState("Only HTML files are supported for Pocket exports."),
      );
      return;
    }

    try {
      const html = await file.text();
      const parsed = parsePocketExport(html);
      const nextValidation = validatePocketExport(file, parsed.items);

      if (nextValidation.status === "invalid") {
        setValidation(nextValidation);
        return;
      }

      const job = await createImportJob(parsed.items.length);
      setValidation(nextValidation);
      setPreviewItems(parsed.items);
      setImportJobId(job.id);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We could not read that file. Please try again.";
      setValidation(buildInvalidState(message));
    }
  };

  const handleFetchArticles = async () => {
    if (previewItems.length === 0) {
      return;
    }

    setFetchPhase("running");
    setFetchResults({});

    await fetchArticlesWithConcurrency(
      previewItems.map((item) => item.url),
      {
        concurrency: 3,
        timeoutMs: 15000,
        onResult: (result) => {
          setFetchResults((prev) => ({
            ...prev,
            [result.url]: result,
          }));
        },
      },
    );

    setFetchPhase("complete");
  };

  return (
    <section className="page">
      <h2>Import</h2>
      <p>Upload your Pocket export to begin importing.</p>
      <label className="stack" htmlFor="pocket-export">
        <span>Choose ril_export.html</span>
        <input
          id="pocket-export"
          type="file"
          accept=".html,text/html"
          onChange={handleFileChange}
        />
      </label>
      {validation.status === "valid" && (
        <p>
          ✅ {validation.filename} looks good. Found {validation.linkCount} saved
          items.
        </p>
      )}
      {validation.status === "invalid" && (
        <p role="alert">⚠️ {validation.message}</p>
      )}
      {validation.status === "valid" && previewItems.length > 0 && (
        <div className="stack">
          <div>
            <h3>Import preview</h3>
            {importJobId && (
              <p className="page__status">Import job created: {importJobId}</p>
            )}
            <button
              type="button"
              onClick={handleFetchArticles}
              disabled={fetchPhase === "running"}
            >
              {fetchPhase === "running" ? "Fetching articles…" : "Fetch articles"}
            </button>
            {fetchPhase !== "idle" && (
              <p className="page__status">
                Fetched {fetchSummary.success} / {fetchSummary.total} (Failures:
                {" "}
                {fetchSummary.failed})
              </p>
            )}
          </div>
          <ul className="import-preview">
            {previewItems.map((item) => {
              const result = fetchResults[item.url];
              return (
                <li key={item.url} className="import-preview__item">
                  <strong>{item.title}</strong>
                  <div className="import-preview__meta">{item.url}</div>
                  {item.tags.length > 0 && (
                    <div className="import-preview__tags">
                      Tags: {item.tags.join(", ")}
                    </div>
                  )}
                  {result && (
                    <div className="import-preview__meta">
                      {formatResultStatus(result)}
                      {result.error ? ` · ${result.error}` : null}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

export default ImportPage;
