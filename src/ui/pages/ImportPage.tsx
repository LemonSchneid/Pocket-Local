import { type ChangeEvent, useMemo, useState } from "react";

import type { ParseStatus } from "../../db";
import { createArticle, updateArticle } from "../../db/articles";
import {
  completeImportJob,
  createImportJob,
  recordImportJobResult,
  updateImportJob,
} from "../../db/importJobs";
import { addTagsToArticle } from "../../db/tags";
import {
  fetchArticlesWithConcurrency,
  type FetchArticleResult,
} from "../../import/fetchArticleHtml";
import { cacheArticleAssets } from "../../import/cacheArticleAssets";
import { parseArticleHtml } from "../../import/parseArticleHtml";
import {
  parsePocketExport,
  type ParsedPocketItem,
} from "../../import/parsePocketExport";
import {
  getStoragePersistenceState,
  setStoragePersistenceState,
} from "../../db/settings";

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

type FetchDisplayResult = FetchArticleResult & { parseStatus?: ParseStatus };

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

const formatParseStatus = (status: ParseStatus): string => {
  if (status === "success") {
    return "Parsed";
  }

  if (status === "partial") {
    return "Partial parse (saved raw HTML)";
  }

  return "Parse failed";
};

function ImportPage() {
  const [validation, setValidation] = useState<ValidationState>({
    status: "idle",
  });
  const [previewItems, setPreviewItems] = useState<ParsedPocketItem[]>([]);
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [fetchPhase, setFetchPhase] = useState<FetchPhase>("idle");
  const [fetchResults, setFetchResults] = useState<
    Record<string, FetchDisplayResult>
  >({});

  const fetchSummary = useMemo(() => {
    return buildFetchSummary(fetchResults, previewItems.length);
  }, [fetchResults, previewItems.length]);

  const errorResults = useMemo(() => {
    return Object.values(fetchResults).filter(
      (result) => result.status !== "success",
    );
  }, [fetchResults]);

  const completedCount = fetchSummary.success + fetchSummary.failed;
  const progressValue = previewItems.length > 0 ? completedCount : 0;

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

    let successCount = 0;
    let failedCount = 0;

    if (importJobId) {
      await updateImportJob(importJobId, { status: "in_progress" });
    }

    const itemsByUrl = new Map(
      previewItems.map((item) => [item.url, item]),
    );

    await fetchArticlesWithConcurrency(
      previewItems.map((item) => item.url),
      {
        concurrency: 3,
        timeoutMs: 15000,
        onResult: async (result) => {
          const item = itemsByUrl.get(result.url);
          let parseStatus: ParseStatus | undefined;

          if (result.status === "success" && result.html && item) {
            successCount += 1;
            const parsed = parseArticleHtml(result.html);
            parseStatus = parsed.parse_status;
            const article = await createArticle({
              url: item.url,
              title: item.title,
              content_html: parsed.content_html,
              content_text: parsed.content_text,
              parse_status: parsed.parse_status,
            });
            const cachedAssets = await cacheArticleAssets({
              articleId: article.id,
              articleUrl: item.url,
              contentHtml: parsed.content_html,
            });
            if (cachedAssets.contentHtml !== parsed.content_html) {
              await updateArticle(article.id, {
                content_html: cachedAssets.contentHtml,
              });
            }
            await addTagsToArticle(article.id, item.tags);
            if (importJobId) {
              await recordImportJobResult(importJobId, "success");
            }
          } else {
            failedCount += 1;
            if (importJobId) {
              await recordImportJobResult(importJobId, "failed");
            }
          }

          setFetchResults((prev) => ({
            ...prev,
            [result.url]: { ...result, parseStatus },
          }));
        },
      },
    );

    setFetchPhase("complete");

    if (importJobId) {
      await completeImportJob(importJobId);
    }

    if (successCount > 0) {
      const persistenceState = await getStoragePersistenceState();
      if (persistenceState === "unknown") {
        if (navigator.storage?.persist) {
          const persisted = await navigator.storage.persist();
          await setStoragePersistenceState(persisted ? "granted" : "denied");
        } else {
          await setStoragePersistenceState("unsupported");
        }
      }
    }
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
              <div className="stack">
                <div className="import-progress">
                  <label htmlFor="import-progress" className="page__status">
                    Progress: {completedCount} / {fetchSummary.total}
                  </label>
                  <progress
                    id="import-progress"
                    value={progressValue}
                    max={fetchSummary.total}
                  />
                </div>
                <div className="import-counters">
                  <span>Imported: {fetchSummary.success}</span>
                  <span>Failures: {fetchSummary.failed}</span>
                </div>
              </div>
            )}
          </div>
          {fetchPhase !== "idle" && errorResults.length > 0 && (
            <div className="import-errors">
              <h4>Failures</h4>
              <ul>
                {errorResults.map((result) => (
                  <li key={result.url}>
                    <strong>{formatResultStatus(result)}</strong> — {result.url}
                    {result.error ? ` (${result.error})` : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
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
                  {result?.parseStatus && (
                    <div className="import-preview__meta">
                      {formatParseStatus(result.parseStatus)}
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
