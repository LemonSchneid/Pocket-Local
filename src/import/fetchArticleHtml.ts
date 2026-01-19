export type FetchArticleResult = {
  url: string;
  status: "success" | "timeout" | "error";
  html?: string;
  error?: string;
  durationMs: number;
};

type FetchArticleOptions = {
  timeoutMs?: number;
};

type FetchArticleBatchOptions = {
  concurrency?: number;
  timeoutMs?: number;
  onResult?: (result: FetchArticleResult) => void;
};

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_CONCURRENCY = 3;

const buildTimeoutError = (timeoutMs: number): Error => {
  return new Error(`Request exceeded ${timeoutMs / 1000}s timeout.`);
};

export const fetchArticleHtml = async (
  url: string,
  options: FetchArticleOptions = {},
): Promise<FetchArticleResult> => {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort(buildTimeoutError(timeoutMs));
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      signal: controller.signal,
    });
    const html = await response.text();

    if (!response.ok) {
      return {
        url,
        status: "error",
        html,
        error: `HTTP ${response.status}`,
        durationMs: performance.now() - startedAt,
      };
    }

    return {
      url,
      status: "success",
      html,
      durationMs: performance.now() - startedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.toLowerCase().includes("timeout")
      ? "timeout"
      : "error";

    return {
      url,
      status,
      error: message,
      durationMs: performance.now() - startedAt,
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const fetchArticlesWithConcurrency = async (
  urls: string[],
  options: FetchArticleBatchOptions = {},
): Promise<FetchArticleResult[]> => {
  const concurrency = Math.max(
    1,
    options.concurrency ?? DEFAULT_CONCURRENCY,
  );
  const results: FetchArticleResult[] = [];
  let nextIndex = 0;

  const runWorker = async () => {
    while (nextIndex < urls.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const url = urls[currentIndex];
      const result = await fetchArticleHtml(url, {
        timeoutMs: options.timeoutMs,
      });
      results[currentIndex] = result;
      options.onResult?.(result);
    }
  };

  const workers = Array.from({ length: concurrency }, () => runWorker());
  await Promise.all(workers);

  return results;
};
